type Listener<T> = (value: T) => void;

export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set: (value: T) => { state = value; listeners.forEach(l => l(state)); },
    subscribe: (listener: Listener<T>) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
