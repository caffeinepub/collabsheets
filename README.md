# CollabSheets

A lightweight, real-time collaborative spreadsheet application. Multiple users can edit the same document simultaneously and see each other's changes and presence in real time.

**Live demo:** _(see deployed URL)_

---

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript (strict), Tailwind CSS, TanStack Router |
| Backend | Motoko (ICP canister) |
| State sync | Firestore-style polling via ICP canister `onSnapshot` equivalent |
| Auth | Guest name + color picker, or "Sign in with Google" name dialog |
| Deploy | Caffeine (ICP) |

### Folder Structure

```
src/
├── frontend/src/
│   ├── pages/
│   │   ├── AuthPage.tsx          # Identity: guest or Google flow
│   │   ├── DashboardPage.tsx     # Document list: create/open/delete
│   │   └── SheetPage.tsx         # Editor orchestrator, all state lives here
│   ├── components/spreadsheet/
│   │   ├── Grid.tsx              # Table render + column resize handles
│   │   ├── Cell.tsx              # Individual cell: display, edit, keyboard nav
│   │   ├── FormulaBar.tsx        # fx bar with cell address indicator
│   │   ├── FormattingToolbar.tsx # Bold/italic/text color per cell
│   │   ├── PresenceBar.tsx       # Colored avatar stack for active users
│   │   └── SyncStatus.tsx        # Saving / Saved / Offline indicator
│   ├── context/
│   │   └── UserContext.tsx       # User identity (name, color) in localStorage
│   ├── hooks/
│   │   └── useActor.ts           # ICP actor (backend client) hook
│   └── utils/
│       ├── formula.ts            # Recursive descent formula parser + evaluator
│       ├── csv.ts                # CSV generation and download
│       ├── docTimestamps.ts      # Local lastModified override store
│       └── colors.ts             # User color palette + random picker
└── backend/
    └── main.mo                   # Motoko canister: documents, cells, presence, profiles
```

### Server / Client Boundary

All data persistence lives in the Motoko canister. The frontend is a pure client — no server-side rendering, no API routes. This is intentional: the canister IS the server, accessed via the ICP actor pattern.

**State ownership:**
- `UserContext` owns identity (persisted in `localStorage`)
- `SheetPage` owns all spreadsheet state: `cellMap`, `formatMap`, `selectedCell`, `editingCell`, `syncState`, `presence`
- `Grid` and `Cell` are pure render components — they receive state and emit events upward

---

## Data Model

### Documents collection

```
documents: Map<docId, Document>

Document {
  id: string          // title + timestamp, deterministic
  title: string
  author: Principal   // ICP principal of creator
  authorName: string  // display name at time of creation
  lastModified: Int   // nanoseconds since epoch, updated on every cell write
}
```

### Cells collection

```
cells: Map<docId, Map<cellKey, Cell>>

Cell {
  row: Nat
  col: Nat
  value: string       // raw value for non-formula cells
  formula: string     // raw formula string (e.g. "=SUM(A1:A5)") for formula cells
  editedBy: string    // display name of last editor
  timestamp: Int      // nanoseconds since epoch
}

cellKey = "${row},${col}"   // e.g. "0,0" = A1
```

### Presence collection

```
presences: Map<docId, Map<sessionId, Presence>>

Presence {
  userName: string
  color: string       // hex color chosen at login
  lastActive: Int     // nanoseconds, updated by heartbeat
}

sessionId = "${principal}-${timestamp}"
```

Active presence = `lastActive` within last 60 seconds. Stale sessions are filtered at query time, not cleaned up proactively.

---

## Formula Parsing Approach

The formula engine (`src/utils/formula.ts`) is a **zero-dependency recursive descent parser** implemented entirely in TypeScript.

### Grammar

```
expr   → term   (('+' | '-') term)*
term   → factor (('*' | '/') factor)*
factor → NUMBER | CELL_REF | FUNCTION '(' args ')' | '(' expr ')' | '-' factor
```

### Pipeline

```
raw string "=SUM(A1:A5)+B1*2"
     │
     ▼ tokenize()
[ident:SUM, paren:(, ident:A1, colon, ident:A5, paren:), op:+, ident:B1, op:*, number:2]
     │
     ▼ Parser.parse()
     result: number
     │
     ▼ String(result)  →  displayed in cell
```

