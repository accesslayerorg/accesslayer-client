import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PerformanceBondCard from '../PerformanceBondCard';
import type { PerformanceBond } from '@/services/course.service';

describe('PerformanceBondCard', () => {
	const onRetry = vi.fn();
	const onTopUp = vi.fn().mockResolvedValue(undefined);

	it('shows amount, active status, release date, and reverse-chronological slash history', async () => {
		const user = userEvent.setup();
		const bond: PerformanceBond = {
			keyId: 'creator-1',
			amountStroops: 10_000_000_000,
			state: 'active',
			releaseDate: '2027-01-02T00:00:00Z',
			slashEvents: [
				{ amountXlm: 3, reason: 'Earlier event', ledgerTimestamp: 120 },
				{ amountXlm: 5, reason: 'Later event', ledgerTimestamp: 240 },
			],
		};

		render(
			<PerformanceBondCard bond={bond} onRetry={onRetry} onTopUp={onTopUp} />
		);

		expect(screen.getByTestId('performance-bond-status')).toHaveTextContent(
			'active'
		);
		expect(screen.getByTestId('performance-bond-amount')).toHaveTextContent(
			'1,000 XLM'
		);
		expect(
			screen.getByTestId('performance-bond-release-date')
		).not.toHaveTextContent('—');

		await user.click(screen.getByText('Slash history (2)'));
		const slashRows = screen.getAllByTestId('performance-bond-slash-event');
		expect(within(slashRows[0]).getByText('Later event')).toBeInTheDocument();
		expect(
			within(slashRows[1]).getByText('Earlier event')
		).toBeInTheDocument();
	});

	it('renders the slashed status distinctly', () => {
		const bond: PerformanceBond = {
			keyId: 'creator-2',
			amountXlm: 75,
			state: 'slashed',
			reason: 'Missed delivery',
		};

		render(
			<PerformanceBondCard bond={bond} onRetry={onRetry} onTopUp={onTopUp} />
		);

		expect(screen.getByTestId('performance-bond-status')).toHaveTextContent(
			'slashed'
		);
		expect(screen.getByTestId('performance-bond-status')).toHaveClass(
			'text-rose-300'
		);
	});

	it('shows the released status and release date', () => {
		const bond: PerformanceBond = {
			keyId: 'creator-3',
			amountXlm: 75,
			state: 'released',
			releaseDate: '2027-01-02T00:00:00Z',
		};

		render(
			<PerformanceBondCard bond={bond} onRetry={onRetry} onTopUp={onTopUp} />
		);

		expect(screen.getByTestId('performance-bond-status')).toHaveTextContent(
			'released'
		);
		expect(
			screen.getByTestId('performance-bond-release-date')
		).not.toHaveTextContent('—');
	});

	it('shows an empty state CTA and validates a positive top-up amount', async () => {
		const user = userEvent.setup();
		const topUp = vi.fn().mockResolvedValue(undefined);

		render(
			<PerformanceBondCard bond={null} onRetry={onRetry} onTopUp={topUp} />
		);

		expect(
			screen.getByTestId('performance-bond-card-empty')
		).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Post a bond' }));
		const amountInput = screen.getByLabelText('Amount (XLM)');
		await user.type(amountInput, '0');
		await user.click(screen.getByTestId('performance-bond-top-up-submit'));

		expect(
			screen.getByText('Enter an amount greater than zero.')
		).toBeInTheDocument();
		expect(topUp).not.toHaveBeenCalled();

		await user.clear(amountInput);
		await user.type(amountInput, '2.5');
		await user.click(screen.getByTestId('performance-bond-top-up-submit'));
		expect(topUp).toHaveBeenCalledWith(2.5);
	});

	it('shows an error and retry action when loading fails', async () => {
		const user = userEvent.setup();
		const retry = vi.fn();

		render(<PerformanceBondCard isError onRetry={retry} onTopUp={onTopUp} />);

		expect(
			screen.getByTestId('performance-bond-card-error')
		).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Retry' }));
		expect(retry).toHaveBeenCalledOnce();
	});

	it('shows a pending state and prevents duplicate submission', async () => {
		const user = userEvent.setup();
		const props = {
			bond: null,
			onRetry,
			onTopUp,
		};
		const { rerender } = render(<PerformanceBondCard {...props} />);

		await user.click(screen.getByRole('button', { name: 'Post a bond' }));
		rerender(<PerformanceBondCard {...props} isTopUpPending />);

		expect(
			screen.getByTestId('performance-bond-top-up-submit')
		).toHaveTextContent('Submitting…');
		expect(
			screen.getByTestId('performance-bond-top-up-submit')
		).toBeDisabled();
		expect(screen.getByLabelText('Amount (XLM)')).toBeDisabled();
	});
});
