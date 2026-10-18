import { create } from 'zustand';

export interface BundleCartItem {
	keyId: string;
	name: string;
	priceStroops: number;
	amount: number;
	thumbnail?: string;
	avatarUrl?: string;
	creatorAddress?: string;
	creatorShareSupply?: number;
}

interface BundleCartState {
	items: BundleCartItem[];
	isOpen: boolean;
	addItem: (
		item: Omit<BundleCartItem, 'amount'> & { amount?: number }
	) => void;
	removeItem: (keyId: string) => void;
	updateAmount: (keyId: string, amount: number) => void;
	clearCart: () => void;
	setIsOpen: (isOpen: boolean) => void;
	toggleOpen: () => void;
	isInCart: (keyId: string) => boolean;
}

const STORAGE_KEY = 'accesslayer_bundle_cart_v1';

function loadSessionItems(): BundleCartItem[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function saveSessionItems(items: BundleCartItem[]): void {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		// Ignore storage quota errors
	}
}

export const useBundleCartStore = create<BundleCartState>((set, get) => ({
	items: loadSessionItems(),
	isOpen: false,

	addItem: item => {
		const current = get().items;
		const existingIndex = current.findIndex(i => i.keyId === item.keyId);
		let next: BundleCartItem[];

		if (existingIndex >= 0) {
			const existing = current[existingIndex];
			const addedAmount = item.amount ?? 1;
			next = current.map((it, idx) =>
				idx === existingIndex
					? { ...it, amount: it.amount + addedAmount }
					: it
			);
		} else {
			next = [
				...current,
				{
					...item,
					amount: Math.max(1, item.amount ?? 1),
				},
			];
		}

		saveSessionItems(next);
		set({ items: next });
	},

	removeItem: keyId => {
		const next = get().items.filter(i => i.keyId !== keyId);
		saveSessionItems(next);
		set({ items: next });
	},

	updateAmount: (keyId, rawAmount) => {
		const clamped = Math.max(1, Math.round(isNaN(rawAmount) ? 1 : rawAmount));
		const next = get().items.map(item =>
			item.keyId === keyId ? { ...item, amount: clamped } : item
		);
		saveSessionItems(next);
		set({ items: next });
	},

	clearCart: () => {
		saveSessionItems([]);
		set({ items: [] });
	},

	setIsOpen: isOpen => set({ isOpen }),

	toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),

	isInCart: keyId => get().items.some(i => i.keyId === keyId),
}));

export function selectBundleTotalCostStroops(state: BundleCartState): number {
	return state.items.reduce(
		(sum, item) => sum + item.priceStroops * item.amount,
		0
	);
}

export function selectBundleItemCount(state: BundleCartState): number {
	return state.items.length;
}

export function selectEstimatedBundlePriceImpact(
	state: BundleCartState
): number {
	if (state.items.length === 0) return 0;
	let totalImpact = 0;
	for (const item of state.items) {
		const supply = item.creatorShareSupply ?? 100;
		const impact = (item.amount / Math.max(supply, 10)) * 1.5;
		totalImpact += impact;
	}
	return Math.round((totalImpact / state.items.length) * 100) / 100;
}
