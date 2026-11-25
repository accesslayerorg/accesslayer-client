import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FlagKeyModal from '../FlagKeyModal';
import type { KeyFlag } from '@/services/course.service';

const baseProps = {
	open: true,
	onOpenChange: vi.fn(),
	keyTitle: 'Ada Creator',
	requiredStakeStroops: 1_000_000,
};

describe('FlagKeyModal (#1386)', () => {
	it('shows the required stake and the refund/forfeit rules', () => {
		render(<FlagKeyModal {...baseProps} onSubmit={vi.fn()} />);

		expect(screen.getByTestId('flag-stake-amount')).toHaveTextContent(
			'0.1 XLM'
		);
		const rules = screen.getByTestId('flag-stake-rules');
		expect(rules).toHaveTextContent(/stake is returned if the review/i);
		expect(rules).toHaveTextContent(/stake is forfeited to the protocol/i);
		expect(rules).toHaveTextContent(/stays locked/i);
	});

	it('submits the selected reason code', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);

		render(<FlagKeyModal {...baseProps} onSubmit={onSubmit} />);

		await user.selectOptions(screen.getByTestId('flag-reason-select'), 'fraud');
		await user.click(screen.getByTestId('confirm-flag-button'));

		expect(onSubmit).toHaveBeenCalledWith({ reasonCode: 'fraud' });
	});

	it('shows the existing flag instead of the form to block a second flag', () => {
		const existingFlag: KeyFlag = {
			id: 'flag-1',
			walletAddress: 'GWALLET',
			reasonCode: 'abuse',
			stakeStroops: 1_000_000,
			createdAt: '2026-11-01T00:00:00.000Z',
		};

		render(
			<FlagKeyModal
				{...baseProps}
				existingFlag={existingFlag}
				onSubmit={vi.fn()}
			/>
		);

		expect(
			screen.getByText(/you already flagged this key/i)
		).toBeInTheDocument();
		expect(screen.getByTestId('existing-flag-notice')).toHaveTextContent(
			'Abusive or harmful content'
		);
		expect(screen.getByTestId('existing-flag-notice')).toHaveTextContent(
			'0.1 XLM'
		);
		expect(screen.queryByTestId('confirm-flag-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('flag-pending-resolution')).toHaveTextContent(
			/stake locked on-chain/i
		);
	});

	it('shows a returned stake after resolution', () => {
		render(
			<FlagKeyModal
				{...baseProps}
				existingFlag={{
					id: 'flag-2',
					walletAddress: 'GWALLET',
					reasonCode: 'fraud',
					stakeStroops: 1_000_000,
					createdAt: '2026-11-01T00:00:00.000Z',
					resolution: {
						status: 'returned',
						resolvedAt: '2026-11-10T00:00:00.000Z',
					},
				}}
				onSubmit={vi.fn()}
			/>
		);

		expect(screen.getByTestId('flag-resolution-summary')).toHaveTextContent(
			/stake was returned in full/i
		);
	});

	it('shows a forfeited stake after resolution', () => {
		render(
			<FlagKeyModal
				{...baseProps}
				existingFlag={{
					id: 'flag-3',
					walletAddress: 'GWALLET',
					reasonCode: 'spam',
					stakeStroops: 1_000_000,
					createdAt: '2026-11-01T00:00:00.000Z',
					resolution: {
						status: 'forfeited',
						resolvedAt: '2026-11-10T00:00:00.000Z',
					},
				}}
				onSubmit={vi.fn()}
			/>
		);

		expect(screen.getByTestId('flag-resolution-summary')).toHaveTextContent(
			/stake was forfeited/i
		);
	});
});
