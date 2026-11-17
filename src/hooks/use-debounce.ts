import { useState, useEffect } from "react";

/**
 * A custom hook that delays updating the debounced value until after
 * the specified delay has elapsed since the last time the value changed.
 *
 * @param value The value to debounce (e.g., search term or filter value)
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
