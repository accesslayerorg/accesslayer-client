import { useEffect, useState } from 'react';
import { useCreatorDetail, CREATOR_DETAIL_REFRESH_INTERVAL_MS } from '@/hooks/useCreators';
import {
	getLaunchPhaseCountdown,
	getLaunchPhaseState,
	type LaunchPhase,
} from '@/utils/launchCommitReveal.utils';

const LEDGER_TIME_MS = 5_000;

export interface LaunchSettlementResult {
	fillAmount: number | null;
	refundAmount: number | null;
	clearingPrice: number | null;
}

export interface LaunchPhaseResult {
	phase: LaunchPhase;
	ledgersRemaining: number | null;
	secondsRemaining: number | null;
	countdownLabel: string | null;
	settlement: LaunchSettlementResult;
	isLoading: boolean;
	isError: boolean;
}

export function useLaunchPhase(keyId: string): LaunchPhaseResult {
	const query = useCreatorDetail(keyId);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const course = query.data;
	const hasSchedule =
		typeof course?.launchStartLedger === 'number' &&
		typeof course.launchCommitEndLedger === 'number' &&
		typeof course.launchRevealEndLedger === 'number' &&
		typeof course.currentLedger === 'number';

	useEffect(() => {
		if (!hasSchedule) return;
		setNowMs(Date.now());
		const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [
		hasSchedule,
		course?.currentLedger,
		query.dataUpdatedAt,
		course?.launchStartLedger,
		course?.launchCommitEndLedger,
		course?.launchRevealEndLedger,
	]);

	const elapsedMs = Math.min(
		Math.max(0, nowMs - query.dataUpdatedAt),
		CREATOR_DETAIL_REFRESH_INTERVAL_MS
	);
	const currentLedger =
		typeof course?.currentLedger === 'number'
			? course.currentLedger + Math.floor(elapsedMs / LEDGER_TIME_MS)
			: null;

	const state = getLaunchPhaseState(
		{
			launchStartLedger: course?.launchStartLedger,
			launchCommitEndLedger: course?.launchCommitEndLedger,
			launchRevealEndLedger: course?.launchRevealEndLedger,
			launchSettled: course?.launchSettled,
		},
		currentLedger
	);
	const countdown = getLaunchPhaseCountdown(state.ledgersRemaining);

	return {
		...state,
		secondsRemaining: countdown.seconds,
		countdownLabel: countdown.label,
		settlement: {
			fillAmount: course?.launchFillAmount ?? null,
			refundAmount: course?.launchRefundAmount ?? null,
			clearingPrice: course?.launchClearingPrice ?? null,
		},
		isLoading: query.isLoading,
		isError: query.isError,
	};
}
