import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
	useAccount,
	useChainId,
	useConnect,
	useDisconnect,
	useSwitchChain,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';
import { useCreatorKeyStore } from '@/hooks/useCreatorKeyStore';
import { usePendingTxStore } from '@/hooks/usePendingTxStore';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import {
	CROSS_TAB_CHANNEL_NAME,
	CROSS_TAB_DEBOUNCE_MS,
	CROSS_TAB_STORAGE_KEY,
	getTabId,
	getWalletEvent,
	isBackgroundTab,
	isCrossTabMessage,
	isSensitivePath,
	normalizeAddress,
	parseCrossTabMessage,
	type CrossTabMessage,
	type CrossTabWalletState,
} from '@/utils/crossTabSync.utils';

export interface UseCrossTabSyncOptions {
	onReload?: () => void;
}

export function useCrossTabSync(options?: UseCrossTabSyncOptions) {
	const queryClient = useQueryClient();
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const { disconnect } = useDisconnect();
	const { connect } = useConnect();
	const { switchChain } = useSwitchChain();

	const stateRef = useRef<CrossTabWalletState>({
		address,
		isConnected,
		chainId,
	});
	const tabIdRef = useRef(getTabId());
	const seenIdsRef = useRef(new Set<string>());
	const channelRef = useRef<BroadcastChannel | null>(null);
	const timeoutRef = useRef<number | null>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const publish = useCallback((message: CrossTabMessage) => {
		channelRef.current?.postMessage(message);
		try {
			window.localStorage.setItem(
				CROSS_TAB_STORAGE_KEY,
				JSON.stringify(message)
			);
		} catch {
			return;
		}
	}, []);

	const handleIncoming = useCallback(
		(message: CrossTabMessage) => {
			if (message.tabId === tabIdRef.current) return;
			if (seenIdsRef.current.has(message.id)) return;
			seenIdsRef.current.add(message.id);
			if (Date.now() - message.timestamp > 60_000) return;

			const walletKeys = [
				queryKeys.walletSession.all(),
				queryKeys.walletSession.notifications(),
				queryKeys.walletSession.sessions(),
				queryKeys.walletSession.alerts(),
				queryKeys.creatorProfile.all(),
				queryKeys.keySubscription.all(),
			];
			for (const key of walletKeys) {
				void queryClient.invalidateQueries({ queryKey: key });
			}

			const current = stateRef.current;
			const addressChanged =
				normalizeAddress(message.address) !== normalizeAddress(current.address);

			if (message.type === 'account_change') {
				usePendingTxStore.getState().clearAll();
				useBatchTradeStore.getState().clearBatch();
				useBatchTradeStore.getState().closeDrawer();
				useCreatorKeyStore.getState().reset();
				if (addressChanged) {
					disconnect();
					connect({ connector: injected() });
				}
			} else if (message.type === 'disconnect') {
				usePendingTxStore.getState().clearAll();
				useBatchTradeStore.getState().clearBatch();
				useBatchTradeStore.getState().closeDrawer();
				useCreatorKeyStore.getState().reset();
				if (current.isConnected) disconnect();
			} else if (
				message.type === 'network_change' &&
				message.chainId != null &&
				message.chainId !== current.chainId
			) {
				switchChain({
					chainId: message.chainId as Parameters<
						typeof switchChain
					>[0]['chainId'],
				});
			} else if (message.type === 'connect' && addressChanged) {
				connect({ connector: injected() });
			}

			const accountChanged =
				message.type === 'account_change' || message.type === 'disconnect';
			if (isBackgroundTab()) {
				showToast.message(
					accountChanged
						? 'Account changed in another tab. Reload sensitive pages before continuing.'
						: 'Wallet session changed in another tab.'
				);
			} else if (accountChanged && isSensitivePath(window.location.pathname)) {
				const reload = optionsRef.current?.onReload;
				if (reload) reload();
				else window.location.reload();
			}
		},
		[connect, disconnect, queryClient, switchChain]
	);

	useEffect(() => {
		const messageHandler = (message: CrossTabMessage) => handleIncoming(message);
		if (typeof BroadcastChannel !== 'undefined') {
			const channel = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
			channel.onmessage = event => {
				if (isCrossTabMessage(event.data)) messageHandler(event.data);
			};
			channelRef.current = channel;
		}

		const storageHandler = (event: StorageEvent) => {
			if (event.key !== CROSS_TAB_STORAGE_KEY) return;
			const message = parseCrossTabMessage(event.newValue);
			if (message) messageHandler(message);
		};
		window.addEventListener('storage', storageHandler);

		return () => {
			window.removeEventListener('storage', storageHandler);
			channelRef.current?.close();
			channelRef.current = null;
			if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
		};
	}, [handleIncoming]);

	useEffect(() => {
		const previous = stateRef.current;
		stateRef.current = { address, isConnected, chainId };
		const eventType = getWalletEvent(previous, {
			address,
			isConnected,
			chainId,
		});
		if (!eventType) return;

		const message: CrossTabMessage = {
			id: getTabId(),
			tabId: tabIdRef.current,
			type: eventType,
			address: normalizeAddress(address),
			chainId: chainId ?? null,
			timestamp: Date.now(),
		};
		if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(
			() => publish(message),
			CROSS_TAB_DEBOUNCE_MS
		);
	}, [address, chainId, isConnected, publish]);
}
