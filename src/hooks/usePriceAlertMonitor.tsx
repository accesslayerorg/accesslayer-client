import { createElement, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { env } from '@/utils/env.utils';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { priceAlertStorage } from '@/lib/priceAlertStorage';
import PriceAlertToast from '@/components/common/PriceAlertToast';

// ---------------------------------------------------------------------------
// WebSocket price message shape
// ---------------------------------------------------------------------------

interface PriceMessage {
	creatorId: string;
	priceStroops: number;
}

function isPriceMessage(value: unknown): value is PriceMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Record<string, unknown>).creatorId === 'string' &&
		typeof (value as Record<string, unknown>).priceStroops === 'number'
	);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePriceAlertMonitorResult {
	isConnected: boolean;
}

export function usePriceAlertMonitor(): UsePriceAlertMonitorResult {
	const alerts = usePriceAlerts(state => state.alerts);
	const alertsRef = useRef(alerts);
	const [isConnected, setIsConnected] = useState(false);

	// Keep alertsRef current so the WebSocket message handler always sees the
	// latest alerts without needing to close/reopen the socket on every change.
	useEffect(() => {
		alertsRef.current = alerts;
	}, [alerts]);

	useEffect(() => {
		const wsBase = env.VITE_BACKEND_URL.replace(/^http/, 'ws');
		const url = `${wsBase}/ws/prices`;

		let ws: WebSocket | null = null;
		let isMounted = true;

		function handleMessage(event: MessageEvent) {
			let data: unknown;
			try {
				data = JSON.parse(event.data as string);
			} catch {
				return;
			}

			if (!isPriceMessage(data)) return;

			const { creatorId, priceStroops } = data;
			const relevantAlerts = alertsRef.current.filter(
				a => a.creatorId === creatorId
			);

			for (const alert of relevantAlerts) {
				const crossed =
					alert.direction === 'above'
						? priceStroops >= alert.thresholdStroops
						: priceStroops <= alert.thresholdStroops;

				if (!crossed) continue;

				// Capture stable references for the closure.
				const firedAlert = alert;
				const firedPrice = priceStroops;

				toast.custom(
					t =>
						createElement(PriceAlertToast, {
							t,
							alert: firedAlert,
							triggeredPriceStroops: firedPrice,
						}),
					{ duration: 8000, id: `price-alert-${firedAlert.id}` }
				);

				priceAlertStorage.markTriggered(alert.id);

				// Sync the Zustand store so lastTriggeredAt is reflected immediately.
				usePriceAlerts.setState(state => ({
					alerts: state.alerts.map(a =>
						a.id === alert.id
							? { ...a, lastTriggeredAt: new Date().toISOString() }
							: a
					),
				}));
			}
		}

		ws = new WebSocket(url);

		ws.addEventListener('open', () => {
			if (isMounted) setIsConnected(true);
		});

		ws.addEventListener('close', () => {
			if (isMounted) setIsConnected(false);
		});

		ws.addEventListener('error', () => {
			if (isMounted) setIsConnected(false);
		});

		ws.addEventListener('message', handleMessage);

		return () => {
			isMounted = false;
			if (ws) {
				ws.removeEventListener('message', handleMessage);
				ws.close();
			}
		};
		// Intentionally runs once: alertsRef keeps the alert snapshot fresh
		// without reopening the socket on every change.
	}, []);

	return { isConnected };
}
