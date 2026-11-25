export const CROSS_TAB_CHANNEL_NAME = 'accesslayer:session-sync';
export const CROSS_TAB_STORAGE_KEY = 'accesslayer:session-sync-event';
export const CROSS_TAB_DEBOUNCE_MS = 150;

export type CrossTabEventType =
	| 'connect'
	| 'disconnect'
	| 'account_change'
	| 'network_change';

export interface CrossTabWalletState {
	address?: string | null;
	isConnected: boolean;
	chainId?: number | null;
}

export interface CrossTabMessage {
	id: string;
	tabId: string;
	type: CrossTabEventType;
	address: string | null;
	chainId: number | null;
	timestamp: number;
}

export function normalizeAddress(address?: string | null): string | null {
	return address ? address.toLowerCase().trim() : null;
}

export function getTabId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getWalletEvent(
	previous: CrossTabWalletState,
	current: CrossTabWalletState
): CrossTabEventType | null {
	if (previous.isConnected && !current.isConnected) return 'disconnect';
	if (!previous.isConnected && current.isConnected) return 'connect';
	if (
		current.isConnected &&
		normalizeAddress(previous.address) !== normalizeAddress(current.address)
	) {
		return 'account_change';
	}
	if (
		current.isConnected &&
		previous.chainId != null &&
		current.chainId != null &&
		previous.chainId !== current.chainId
	) {
		return 'network_change';
	}
	return null;
}

export function isCrossTabMessage(value: unknown): value is CrossTabMessage {
	if (!value || typeof value !== 'object') return false;
	const message = value as Partial<CrossTabMessage>;
	return (
		typeof message.id === 'string' &&
		typeof message.tabId === 'string' &&
		typeof message.type === 'string' &&
		typeof message.timestamp === 'number'
	);
}

export function parseCrossTabMessage(raw: string | null): CrossTabMessage | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return isCrossTabMessage(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

const SENSITIVE_PATH_PREFIXES = [
	'/profile',
	'/portfolio',
	'/settings',
	'/transactions',
	'/rentals/mine',
	'/creator/',
	'/governance/create',
	'/governance/new',
	'/swap/create',
	'/referrals',
	'/admin/',
];

export function isSensitivePath(pathname: string): boolean {
	return SENSITIVE_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function isBackgroundTab(): boolean {
	return (
		typeof document !== 'undefined' &&
		document.visibilityState !== 'visible'
	);
}
