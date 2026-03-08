# CollabSheets

## Current State
Empty Caffeine template with no App.tsx, no backend logic, and no backend.d.ts. The project has never been built.

## Requested Changes (Diff)

### Add
- Full collaborative spreadsheet application built on Motoko + React
- Document dashboard: list, create, open, delete spreadsheet documents (title, author, last modified)
- Spreadsheet editor: 100 rows x 26 columns (A-Z), editable cells stored in backend
- Cell data model: value, formula, lastEditedBy, timestamp
- Formula engine: arithmetic (+, -, *, /), cell references (A1, B5), SUM(A1:A5), cycle detection
- Real-time sync: all clients see updates as cells change (polling via backend)
- User presence: show active users in a document with name and color avatar
- Authentication: guest mode (enter display name) with color assignment and session ID
- Cell formatting: bold, italic, text color
- Keyboard navigation: arrow keys, Tab, Enter, Escape
- CSV export
- Sync status indicator: Saving / Saved / Offline

### Modify
- Nothing (new project)

### Remove
- Nothing

## Implementation Plan
1. Select authorization component for user sessions
2. Generate Motoko backend with:
   - Document CRUD (create, list, get, delete)
   - Cell read/write per document
   - Presence tracking (join, leave, heartbeat, list active users)
3. Build React frontend:
   - AuthContext: guest login with name + color
   - Dashboard page: document list, create, delete
   - Spreadsheet editor page: grid, formula bar, presence bar, sync status
   - Formula engine utility (pure TS)
   - Cell formatting toolbar
   - Keyboard navigation handler
   - CSV export utility
