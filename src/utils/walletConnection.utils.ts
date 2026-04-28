/**
 * Wallet connection utilities for handling stale sessions and reconnection
 */

export interface WalletConnectionState {
	isConnected: boolean;
	isStale: boolean;
	address?: string;
	walletName?: string;
	lastConnected?: number;
}

export interface WalletReconnectOptions {
	/** Custom wallet name for display. If not provided, will use from state. */
	walletName?: string;
	/** Custom reconnect action text. Defaults to 'Reconnect'. */
	reconnectText?: string;
	/** Whether to show detailed explanation. Defaults to true. */
	showDetails?: boolean;
}

/**
 * Determines if wallet session is stale based on connection time
 * 
 * @param lastConnected - Timestamp of last connection
 * @param staleThresholdMs - Time in ms before considering session stale (default: 1 hour)
 * @returns Whether the session is stale
 */
export function isSessionStale(
	lastConnected: number | undefined,
	staleThresholdMs: number = 60 * 60 * 1000 // 1 hour
): boolean {
	if (!lastConnected) return true;
	
	const now = Date.now();
	const timeSinceConnection = now - lastConnected;
	return timeSinceConnection > staleThresholdMs;
}

/**
 * Gets the appropriate wallet connection status
 * 
 * @param state - Current wallet connection state
 * @param staleThresholdMs - Time threshold for staleness
 * @returns Connection status object
 */
export function getWalletConnectionStatus(
	state: WalletConnectionState,
	staleThresholdMs?: number
): {
	isConnected: boolean;
	isStale: boolean;
	status: 'connected' | 'disconnected' | 'stale';
} {
	const { isConnected, lastConnected } = state;
	const stale = isSessionStale(lastConnected, staleThresholdMs);

	if (!isConnected) {
		return {
			isConnected: false,
			isStale: false,
			status: 'disconnected'
		};
	}

	if (stale) {
		return {
			isConnected: true,
			isStale: true,
			status: 'stale'
		};
	}

	return {
		isConnected: true,
		isStale: false,
		status: 'connected'
	};
}

/**
 * Generates helper text for wallet reconnection scenarios
 * 
 * @param state - Current wallet connection state
 * @param options - Display options
 * @returns Helper text and action information
 */
export function getWalletReconnectHelperText(
	state: WalletConnectionState,
	options: WalletReconnectOptions = {}
): {
	/** Whether to show helper text */
	shouldShow: boolean;
	/** Main helper message */
	message: string;
	/** Detailed explanation */
	details?: string;
	/** Action button text */
	actionText: string;
	/** Severity level for UI styling */
	severity: 'info' | 'warning' | 'error';
} {
	const { walletName, showDetails = true } = options;
	const reconnectText = options.reconnectText || 'Reconnect';
	
	const status = getWalletConnectionStatus(state);
	const displayName = walletName || state.walletName || 'your wallet';

	// Disconnected state
	if (status.status === 'disconnected') {
		return {
			shouldShow: true,
			message: `${displayName} is not connected`,
			details: showDetails 
				? 'Connect your wallet to access creator features and make transactions.'
				: undefined,
			actionText: `Connect ${displayName}`,
			severity: 'info' as const
		};
	}

	// Stale session state
	if (status.status === 'stale') {
		return {
			shouldShow: true,
			message: `${displayName} session has expired`,
			details: showDetails
				? 'Your wallet session timed out for security. Please reconnect to continue.'
				: undefined,
			actionText: reconnectText,
			severity: 'warning' as const
		};
	}

	// Connected and fresh - no helper needed
	return {
		shouldShow: false,
		message: '',
		actionText: reconnectText,
		severity: 'info' as const
	};
}

/**
 * Gets a short status message for compact UI displays
 * 
 * @param state - Current wallet connection state
 * @param options - Display options
 * @returns Short status message
 */
export function getWalletStatusMessage(
	state: WalletConnectionState,
	options: WalletReconnectOptions = {}
): string {
	const { walletName } = options;
	const displayName = walletName || state.walletName || 'Wallet';
	
	const status = getWalletConnectionStatus(state);
	
	switch (status.status) {
		case 'connected':
			return `${displayName} connected`;
		case 'disconnected':
			return `${displayName} not connected`;
		case 'stale':
			return `${displayName} session expired`;
		default:
			return 'Wallet status unknown';
	}
}

/**
 * Determines if reconnection is recommended
 * 
 * @param state - Current wallet connection state
 * @returns Whether reconnection should be suggested
 */
export function shouldRecommendReconnect(state: WalletConnectionState): boolean {
	const status = getWalletConnectionStatus(state);
	return status.status === 'disconnected' || status.status === 'stale';
}

/**
 * Creates a wallet connection state object
 * 
 * @param isConnected - Whether wallet is connected
 * @param address - Wallet address
 * @param walletName - Wallet name
 * @param lastConnected - Last connection timestamp
 * @returns Wallet connection state
 */
export function createWalletConnectionState(
	isConnected: boolean,
	address?: string,
	walletName?: string,
	lastConnected?: number
): WalletConnectionState {
	return {
		isConnected,
		address,
		walletName,
		lastConnected: lastConnected || (isConnected ? Date.now() : undefined),
		isStale: false
	};
}

/**
 * Updates a wallet connection state with new connection time
 * 
 * @param state - Existing state
 * @param address - New wallet address
 * @param walletName - Wallet name
 * @returns Updated state
 */
export function updateWalletConnection(
	state: WalletConnectionState,
	address?: string,
	walletName?: string
): WalletConnectionState {
	return {
		...state,
		isConnected: true,
		address: address || state.address,
		walletName: walletName || state.walletName,
		lastConnected: Date.now(),
		isStale: false
	};
}

/**
 * Clears wallet connection state
 * 
 * @param state - Existing state
 * @returns Cleared state
 */
export function clearWalletConnection(state: WalletConnectionState): WalletConnectionState {
	return {
		...state,
		isConnected: false,
		address: undefined,
		lastConnected: undefined,
		isStale: false
	};
}
