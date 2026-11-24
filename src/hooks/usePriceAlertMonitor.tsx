import { createElement, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import PriceAlertToast from '@/components/common/PriceAlertToast';
import {
	keyPriceSocket,
	type KeyPriceSocketStatus,
	type KeyPriceUpdate,
} from '@/services/realtime.service';

export interface UsePriceAlertMonitorResult {
	isConnected: boolean;
}

/**
 * One shared monitor owns every alert subscription, even when several
 * components mount the hook (App plus the price-alerts settings page).
 */
let monitorConsumers = 0;
let stopMonitor: (() => void) | null = null;

function startMonitor(): () => void {
	const firedAlertIds = new Set<string>();
	const unsubscribes = new Map<string, () => void>();
	let watchedKeyIds: string[] = [];

	const handleTick = (keyId: string, update: KeyPriceUpdate) => {
		const { alerts, removeAlert } = usePriceAlerts.getState();

		for (const alert of alerts) {
			if (alert.creatorId !== keyId || firedAlertIds.has(alert.id)) continue;

			const crossed =
				alert.direction === 'above'
					? update.priceStroops >= alert.thresholdStroops
					: update.priceStroops <= alert.thresholdStroops;
			if (!crossed) continue;

			firedAlertIds.add(alert.id);
			toast.custom(
				t =>
					createElement(PriceAlertToast, {
						t,
						alert,
						triggeredPriceStroops: update.priceStroops,
					}),
				{ duration: 8000, id: `price-alert-${alert.id}` }
			);

			// Clear the alert so later ticks cannot fire the same notification.
			removeAlert(alert.id);
		}
	};

	const syncSubscriptions = () => {
		const nextKeyIds = [
			...new Set(usePriceAlerts.getState().alerts.map(alert => alert.creatorId)),
		];
		if (
			nextKeyIds.length === watchedKeyIds.length &&
			nextKeyIds.every((keyId, index) => keyId === watchedKeyIds[index])
		) {
			return;
		}

		unsubscribes.forEach(unsubscribe => unsubscribe());
		unsubscribes.clear();
		watchedKeyIds = nextKeyIds;

		for (const keyId of nextKeyIds) {
			unsubscribes.set(
				keyId,
				keyPriceSocket.subscribe(keyId, update => handleTick(keyId, update))
			);
		}
	};

	const unsubscribeStore = usePriceAlerts.subscribe(syncSubscriptions);
	syncSubscriptions();

	return () => {
		unsubscribeStore();
		unsubscribes.forEach(unsubscribe => unsubscribe());
		unsubscribes.clear();
		watchedKeyIds = [];
	};
}

export function usePriceAlertMonitor(): UsePriceAlertMonitorResult {
	const [status, setStatus] = useState<KeyPriceSocketStatus>(
		keyPriceSocket.currentStatus
	);

	useEffect(() => {
		const unsubscribeStatus = keyPriceSocket.subscribeStatus(setStatus);
		monitorConsumers += 1;
		if (monitorConsumers === 1) stopMonitor = startMonitor();

		return () => {
			monitorConsumers -= 1;
			if (monitorConsumers === 0 && stopMonitor) {
				stopMonitor();
				stopMonitor = null;
			}
			unsubscribeStatus();
		};
	}, []);

	return { isConnected: status === 'connected' };
}
