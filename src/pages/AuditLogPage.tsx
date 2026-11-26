/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuditLog } from '../hooks/useAuditLog';
import { useAdminRole } from '../hooks/useAdminRole';

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

const SECRET_KEY_PATTERN = /(secret|password|token|apikey|api_key|private|credential|authorization|auth)/i;
const REDACTED = '[REDACTED]';

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSecrets(val);
      }
    }
    return result;
  }
  return value;
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(redactSecrets(value ?? null), null, 2);
  } catch {
    return String(value);
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString();
}

function toCsvValue(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

const CSV_ROW_LIMIT = 5000;

export default function AuditLogPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const { isAdminWallet, loading: roleLoading } = useAdminRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const actor = searchParams.get('actor') ?? '';
  const action = searchParams.get('action') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdminWallet) {
      navigate('/dashboard', { replace: true });
    }
  }, [roleLoading, isAdminWallet, navigate]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const filters = useMemo(
    () => ({
      actor: actor || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [actor, action, from, to],
  );

  const { entries, loading, error, hasMore, loadMore, refetch } = useAuditLog(filters);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const copyEntryId = useCallback(async (id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      }
      setCopiedId(id);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard failures silently.
    }
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const rows = entries.slice(0, CSV_ROW_LIMIT);
      const header = ['id', 'actor', 'action', 'target', 'timestamp', 'before', 'after'];
      const lines = [header.map(toCsvValue).join(',')];
      for (const entry of rows) {
        lines.push(
          [
            toCsvValue(entry.id),
            toCsvValue(entry.actor),
            toCsvValue(entry.action),
            toCsvValue(entry.target),
            toCsvValue(entry.timestamp),
            toCsvValue(redactSecrets(entry.before ?? null)),
            toCsvValue(redactSecrets(entry.after ?? null)),
          ].join(','),
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [entries]);

  if (roleLoading) {
    return (
      <div className="audit-log-page" data-testid="audit-log-role-loading">
        <AuditLogSkeleton />
      </div>
    );
  }

  if (!isAdminWallet) {
    return null;
  }

  const hasActiveFilters = Boolean(actor || action || from || to);

  return (
    <div className="audit-log-page">
      <header className="audit-log-header">
        <h1>Audit Log</h1>
        <button
          type="button"
          className="audit-log-export"
          onClick={handleExport}
          disabled={exporting || entries.length === 0}
          data-testid="audit-log-export"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </header>

      <section className="audit-log-filters" aria-label="Audit log filters">
        <label>
          Actor
          <input
            type="text"
            value={actor}
            placeholder="Filter by actor"
            onChange={(e) => updateFilter('actor', e.target.value)}
            data-testid="audit-log-filter-actor"
          />
        </label>
        <label>
          Action
          <input
            type="text"
            value={action}
            placeholder="Filter by action"
            onChange={(e) => updateFilter('action', e.target.value)}
            data-testid="audit-log-filter-action"
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => updateFilter('from', e.target.value)}
            data-testid="audit-log-filter-from"
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => updateFilter('to', e.target.value)}
            data-testid="audit-log-filter-to"
          />
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} data-testid="audit-log-clear-filters">
            Clear filters
          </button>
        )}
      </section>

      {error && (
        <div className="audit-log-error" role="alert">
          Failed to load audit log.{' '}
          <button type="button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <AuditLogSkeleton />
      ) : entries.length === 0 ? (
        <div className="audit-log-empty" data-testid="audit-log-empty">
          <p>No audit log entries match your filters.</p>
        </div>
      ) : (
        <table className="audit-log-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Target</th>
              <th scope="col">ID</th>
              <th scope="col" aria-label="Expand" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isExpanded = Boolean(expanded[entry.id]);
              return (
                <React.Fragment key={entry.id}>
                  <tr data-testid={`audit-log-row-${entry.id}`}>
                    <td>{formatTime(entry.timestamp)}</td>
                    <td>{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target}</td>
                    <td>
                      <button
                        type="button"
                        className="audit-log-copy-id"
                        onClick={() => copyEntryId(entry.id)}
                        title="Copy entry ID"
                        data-testid={`audit-log-copy-${entry.id}`}
                      >
                        {copiedId === entry.id ? 'Copied' : 'Copy ID'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(entry.id)}
                        data-testid={`audit-log-expand-${entry.id}`}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="audit-log-diff-row">
                      <td colSpan={6}>
                        <div className="audit-log-diff">
                          <div className="audit-log-diff-before">
                            <h4>Before</h4>
                            <pre>{formatJson(entry.before ?? null)}</pre>
                          </div>
                          <div className="audit-log-diff-after">
                            <h4>After</h4>
                            <pre>{formatJson(entry.after ?? null)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      {hasMore && (
        <div className="audit-log-load-more">
          <button type="button" onClick={loadMore} disabled={loading} data-testid="audit-log-load-more">
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

function AuditLogSkeleton(): React.JSX.Element {
  return (
    <div className="audit-log-skeleton" data-testid="audit-log-skeleton" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="audit-log-skeleton-row" />
      ))}
    </div>
  );
}