import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Networks } from '@stellar/stellar-sdk';
import { useSigner } from '@/hooks/useSigner';
import { env } from '@/utils/env.utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export interface UseStellarWalletResult {
	address?: string;
	isConnected: boolean;
	loading: boolean;
	activeSigner: ReturnType<typeof useSigner>['activeSigner'];
}

export function useStellarWallet(): UseStellarWalletResult {
	const { activeSigner, loading: signerLoading } = useSigner(networkPassphrase);
	const [address, setAddress] = useState<string>();

	useEffect(() => {
		let cancelled = false;

		if (!activeSigner) {
			setAddress(undefined);
			return () => {
				cancelled = true;
			};
		}

		void activeSigner
			.getPublicKey()
			.then(publicKey => {
				if (!cancelled) setAddress(publicKey);
			})
			.catch(() => {
				if (!cancelled) setAddress(undefined);
			});

		return () => {
			cancelled = true;
		};
	}, [activeSigner]);

	return {
		address,
		isConnected: Boolean(address),
		loading: signerLoading || Boolean(activeSigner && !address),
		activeSigner,
	};
}

export type WalletId = 'freighter' | 'xbull' | 'lobstr' | 'albedo' | 'rabet';

export type WalletFailureReason =
	| 'not-installed'
	| 'locked'
	| 'wrong-network'
	| 'blocked-popup'
	| 'ad-blocker'
	| 'unknown';

export interface WalletDetectionResult {
	id: WalletId;
	name: string;
	installed: boolean;
	available: boolean;
	reason?: WalletFailureReason;
}

export interface WalletDetectionState {
	wallets: WalletDetectionResult[];
	detectedReason?: WalletFailureReason;
	detectedWalletId?: WalletId;
	checking: boolean;
	recheck: () => void;
	getDiagnostics: () => WalletDiagnostics;
}

export interface WalletDiagnostics {
	userAgent: string;
	networkPassphrase: string;
	appVersion: string;
	extensions: Record<WalletId, boolean>;
	detectedReason?: WalletFailureReason;
	detectedWalletId?: WalletId;
	timestamp: string;
}

type WalletWindow = Window & {
	freighter?: { isConnected?: boolean; isAllowed?: boolean };
	xBullSDK?: unknown;
	xBull?: unknown;
	lobstr?: unknown;
	albedo?: unknown;
	rabet?: unknown;
};

interface WalletDefinition {
	id: WalletId;
	name: string;
	/** Returns true when the wallet provider is present on window. */
	isPresent: (win: Window) => boolean;
	/** Optional probe that returns a failure reason when present but unusable. */
	probe?: (win: Window) => WalletFailureReason | undefined;
}

const WALLET_DEFINITIONS: WalletDefinition[] = [
	{
		id: 'freighter',
		name: 'Freighter',
		isPresent: win => Boolean((win as WalletWindow).freighter),
		probe: win => {
			const freighter = (win as WalletWindow).freighter;
			if (!freighter) return undefined;
			if (freighter.isConnected === false && freighter.isAllowed === false) {
				return 'locked';
			}
			return undefined;
		},
	},
	{
		id: 'xbull',
		name: 'xBull',
		isPresent: win => Boolean((win as WalletWindow).xBullSDK || (win as WalletWindow).xBull),
	},
	{
		id: 'lobstr',
		name: 'Lobstr',
		isPresent: win => Boolean((win as WalletWindow).lobstr),
	},
	{
		id: 'albedo',
		name: 'Albedo',
		isPresent: win => Boolean((win as WalletWindow).albedo),
	},
	{
		id: 'rabet',
		name: 'Rabet',
		isPresent: win => Boolean((win as WalletWindow).rabet),
	},
];

function detectAdBlocker(win: Window): boolean {
	try {
		const probe = win.document.createElement('div');
		probe.className = 'ad-banner adsbox pub_300x250';
		probe.style.position = 'absolute';
		probe.style.left = '-9999px';
		win.document.body.appendChild(probe);
		const blocked = probe.offsetHeight === 0 || probe.offsetParent === null;
		win.document.body.removeChild(probe);
		return blocked;
	} catch {
		return false;
	}
}

