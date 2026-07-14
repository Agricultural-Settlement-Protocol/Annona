"use client";

/**
 * Minimal client-side data hook over lib/api.ts. Client components (search,
 * filters, forms) fetch through this; server components `await` the fetchers
 * directly. No SWR/react-query for the MVP — add later for caching, not needed
 * to render the demo.
 */
import { useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
}

/**
 * Run an async fetcher on mount (and when `deps` change). Returns
 * `{ data, loading, error }`. Guards against setState-after-unmount.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fetcher()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: undefined });
      })
      .catch((err: unknown) => {
        if (alive) {
          setState({
            data: undefined,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
