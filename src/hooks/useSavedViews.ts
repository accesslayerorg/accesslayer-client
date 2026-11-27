import { useCallback, useEffect, useState } from 'react';
import type { DiscoveryFilters } from '@/utils/advancedSearch.utils';

export interface SavedDiscoveryView {
	id: string;
	name: string;
	filters: DiscoveryFilters;
	createdAt: string;
}

const STORAGE_KEY = 'accesslayer:discovery-saved-views';

function loadViews(): SavedDiscoveryView[] {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as SavedDiscoveryView[]) : [];
	} catch {
		return [];
	}
}

function createId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `view-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSavedViews() {
	const [views, setViews] = useState<SavedDiscoveryView[]>(loadViews);

	useEffect(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
		} catch {
			return;
		}
	}, [views]);

	const saveView = useCallback((input: { name: string; filters: DiscoveryFilters }) => {
		const view: SavedDiscoveryView = {
			id: createId(),
			name: input.name,
			filters: input.filters,
			createdAt: new Date().toISOString(),
		};
		setViews((previous) => [...previous, view]);
		return view;
	}, []);

	const renameView = useCallback((id: string, name: string) => {
		setViews((previous) =>
			previous.map((view) => (view.id === id ? { ...view, name } : view)),
		);
	}, []);

	const deleteView = useCallback((id: string) => {
		setViews((previous) => previous.filter((view) => view.id !== id));
	}, []);

	return { views, saveView, renameView, deleteView };
}
