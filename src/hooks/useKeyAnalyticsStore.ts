import { create } from 'zustand';
import { analyticsService, type KeyAnalyticsData } from '@/services/analytics.service';

export type CurrencyMode = 'XLM' | 'USD';

interface KeyAnalyticsState {
	data: KeyAnalyticsData | null;
	currency: CurrencyMode;
	isLoading: boolean;
	isRefreshing: boolean;
	error: string | null;
	_pollingIntervalId: number | null;

	// Actions
	setCurrency: (currency: CurrencyMode) => void;
	toggleCurrency: () => void;
	fetchAnalytics: (creatorId?: string, isBackground?: boolean) => Promise<void>;
	startPolling: (creatorId?: string) => void;
	stopPolling: () => void;
	reset: () => void;
}

const POLLING_INTERVAL_MS = 60_000; // 60 seconds (#966)

export const useKeyAnalyticsStore = create<KeyAnalyticsState>((set, get) => ({
	data: null,
	currency: 'XLM',
	isLoading: false,
	isRefreshing: false,
	error: null,
	_pollingIntervalId: null,

	setCurrency: (currency: CurrencyMode) => set({ currency }),

	toggleCurrency: () =>
		set(state => ({
			currency: state.currency === 'XLM' ? 'USD' : 'XLM',
		})),

	fetchAnalytics: async (creatorId?: string, isBackground = false) => {
		// Avoid layout shift: during background polling, keep existing data and set isRefreshing
		if (isBackground && get().data !== null) {
			set({ isRefreshing: true, error: null });
		} else {
			set({ isLoading: true, error: null });
		}

		try {
			const data = await analyticsService.getKeyAnalytics(creatorId);
			set({
				data,
				isLoading: false,
				isRefreshing: false,
				error: null,
			});
		} catch (err) {
			set({
				isLoading: false,
				isRefreshing: false,
				error: err instanceof Error ? err.message : 'Failed to load key analytics',
			});
		}
	},

	startPolling: (creatorId?: string) => {
		const currentInterval = get()._pollingIntervalId;
		if (currentInterval !== null) {
			window.clearInterval(currentInterval);
		}

		// Initial fetch immediately
		get().fetchAnalytics(creatorId, false);

		// Background polling every 60s
		const intervalId = window.setInterval(() => {
			get().fetchAnalytics(creatorId, true);
		}, POLLING_INTERVAL_MS);

		set({ _pollingIntervalId: intervalId as unknown as number });
	},

	stopPolling: () => {
		const currentInterval = get()._pollingIntervalId;
		if (currentInterval !== null) {
			window.clearInterval(currentInterval);
			set({ _pollingIntervalId: null });
		}
	},

	reset: () => {
		const currentInterval = get()._pollingIntervalId;
		if (currentInterval !== null) {
			window.clearInterval(currentInterval);
		}
		set({
			data: null,
			currency: 'XLM',
			isLoading: false,
			isRefreshing: false,
			error: null,
			_pollingIntervalId: null,
		});
	},
}));
