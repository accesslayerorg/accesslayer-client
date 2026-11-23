import { useCallback, useEffect, useState } from 'react';

export const SAVED_QUERIES_STORAGE_KEY = 'accesslayer.graphql.savedQueries';

export interface SavedQuery {
	id: string;
	name: string;
	query: string;
	variables: string;
	updatedAt: string;
}

function readStorage(): SavedQuery[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(SAVED_QUERIES_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is SavedQuery =>
				typeof item === 'object' &&
				item !== null &&
				typeof (item as SavedQuery).id === 'string' &&
				typeof (item as SavedQuery).name === 'string' &&
				typeof (item as SavedQuery).query === 'string' &&
				typeof (item as SavedQuery).variables === 'string' &&
				typeof (item as SavedQuery).updatedAt === 'string'
		);
	} catch {
		return [];
	}
}

function writeStorage(queries: SavedQuery[]): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			SAVED_QUERIES_STORAGE_KEY,
			JSON.stringify(queries)
		);
	} catch {
		// Storage may be full or disabled; the in-memory state still applies.
	}
}

function createId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Named GraphQL queries persisted in localStorage for the developer explorer.
 * Only query text and variables are stored; API keys are never saved here.
 */
export function useSavedQueries() {
	const [queries, setQueries] = useState<SavedQuery[]>(() => readStorage());

	useEffect(() => {
		writeStorage(queries);
	}, [queries]);

	const saveQuery = useCallback(
		(input: { name: string; query: string; variables: string }) => {
			const saved: SavedQuery = {
				id: createId(),
				name: input.name.trim() || 'Untitled query',
				query: input.query,
				variables: input.variables,
				updatedAt: new Date().toISOString(),
			};
			setQueries(previous => [saved, ...previous]);
			return saved;
		},
		[]
	);

	const renameQuery = useCallback((id: string, name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		setQueries(previous =>
			previous.map(item =>
				item.id === id
					? { ...item, name: trimmed, updatedAt: new Date().toISOString() }
					: item
			)
		);
	}, []);

	const deleteQuery = useCallback((id: string) => {
		setQueries(previous => previous.filter(item => item.id !== id));
	}, []);

	return { queries, saveQuery, renameQuery, deleteQuery };
}