### Cycle Detection

Every `evaluateFormula` call receives a `visiting: Set<string>` of cell keys currently being evaluated. Before recursing into a referenced cell, the key is checked against `visiting`. A hit returns `#CYCLE!` immediately, unwinding the stack. This is O(depth) memory, not O(all cells).

### Supported Operations

| Syntax | Example | Result |
|--------|---------|--------|
| Arithmetic | `=A1+B1*2` | respects precedence |
| Cell reference | `=A1` | value of A1 |
| Range | `=SUM(A1:A5)` | sum of range |
| Functions | `SUM`, `AVERAGE`, `MAX`, `MIN`, `COUNT` | as expected |

### Why not a full Excel parser?

A full parser (supporting `IF`, `VLOOKUP`, string ops, date arithmetic) would be significant scope and is not required by the assignment. The recursive descent approach is easy to extend: adding a new function is 2 lines in the `switch` statement.

---

## Real-Time Sync Strategy

### Mechanism

The ICP canister does not support WebSockets. Sync is implemented via **optimistic update + polling**:

1. **Optimistic write**: cell change is applied to local `cellMap` immediately (0ms latency for the writer)
2. **Async persist**: `actor.updateCell(...)` is called; on success `syncState → "saved"`, on failure `→ "offline"`
3. **Poll loop**: `getCells` runs every 3 seconds, merging remote state into local `cellMap`
4. **Presence poll**: `getPresence` runs every 3 seconds

### Write Serialization

A `writingRef` boolean prevents concurrent writes to the same document. If a second write arrives while one is in flight, it is queued in `pendingWriteRef` and flushed immediately after the first completes. This ensures ordered delivery without a full queue.

### Conflict Resolution

**Last-write-wins at cell granularity.** Each cell has an independent timestamp. If two users edit different cells simultaneously, both writes succeed and both are reflected. If two users edit the _same_ cell simultaneously, whichever `updateCell` call lands last in the canister wins; the other user's optimistic state will be corrected on the next 3-second poll.

This is the correct tradeoff for a spreadsheet: cells are atomic units, and Google Sheets itself uses last-write-wins at the cell level for concurrent edits.

### Write State Indicator

The `SyncStatus` component shows three states:
- **Saved** (green) — last write confirmed
- **Saving...** (amber, pulsing) — write in flight
- **Offline** (red) — last write failed (network/canister error)

---

## Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Polling instead of WebSockets | ICP canister limitations; 3s polling gives acceptable UX for a demo |
| Last-write-wins | Simple, correct for independent cell edits; full CRDT would be over-engineered for this scope |
| Local `colWidths` state (not persisted) | Column widths are session-local; persisting them would require a new backend schema |
| Formula evaluation on client only | Avoids round-trip latency; formula result is derived from cell data, not stored |
| `formula` and `value` stored separately | Allows re-evaluation when dependencies change without re-parsing; formula is the source of truth |
| Guest-only auth (no real Google OAuth) | Platform constraint; identity is display-name + color, sufficient for presence and `editedBy` attribution |

---

## Bonus Features

- **Cell formatting**: bold, italic, 7-color text palette per cell (session-local, not persisted)
- **Column resize**: drag the right edge of any column header to resize; minimum 40px
- **Keyboard navigation**: Arrow keys, Tab/Shift+Tab (commit + move), Enter (commit + move down), Escape (cancel), F2 (enter edit mode), typing to start edit immediately
- **CSV export**: trims trailing empty rows, properly escapes quoted values, downloads as `<title>.csv`

---

## Future Improvements

- Persist `formatMap` and `colWidths` to the backend
- Add row resize (symmetric to column resize)
- Add `IF`, `VLOOKUP`, `CONCATENATE` functions to the formula engine
- Replace polling with ICP's forthcoming WebSocket support for sub-second sync
- Add cell selection range (click + drag or Shift+arrow) for multi-cell formatting and SUM shortcuts
- Add undo/redo stack (command pattern, local only)
- Add document sharing with view-only permissions
- Column/row reorder via drag-and-drop
