type Listener = () => void

const listeners = new Map<string, Set<Listener>>()

/** Subscribe to changes on a table. Returns an unsubscribe function. */
export function subscribe(table: string, listener: Listener): () => void {
  let set = listeners.get(table)
  if (!set) {
    set = new Set()
    listeners.set(table, set)
  }
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

/** Called by the data layer after writes so hooks re-query. */
export function notify(...tables: string[]): void {
  for (const table of tables) {
    listeners.get(table)?.forEach((l) => l())
  }
}
