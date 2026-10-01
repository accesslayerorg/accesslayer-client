import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import LpPositionsList from '../LpPositionsList';
import type { LpPosition } from '@/services/lpPositions.service';

const XLM = 10_000_000n;
const NOW = Date.parse('2030-01-01T00:00:00Z');

function position(overrides: Partial<LpPosition> = {}): LpPosition {
	return {
		lpId: '1',
		keyId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
		keyName: 'Alpha Key',
		creatorId: 'alpha',
		contributionStroops: 250n * XLM,
		shareBps: 2500,
		poolTotalLiquidityStroops: 1_000n * XLM,
		pendingRewardsStroops: 12_345n,
		claimedRewardsStroops: 0n,
		lock: { kind: 'none' },
		...overrides,
	};
}

function renderList(
	props: Partial<React.ComponentProps<typeof LpPositionsList>>
) {
	return render(
		<MemoryRouter>
			<LpPositionsList
				positions={[position()]}
				nowMs={NOW}
				canTransact
				{...props}
			/>
		</MemoryRouter>
	);
}

describe('LpPositionsList (#1030)', () => {
	it('renders key name, contribution, exact pool share, and accrued rewards', () => {
		renderList({});
		expect(screen.getByRole('link', { name: 'Alpha Key' })).toHaveAttribute(
			'href',
			'/creator/alpha'
		);
		expect(screen.getByTestId('lp-contribution-1')).toHaveTextContent(
			'250.0000000 XLM'
		);
		expect(screen.getByTestId('lp-share-1')).toHaveTextContent('25.00%');
		expect(screen.getByTestId('lp-rewards-1')).toHaveTextContent(
			'0.0012345 XLM'
		);
	});

	it('renders each of multiple positions with its own values', () => {
		renderList({
			positions: [
				position(),
				position({
					lpId: '2',
					keyName: 'Beta Key',
					creatorId: null,
					contributionStroops: 1n,
					poolTotalLiquidityStroops: 1_000_000n,
					pendingRewardsStroops: null,
				}),
			],
		});
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		expect(screen.getByText('Beta Key')).toBeInTheDocument();
		expect(screen.getByTestId('lp-share-2')).toHaveTextContent('<0.01%');
		expect(screen.getByTestId('lp-rewards-2')).toHaveTextContent(
			'Unavailable'
		);
	});

	it('blocks removal with a countdown while the lock is active', () => {
		const unlocksAtMs = NOW + (2 * 86_400 + 14 * 3_600 + 32 * 60) * 1000;
		renderList({
			positions: [position({ lock: { kind: 'until', unlocksAtMs } })],
		});
		expect(screen.getByTestId('lp-lock-status-1')).toHaveTextContent(
			'Locked · 2d 14h 32m remaining'
		);
		expect(screen.getByTestId('lp-remove-1')).toBeDisabled();
		expect(screen.getByTestId('lp-remove-1')).toHaveAccessibleDescription(
			'Removal unlocks in 2d 14h 32m.'
		);
	});

	it('enables removal once the clock passes the unlock time, without a reload', () => {
		const unlocksAtMs = NOW + 5_000;
		const onRemove = vi.fn();
		const locked = position({ lock: { kind: 'until', unlocksAtMs } });
		const { rerender } = renderList({ positions: [locked], onRemove });
		expect(screen.getByTestId('lp-remove-1')).toBeDisabled();

		rerender(
			<MemoryRouter>
				<LpPositionsList
					positions={[locked]}
					nowMs={unlocksAtMs}
					canTransact
					onRemove={onRemove}
				/>
			</MemoryRouter>
		);
		expect(screen.getByTestId('lp-lock-status-1')).toHaveTextContent(
			'Unlocked'
		);
		fireEvent.click(screen.getByTestId('lp-remove-1'));
		expect(onRemove).toHaveBeenCalledWith(locked);
	});

	it('fails closed when the lock timestamp is invalid', () => {
		renderList({ positions: [position({ lock: { kind: 'invalid' } })] });
		expect(screen.getByTestId('lp-lock-status-1')).toHaveTextContent(
			'Lock unknown'
		);
		expect(screen.getByTestId('lp-remove-1')).toBeDisabled();
	});

	it('invokes claim for the clicked position', () => {
		const onClaim = vi.fn();
		const p = position();
		renderList({ positions: [p], onClaim });
		fireEvent.click(screen.getByTestId('lp-claim-1'));
		expect(onClaim).toHaveBeenCalledWith(p);
	});

	it('disables claim when there is nothing claimable', () => {
		renderList({
			positions: [
				position({ pendingRewardsStroops: 0n }),
				position({ lpId: '2', pendingRewardsStroops: null }),
			],
		});
		expect(screen.getByTestId('lp-claim-1')).toBeDisabled();
		expect(screen.getByTestId('lp-claim-2')).toBeDisabled();
	});

	it('shows pending labels and disables every action while busy', () => {
		renderList({ isBusy: true, claimingLpId: '1' });
		expect(screen.getByTestId('lp-claim-1')).toHaveTextContent('Claiming…');
		expect(screen.getByTestId('lp-claim-1')).toBeDisabled();
		expect(screen.getByTestId('lp-add-1')).toBeDisabled();
		expect(screen.getByTestId('lp-remove-1')).toBeDisabled();
	});

	it('is read-only for viewers who cannot sign', () => {
		renderList({ canTransact: false });
		expect(screen.queryByTestId('lp-claim-1')).not.toBeInTheDocument();
		expect(screen.queryByTestId('lp-remove-1')).not.toBeInTheDocument();
		expect(screen.queryByTestId('lp-add-1')).not.toBeInTheDocument();
		expect(screen.getByTestId('lp-rewards-1')).toBeInTheDocument();
	});
});
