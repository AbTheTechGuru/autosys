import { useState } from 'react';

/**
 * useState backed by localStorage.
 *
 * @example
 * const [view, setView] = useLocalStorage('inv-view', 'grid');
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.warn(`useLocalStorage: failed to set "${key}"`, err);
    }
  };

  return [storedValue, setValue];
}
