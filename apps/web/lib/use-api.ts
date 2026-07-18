"use client";

/**
 * Minimal client-side data hook over lib/api.ts. Client components (search,
 * filters, forms) fetch through this; server components `await` the fetchers
 * directly. No SWR/react-query for the MVP — add later for caching, not needed
 * to render the demo.
 */
import { useCallback, useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  /** Re-run the fetcher (e.g. after a write, so the page reflects the DB). */
  refetch: () => void;
}

/**
 * Run an async fetcher on mount (and when `deps` change). Returns
 * `{ data, loading, error, refetch }`. Guards against setState-after-unmount.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): ApiState<T> {
  const [version, setVersion] = useState(0);
  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  const [state, setState] = useState<Omit<ApiState<T>, "refetch">>({
    data: undefined,
    loading: true,
    error: undefined,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: `fetcher` is intentionally excluded (callers pass inline closures; `deps` is the identity) and `version` is the refetch trigger.
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
  }, [...deps, version]);

  return { ...state, refetch };
}
