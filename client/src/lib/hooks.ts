import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';
import { ApiError } from './api';

/** Tiny data-fetching hook: `const { data, error, loading, reload, setData } = useFetch(() => api.get(...), [deps])`. */
export function useFetch<T>(fetcher: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetcher();
      if (id === seq.current) setData(r);
    } catch (e) {
      if (id === seq.current) setError(e instanceof ApiError ? e.message : (e as Error).message || 'Something went wrong');
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}

/** Debounce a changing value. */
export function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Persisted <html> class toggles for the accessibility menu. */
export function useDisplayPrefs() {
  const read = (k: string) => {
    try {
      return localStorage.getItem(k) === '1';
    } catch {
      return false;
    }
  };
  const [highContrast, setHC] = useState(() => read('findry.hc'));
  const [largeText, setLT] = useState(() => read('findry.lgtext'));
  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast);
    try {
      localStorage.setItem('findry.hc', highContrast ? '1' : '0');
    } catch {}
  }, [highContrast]);
  useEffect(() => {
    document.documentElement.classList.toggle('lg-text', largeText);
    try {
      localStorage.setItem('findry.lgtext', largeText ? '1' : '0');
    } catch {}
  }, [largeText]);
  return { highContrast, setHighContrast: setHC, largeText, setLargeText: setLT };
}

/** Simple toast queue. */
export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}
let toastListeners: Array<(t: Toast) => void> = [];
let toastSeq = 0;
export const toast = {
  show: (text: string, kind: Toast['kind'] = 'info') => toastListeners.forEach((l) => l({ id: ++toastSeq, kind, text })),
  success: (text: string) => toast.show(text, 'success'),
  error: (text: string) => toast.show(text, 'error'),
  subscribe: (l: (t: Toast) => void) => {
    toastListeners.push(l);
    return () => {
      toastListeners = toastListeners.filter((x) => x !== l);
    };
  },
};
