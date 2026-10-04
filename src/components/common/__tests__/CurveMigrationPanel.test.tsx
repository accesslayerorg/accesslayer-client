import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from '@testing-library/react';
import CurveMigrationPanel from '../CurveMigrationPanel';
import type {
	CurveMigration,
	CurveMigrationParams,
} from '@/types/curveMigration';

const NOW = Date.parse('2026-09-26T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const currentParams: CurveMigrationParams = {
	basePriceStroops: 10_000_000,
	growthFactor: 1.01,
	milestones: [{ supply: 100, exponent: 1 }],
};

const proposedParams: CurveMigrationParams = {
	basePriceStroops: 20_000_000,
	growthFactor: 1.02,
	milestones: [
		{ supply: 100, exponent: 1 },
		{ supply: 500, exponent: 3 },
	],
};

function createMigration(overrides: Partial<CurveMigration> = {}): CurveMigration {
	return {
		id: 'migration-1',
		keyId: 'creator-1',
		title: 'Tighten the curve',
		description: 'Steepen the curve after the first tier.',
		status: 'pending',
		currentParams,
		proposedParams,
		timelockEndsAt: new Date(NOW - HOUR_MS).toISOString(),
		forVotes: 60,
		againstVotes: 20,
		quorumBps: 4000,
		eligibleVotingWeight: 100,
		totalCirculatingSupply: 100,
		totalVotingWeight: 80,
		...overrides,
	};
}

describe('CurveMigrationPanel', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it('renders the loading and error states', () => {
		const { unmount } = render(
			<CurveMigrationPanel migrations={[]} isLoading onExecute={vi.fn()} />
		);
		expect(
			screen.getByTestId('curve-migration-panel-loading')
		).toBeInTheDocument();
		unmount();

		render(
			<CurveMigrationPanel migrations={[]} isError onExecute={vi.fn()} />
		);
		expect(
			screen.getByTestId('curve-migration-panel-error')
		).toBeInTheDocument();
	});

	it('renders an empty state when the key has no migrations', () => {
		render(<CurveMigrationPanel migrations={[]} onExecute={vi.fn()} />);

		expect(
			screen.getByTestId('curve-migration-panel-empty')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('curve-migration-pending-section')
		).not.toBeInTheDocument();
	});

	it('shows the proposed param diff, timelock countdown, and vote approval', () => {
		render(
			<CurveMigrationPanel
				migrations={[
					createMigration({
						timelockEndsAt: new Date(NOW + HOUR_MS).toISOString(),
					}),
				]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-pending-migration-1')
		).toBeInTheDocument();

		// Param diff flags the changed parameters and leaves the rest dimmed.
		expect(
			screen.getByTestId('curve-migration-param-migration-1-basePriceStroops')
		).toHaveAttribute('data-changed', 'true');
		expect(
			screen.getByTestId('curve-migration-param-migration-1-milestones')
		).toHaveAttribute('data-changed', 'true');

		expect(
			screen.getByTestId('curve-migration-timelock-migration-1')
		).toHaveTextContent('01:00:00');
		expect(
			screen.getByTestId('curve-migration-vote-approval-migration-1')
		).toHaveTextContent('75%');
		expect(
			screen.getByTestId('curve-migration-vote-status-migration-1')
		).toHaveTextContent('Approved');
		expect(
			screen.getByTestId('curve-migration-vote-quorum-migration-1')
		).toHaveTextContent('40%');
	});

	it('ticks the countdown down as the timelock runs', () => {
		render(
			<CurveMigrationPanel
				migrations={[
					createMigration({
						timelockEndsAt: new Date(NOW + HOUR_MS).toISOString(),
					}),
				]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-timelock-migration-1')
		).toHaveTextContent('01:00:00');

		act(() => {
			vi.advanceTimersByTime(10 * 60 * 1000);
		});

		expect(
			screen.getByTestId('curve-migration-timelock-migration-1')
		).toHaveTextContent('00:50:00');
	});

	it('disables Execute while the timelock is still running', () => {
		render(
			<CurveMigrationPanel
				migrations={[
					createMigration({
						timelockEndsAt: new Date(NOW + HOUR_MS).toISOString(),
					}),
				]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-execute-migration-1')
		).toBeDisabled();
		expect(
			screen.getByTestId('curve-migration-disabled-reason-migration-1')
		).toHaveTextContent(/timelock/i);
		expect(
			screen.getByTestId('curve-migration-status-migration-1')
		).toHaveTextContent('Pending');
	});

	it('disables Execute when quorum has not been reached', () => {
		render(
			<CurveMigrationPanel
				migrations={[createMigration({ totalVotingWeight: 10 })]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-execute-migration-1')
		).toBeDisabled();
		expect(
			screen.getByTestId('curve-migration-vote-status-migration-1')
		).toHaveTextContent('Not approved');
		expect(
			screen.getByTestId('curve-migration-disabled-reason-migration-1')
		).toHaveTextContent(/quorum/i);
	});

	it('enables Execute and submits the migration id once both conditions hold', () => {
		const onExecute = vi.fn();
		render(
			<CurveMigrationPanel
				migrations={[createMigration()]}
				onExecute={onExecute}
			/>
		);

		const executeButton = screen.getByTestId('curve-migration-execute-migration-1');
		expect(executeButton).not.toBeDisabled();
		expect(
			screen.getByTestId('curve-migration-timelock-migration-1')
		).toHaveTextContent('Ready');
		expect(
			screen.getByTestId('curve-migration-status-migration-1')
		).toHaveTextContent('Ready to execute');
		expect(
			screen.queryByTestId('curve-migration-disabled-reason-migration-1')
		).not.toBeInTheDocument();

		fireEvent.click(executeButton);
		expect(onExecute).toHaveBeenCalledWith('migration-1');
	});

	it('shows the pending state on the executing migration only', () => {
		render(
			<CurveMigrationPanel
				migrations={[
					createMigration({ id: 'migration-1' }),
					createMigration({ id: 'migration-2' }),
				]}
				executingMigrationId="migration-1"
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-execute-migration-1')
		).toHaveAttribute('aria-busy', 'true');
		expect(
			screen.getByTestId('curve-migration-execute-migration-2')
		).not.toHaveAttribute('aria-busy');
	});

	it('lists executed migrations with their applied params and execution date', () => {
		render(
			<CurveMigrationPanel
				migrations={[
					createMigration({
						id: 'migration-done',
						status: 'executed',
						executedAt: '2027-03-12T00:00:00.000Z',
					}),
				]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('curve-migration-history-section')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('curve-migration-history-migration-done')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('curve-migration-executed-at-migration-done')
		).toHaveTextContent('2027');
		expect(
			screen.getByTestId(
				'curve-migration-param-migration-done-basePriceStroops'
			)
		).toHaveAttribute('data-changed', 'true');
		expect(
			screen.queryByTestId('curve-migration-execute-migration-done')
		).not.toBeInTheDocument();
	});

	it('drops unexecuted terminal migrations from both sections', () => {
		render(
			<CurveMigrationPanel
				migrations={[createMigration({ status: 'cancelled' })]}
				onExecute={vi.fn()}
			/>
		);

		expect(
			screen.queryByTestId('curve-migration-pending-section')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('curve-migration-history-section')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('curve-migration-execute-migration-1')
		).not.toBeInTheDocument();
	});
});