function detectBlockedPopup(win: Window): boolean {
	try {
		const opened = win.open('', '_blank', 'width=1,height=1');
		if (!opened) return true;
		opened.close();
		return false;
	} catch {
		return true;
	}
}

function runDetection(win: Window | undefined): {
	wallets: WalletDetectionResult[];
	detectedReason?: WalletFailureReason;
	detectedWalletId?: WalletId;
} {
	if (!win) {
		return {
			wallets: WALLET_DEFINITIONS.map(def => ({
				id: def.id,
				name: def.name,
				installed: false,
				available: false,
				reason: 'not-installed' as WalletFailureReason,
			})),
			detectedReason: 'not-installed',
		};
	}

	const wallets: WalletDetectionResult[] = WALLET_DEFINITIONS.map(def => {
		const installed = def.isPresent(win);
		if (!installed) {
			return {
				id: def.id,
				name: def.name,
				installed: false,
				available: false,
				reason: 'not-installed' as WalletFailureReason,
			};
		}
		const probeReason = def.probe?.(win);
		if (probeReason) {
			return {
				id: def.id,
				name: def.name,
				installed: true,
				available: false,
				reason: probeReason,
			};
		}
		return {
			id: def.id,
			name: def.name,
			installed: true,
			available: true,
		};
	});

	const anyInstalled = wallets.some(w => w.installed);
	const anyAvailable = wallets.some(w => w.available);

	let detectedReason: WalletFailureReason | undefined;
	let detectedWalletId: WalletId | undefined;

	if (!anyInstalled) {
		detectedReason = 'not-installed';
	} else if (!anyAvailable) {
		const firstProblem = wallets.find(w => w.installed && !w.available);
		if (firstProblem) {
			detectedReason = firstProblem.reason;
			detectedWalletId = firstProblem.id;
		}
	} else {
		// Wallets are present; check for environmental blockers.
		if (detectBlockedPopup(win)) {
			detectedReason = 'blocked-popup';
		} else if (detectAdBlocker(win)) {
			detectedReason = 'ad-blocker';
		}
	}

	return { wallets, detectedReason, detectedWalletId };
}

export function useWalletDetection(): WalletDetectionState {
	const [wallets, setWallets] = useState<WalletDetectionResult[]>(() =>
		runDetection(typeof window !== 'undefined' ? window : undefined).wallets,
	);
	const [detectedReason, setDetectedReason] = useState<WalletFailureReason | undefined>();
	const [detectedWalletId, setDetectedWalletId] = useState<WalletId | undefined>();
	const [checking, setChecking] = useState(false);
	const mountedRef = useRef(true);

	const run = useCallback(() => {
		setChecking(true);
		const win = typeof window !== 'undefined' ? window : undefined;
		const result = runDetection(win);
		if (!mountedRef.current) return;
		setWallets(result.wallets);
		setDetectedReason(result.detectedReason);
		setDetectedWalletId(result.detectedWalletId);
		setChecking(false);
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		run();
		return () => {
			mountedRef.current = false;
		};
	}, [run]);

	const recheck = useCallback(() => {
		run();
	}, [run]);

	const getDiagnostics = useCallback((): WalletDiagnostics => {
		const win = typeof window !== 'undefined' ? window : undefined;
		const extensions = WALLET_DEFINITIONS.reduce(
			(acc, def) => {
				acc[def.id] = win ? def.isPresent(win) : false;
				return acc;
			},
			{} as Record<WalletId, boolean>,
		);

		return {
			userAgent: win?.navigator?.userAgent ?? 'unknown',
			networkPassphrase,
			appVersion: env.VITE_APP_VERSION ?? 'unknown',
			extensions,
			detectedReason,
			detectedWalletId,
			timestamp: new Date().toISOString(),
		};
	}, [detectedReason, detectedWalletId]);

	return useMemo(
		() => ({
			wallets,
			detectedReason,
			detectedWalletId,
			checking,
			recheck,
			getDiagnostics,
		}),
		[wallets, detectedReason, detectedWalletId, checking, recheck, getDiagnostics],
	);
}