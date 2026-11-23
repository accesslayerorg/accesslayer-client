import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { create } from 'zustand';
import { courseService, type Course } from '@/services/course.service';

export interface LaunchCapConfig {
	startCap?: number;
	initialCap?: number;
	minimumCap?: number;
	finalCap?: number;
	maxCap?: number;
	startAt?: string;
	windowStart?: string;
	launchStartedAt?: string;
	windowEnd?: string;
	endsAt?: string;
	launchEndsAt?: string;
}

export interface LaunchCapData {
	keyId: string;
	wallet: string;
	currentCap: number;
	purchasedAmount: number;
	remainingAllowance: number;
	windowStart: number | null;
	windowEnd: number | null;
	initialCap: number;
	finalCap: number;
	isExempt: boolean;
	exemptionReason: 'creator' | 'allowlisted' | null;
}

interface LaunchCapStore {
	purchases: Record<string, number>;
	recordPurchase: (keyId: string, wallet: string, quantity: number) => void;
}

export const useLaunchCapStore = create<LaunchCapStore>(set => ({
	purchases: {},
	recordPurchase: (keyId, wallet, quantity) => {
		const id = `${keyId}:${wallet}`;
		set(state => ({
			purchases: {
				...state.purchases,
				[id]: (state.purchases[id] ?? 0) + quantity,
			},
		}));
	},
}));

export function remainingLaunchAllowance(data: LaunchCapData): number {
	return Math.max(0, data.currentCap - data.purchasedAmount);
}

export function calculateCurrentLaunchCap(
	initialCap: number,
	finalCap: number,
	windowStart: number,
	windowEnd: number,
	now = Date.now()
): number {
	if (now <= windowStart) return initialCap;
	if (now >= windowEnd) return finalCap;
	const progress = (now - windowStart) / (windowEnd - windowStart);
	return Math.min(
		finalCap,
		Math.floor(initialCap + (finalCap - initialCap) * progress)
	);
}

function configFromCourse(course: Course): LaunchCapConfig | null {
	const courseWithLaunch = course as Course & {
		launchCap?: LaunchCapConfig | number | null;
		launchCapConfig?: LaunchCapConfig | null;
		purchaseCap?: LaunchCapConfig | number | null;
		launchPurchaseCap?: LaunchCapConfig | number | null;
	};
	const value =
		courseWithLaunch.launchCapConfig ??
		courseWithLaunch.launchCap ??
		courseWithLaunch.launchPurchaseCap ??
		courseWithLaunch.purchaseCap;
	if (!value) return null;
	if (typeof value === 'number') return { finalCap: value, initialCap: value };
	return value;
}

export function useLaunchCap(keyId?: string, wallet?: string) {
	const { address } = useAccount();
	const activeWallet = wallet ?? address ?? '';
	const [course, setCourse] = useState<Course | null>(null);
	const [now, setNow] = useState(Date.now());
	const purchasedAmount = useLaunchCapStore(state =>
		keyId ? (state.purchases[`${keyId}:${activeWallet}`] ?? 0) : 0
	);

	useEffect(() => {
		if (!keyId) return;
		let cancelled = false;
		courseService
			.getCourse(keyId)
			.then(value => {
				if (!cancelled) setCourse(value);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [keyId]);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 15_000);
		return () => window.clearInterval(timer);
	}, []);

	if (!keyId || !course) return null;
	const config = configFromCourse(course);
	if (!config) return null;

	const windowStart =
		config.windowStart ?? config.startAt ?? config.launchStartedAt;
	const windowEnd = config.windowEnd ?? config.endsAt ?? config.launchEndsAt;
	const startTime = windowStart ? Date.parse(windowStart) : null;
	const endTime = windowEnd ? Date.parse(windowEnd) : null;
	if (endTime != null && now >= endTime) return null;

	const initialCap =
		config.initialCap ?? config.startCap ?? config.minimumCap ?? 0;
	const finalCap = config.finalCap ?? config.maxCap ?? initialCap;
	const currentCap =
		startTime != null && endTime != null
			? calculateCurrentLaunchCap(
					initialCap,
					finalCap,
					startTime,
					endTime,
					now
				)
			: initialCap;

	const courseWithLaunch = course as Course & {
		creatorAddress?: string;
		walletAddress?: string;
	};
	const courseWallet =
		courseWithLaunch.creatorAddress ?? courseWithLaunch.walletAddress ?? '';
	const whitelist = (course.whitelist ?? []).map(entry => entry.walletAddress);
	const isCreator = Boolean(
		activeWallet &&
		courseWallet &&
		activeWallet.toLowerCase() === courseWallet.toLowerCase()
	);
	const isAllowlisted = Boolean(
		activeWallet &&
		(whitelist.some(
			address => address.toLowerCase() === activeWallet.toLowerCase()
		) ||
			course.earlyAccessWhitelist?.some(
				address => address.toLowerCase() === activeWallet.toLowerCase()
			))
	);
	const isExempt = isCreator || isAllowlisted;

	const data: LaunchCapData = {
		keyId,
		wallet: activeWallet,
		currentCap,
		purchasedAmount,
		remainingAllowance: isExempt
			? 0
			: Math.max(0, currentCap - purchasedAmount),
		windowStart: startTime,
		windowEnd: endTime,
		initialCap,
		finalCap,
		isExempt,
		exemptionReason: isCreator
			? 'creator'
			: isAllowlisted
				? 'allowlisted'
				: null,
	};
	return data;
}

export default useLaunchCap;
