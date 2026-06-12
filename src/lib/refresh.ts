import { useEffect } from 'react';

/** Tiny pub/sub so screens refetch after mutations (add, save, delete, follow). */

type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyDataChanged(): void {
  for (const listener of listeners) listener();
}

export function useDataChanged(onChange: Listener): void {
  useEffect(() => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [onChange]);
}
