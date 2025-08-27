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
  // Function that reads the value from localStorage
  const readValue = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      // If there is an error, return the initial value
      return initialValue;
    }
  };

  // State that keeps the value synchronized in React
  const [storedValue, setStoredValue] = useState<T>(readValue);

  //Function to update the value in the state and in localStorage.
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

  // We return the value and the setter, just like useState
  return [storedValue, setValue] as const;
}
