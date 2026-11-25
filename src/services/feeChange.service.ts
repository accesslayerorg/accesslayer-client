import { FEE_BOUNDS } from '@/constants/fees';
import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

const FEE_CHANGE_KEY = 'fee-change-state';

export type FeeChangeStatus = 'none' | 'pending' | 'executed' | 'cancelled';

export interface FeeChangeState {
	status: FeeChangeStatus;
	currentFeeBps: number;
	id?: string;
	queuedFeeBps?: number;
	queuedAt?: string;
	eta?: string;
	executedAt?: string;
	cancelledAt?: string;
}

export interface QueueFeeChangeInput {
	queuedFeeBps: number;
	eta: string;
}

function defaultState(): FeeChangeState {
	return {
		status: 'none',
		currentFeeBps: FEE_BOUNDS.DEFAULT_FEE_BPS,
	};
}

function readState(): FeeChangeState {
	const [state] = readLocalCollection<FeeChangeState>(FEE_CHANGE_KEY, () => [
		defaultState(),
	]);
	return { ...defaultState(), ...state };
}

function writeState(state: FeeChangeState): FeeChangeState {
	writeLocalCollection(FEE_CHANGE_KEY, [state]);
	return state;
}

export function getFeeChangeState(): FeeChangeState {
	return readState();
}

export function getPendingFeeChange(): FeeChangeState | null {
	const state = readState();
	return state.status === 'pending' ? state : null;
}

export function queueFeeChange(input: QueueFeeChangeInput): FeeChangeState {
	const state = readState();
	if (state.status === 'pending') {
		throw new Error('A fee change is already queued.');
	}
	if (
		!Number.isFinite(input.queuedFeeBps) ||
		input.queuedFeeBps < FEE_BOUNDS.MIN_FEE_BPS ||
		input.queuedFeeBps > FEE_BOUNDS.MAX_FEE_BPS
	) {
		throw new Error(
			`Fee must be between ${FEE_BOUNDS.MIN_FEE_BPS / 100}% and ${FEE_BOUNDS.MAX_FEE_BPS / 100}%.`
		);
	}
	const eta = new Date(input.eta).getTime();
	if (!Number.isFinite(eta) || eta <= Date.now()) {
		throw new Error('Execution ETA must be in the future.');
	}

	return writeState({
		...state,
		status: 'pending',
		id: `fee-change-${Date.now()}`,
		queuedFeeBps: Math.floor(input.queuedFeeBps),
		queuedAt: new Date().toISOString(),
		eta: new Date(eta).toISOString(),
		executedAt: undefined,
		cancelledAt: undefined,
	});
}

export function cancelFeeChange(): FeeChangeState {
	const state = readState();
	if (state.status !== 'pending') {
		throw new Error('There is no pending fee change to cancel.');
	}
	return writeState({
		...state,
		status: 'cancelled',
		cancelledAt: new Date().toISOString(),
	});
}

export function executeFeeChange(): FeeChangeState {
	const state = readState();
	if (state.status !== 'pending' || state.queuedFeeBps == null) {
		throw new Error('There is no pending fee change to execute.');
	}
	return writeState({
		...state,
		status: 'executed',
		currentFeeBps: state.queuedFeeBps,
		executedAt: new Date().toISOString(),
	});
}

export function resetFeeChangeStore(): void {
	resetLocalCollection(FEE_CHANGE_KEY);
}
