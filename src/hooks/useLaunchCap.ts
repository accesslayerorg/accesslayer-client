/**
 * useLaunchCap hook (#1385).
 *
 * Reads the active launch window purchase cap, cumulative purchased amount,
 * and window end for a given key and wallet. Calculates remaining allowance,
 * next cap increase, and exemption status for creators and allowlisted wallets.
 */

import { useContext, useEffect, useMemo, useState } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { launchCapService } from '@/services/launchCap.service';
import type { LaunchCapConfig, LaunchCapData } from '@/types/launchCap';
import type { Course } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

export interface UseLaunchCapOptions {
	/** Optional launch cap config override */
	config?: LaunchCapConfig;
	/** Optional timestamp in ms for deterministic evaluation in tests */
	nowMs?: number;
	/** Timer interval in milliseconds (default: 1000ms) */
	intervalMs?: number;
}

export function useLaunchCap(
	keyId: string | undefined,
	wallet: string | null | undefined,
	options?: UseLaunchCapOptions
): LaunchCapData {
	const queryClient = useContext(QueryClientContext);
	const [tick, setTick] = useState(0);

	// Subscribe to launchCapService state changes (purchases, config updates)
	useEffect(() => {
		const unsubscribe = launchCapService.subscribe(() => {
			setTick(t => t + 1);
		});
		return unsubscribe;
	}, []);

	// Periodic timer to advance time for countdowns and schedule tiers
	useEffect(() => {
		if (options?.nowMs != null) return;
		const interval = options?.intervalMs ?? 1000;
		const timerId = window.setInterval(() => {
			setTick(t => t + 1);
		}, interval);
		return () => window.clearInterval(timerId);
	}, [options?.nowMs, options?.intervalMs]);

	// Read course details from query client if available to enhance creator/whitelist resolution
	const course = useMemo<Course | undefined>(() => {
		if (!keyId || !queryClient) return undefined;
		return queryClient.getQueryData<Course>(queryKeys.creators.detail(keyId));
	}, [keyId, queryClient]);

	const effectiveConfig = useMemo<LaunchCapConfig | undefined>(() => {
		if (options?.config) return options.config;
		if (!keyId) return undefined;

		const serviceConfig = launchCapService.getConfig(keyId);
		if (serviceConfig) return serviceConfig;

		// If course has launchCapConfig defined on it
		if (course && (course as unknown as { launchCap?: LaunchCapConfig }).launchCap) {
			const cCap = (course as unknown as { launchCap: LaunchCapConfig }).launchCap;
			return {
				...cCap,
				creatorAddress: cCap.creatorAddress ?? course.instructorId,
				allowlist:
					cCap.allowlist ??
					course.earlyAccessWhitelist ??
					course.whitelist?.map(w => w.walletAddress),
			};
		}

		return undefined;
	}, [keyId, course, options?.config]);

	const nowMs = options?.nowMs ?? Date.now();

	return useMemo(() => {
		return launchCapService.getLaunchCap(keyId, wallet, nowMs, effectiveConfig);
		// tick triggers re-computation whenever purchases or timers update
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [keyId, wallet, nowMs, effectiveConfig, tick]);
}
