import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  actor: string;
  action: string;
  from: string;
  to: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: string | null;
}

export interface AuditLogFilterOverrides {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface UseAuditLogResult {
  filters: AuditLogFilters;
  setFilter: (key: keyof AuditLogFilters, value: string) => void;
  clearFilters: () => void;
  query: UseInfiniteQueryResult<InfiniteData<AuditLogPage>, Error>;
  entries: AuditLogEntry[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<unknown>;
}

const SECRET_KEY_PATTERN =
  /(secret|password|passwd|token|api[-_]?key|apikey|authorization|auth|credential|private[-_]?key|access[-_]?key|refresh[-_]?token|session|cookie|signature|salt|hash)/i;

const REDACTED = '[REDACTED]';

const FILTER_KEYS: Array<keyof AuditLogFilters> = ['actor', 'action', 'from', 'to'];

const EMPTY_FILTERS: AuditLogFilters = {
  actor: '',
  action: '',
  from: '',
  to: '',
};

/**
 * Recursively masks secret-looking fields in a payload so they are never
 * rendered in the audit log viewer.
 */
export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactValue(nested);
      }
    }
    return result;
  }

  return value;
}

/**
 * Redacts secrets on an audit log entry's before/after/payload objects.
 */
export function redactEntry(entry: AuditLogEntry): AuditLogEntry {
  return {
    ...entry,
    before: entry.before ? redactSecrets(entry.before) : entry.before,
    after: entry.after ? redactSecrets(entry.after) : entry.after,
    payload: entry.payload ? redactSecrets(entry.payload) : entry.payload,
  };
}

function buildQueryString(filters: AuditLogFilters, cursor: string | null): string {
  const params = new URLSearchParams();
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.action) params.set('action', filters.action);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

async function fetchAuditLogPage(
  filters: AuditLogFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<AuditLogPage> {
  const query = buildQueryString(filters, cursor);
  const response = await fetch(`/api/admin/audit${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load audit log (${response.status})`);
  }

  const data = (await response.json()) as AuditLogPage;
  return {
    entries: (data.entries ?? []).map(redactEntry),
    nextCursor: data.nextCursor ?? null,
  };
}

export function useAuditLog(
  overrides?: AuditLogFilterOverrides,
): UseAuditLogResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<AuditLogFilters>(() => {
    const next: AuditLogFilters = { ...EMPTY_FILTERS };
    for (const key of FILTER_KEYS) {
      next[key] = overrides?.[key] ?? searchParams.get(key) ?? '';
    }
    return next;
  }, [searchParams, overrides]);

  const setFilter = useCallback(
    (key: keyof AuditLogFilters, value: string) => {
      setSearchParams(
        (prev: URLSearchParams) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);
        for (const key of FILTER_KEYS) {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const query = useInfiniteQuery<AuditLogPage, Error>({
    queryKey: ['admin', 'audit-log', filters],
    queryFn: ({ pageParam, signal }) =>
      fetchAuditLogPage(filters, (pageParam as string | null) ?? null, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const entries = useMemo<AuditLogEntry[]>(
    () => query.data?.pages.flatMap((page) => page.entries) ?? [],
    [query.data],
  );

  const fetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    filters,
    setFilter,
    clearFilters,
    query,
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loading: query.isLoading,
    error: query.error,
    hasMore: Boolean(query.hasNextPage),
    loadMore: fetchNextPage,
    refetch: query.refetch,
  };
}

export default useAuditLog;