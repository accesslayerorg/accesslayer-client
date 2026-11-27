import { useCallback, useEffect, useMemo, useState } from 'react';

export interface ChartAnnotation {
  id: string;
  time: number;
  price: number;
  text: string;
  createdAt: number;
}

const STORAGE_PREFIX = 'chart-annotations:';

function storageKey(keyId: string): string {
  return `${STORAGE_PREFIX}${keyId}`;
}

function isValidAnnotation(value: unknown): value is ChartAnnotation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.time === 'number' &&
    Number.isFinite(candidate.time) &&
    typeof candidate.price === 'number' &&
    Number.isFinite(candidate.price) &&
    typeof candidate.text === 'string' &&
    typeof candidate.createdAt === 'number'
  );
}

function loadAnnotations(keyId: string): ChartAnnotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(keyId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidAnnotation);
  } catch {
    return [];
  }
}

function saveAnnotations(keyId: string, annotations: ChartAnnotation[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(keyId), JSON.stringify(annotations));
  } catch {
    // Storage may be unavailable (private mode, quota exceeded); ignore.
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface UseChartAnnotationsResult {
  annotations: ChartAnnotation[];
  /** Whether the current user is allowed to create/modify annotations. */
  canAnnotate: boolean;
  /** Human-readable explanation shown when annotations are disabled. */
  disabledReason: string | null;
  addAnnotation: (time: number, price: number, text: string) => ChartAnnotation | null;
  updateAnnotation: (id: string, text: string) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
}

export function useChartAnnotations(
  keyId: string,
  address: string | null | undefined,
): UseChartAnnotationsResult {
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>(() =>
    loadAnnotations(keyId),
  );

  // Reload annotations whenever the key changes.
  useEffect(() => {
    setAnnotations(loadAnnotations(keyId));
  }, [keyId]);

  const canAnnotate = Boolean(address);

  const disabledReason = useMemo(
    () =>
      canAnnotate
        ? null
        : 'Sign in to add annotations. Annotations are saved locally per key and require an account.',
    [canAnnotate],
  );

  const persist = useCallback(
    (next: ChartAnnotation[]) => {
      setAnnotations(next);
      saveAnnotations(keyId, next);
    },
    [keyId],
  );

  const addAnnotation = useCallback(
    (time: number, price: number, text: string): ChartAnnotation | null => {
      if (!canAnnotate) return null;
      const trimmed = text.trim();
      if (!trimmed) return null;
      if (!Number.isFinite(time) || !Number.isFinite(price)) return null;
      const annotation: ChartAnnotation = {
        id: generateId(),
        time,
        price,
        text: trimmed,
        createdAt: Date.now(),
      };
      persist([...annotations, annotation]);
      return annotation;
    },
    [annotations, canAnnotate, persist],
  );

  const updateAnnotation = useCallback(
    (id: string, text: string) => {
      if (!canAnnotate) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      persist(
        annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, text: trimmed } : annotation,
        ),
      );
    },
    [annotations, canAnnotate, persist],
  );

  const removeAnnotation = useCallback(
    (id: string) => {
      if (!canAnnotate) return;
      persist(annotations.filter((annotation) => annotation.id !== id));
    },
    [annotations, canAnnotate, persist],
  );

  const clearAnnotations = useCallback(() => {
    if (!canAnnotate) return;
    persist([]);
  }, [canAnnotate, persist]);

  return {
    annotations,
    canAnnotate,
    disabledReason,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
  };
}

export default useChartAnnotations;