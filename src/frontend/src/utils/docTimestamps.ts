/**
 * Local lastModified override store.
 *
 * Since the backend's updateCell does not update the document's lastModified
 * timestamp, we track edit times locally in localStorage and use them to
 * augment the dashboard display.
 */

const STORAGE_KEY = "collab_doc_timestamps";

type TimestampMap = Record<string, number>; // docId -> unix ms

function readStore(): TimestampMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TimestampMap;
  } catch {
    // ignore
  }
  return {};
}

function writeStore(map: TimestampMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Record that a document was just edited locally. */
export function touchDocumentTimestamp(docId: string): void {
  const map = readStore();
  map[docId] = Date.now();
  writeStore(map);
}

/**
 * Return the most recent modification time for a document.
 * Prefers the local override (more accurate) over the backend value.
 *
 * @param docId
 * @param backendTimestampMs  The backend lastModified in milliseconds (Number(bigint) / 1_000_000)
 */
export function getDocumentLastModifiedMs(
  docId: string,
  backendTimestampMs: number,
): number {
  const map = readStore();
  const local = map[docId] ?? 0;
  return Math.max(local, backendTimestampMs);
}
