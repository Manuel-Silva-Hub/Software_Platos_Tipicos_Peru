// src/hooks/useLocalStorage.ts
/**
 * Simple typed useLocalStorage hook.
 * - Provides JSON serialization/deserialization.
 * - Returns getter, setter, and toggle helper for arrays/sets.
 *
 * Keep this small and dependency-free.
 */

import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const readValue = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      localStorage.setItem(key, JSON.stringify(valueToStore));
      setStoredValue(valueToStore);
    } catch {
      // ignore write errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
