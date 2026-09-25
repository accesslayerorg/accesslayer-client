import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AllowanceApprovalStep from '../AllowanceApprovalStep';

describe('AllowanceApprovalStep (#955)', () => {
	it('renders approval required explanation and grants list', () => {
		render(
			<AllowanceApprovalStep
				isApproving={false}
				errorMessage={null}
				onApprove={vi.fn()}
			/>
		);

		expect(screen.getByText('Approval required')).toBeInTheDocument();
		expect(
			screen.getByText(/Before staking your keys, you must grant the staking contract permission/i)
		).toBeInTheDocument();
		expect(screen.getByText(/What this approval grants/i)).toBeInTheDocument();
		expect(
			screen.getByText(/The staking contract may transfer your approved creator keys/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/Your wallet retains full custody until a stake action is confirmed/i)
		).toBeInTheDocument();
		expect(
			screen.getByText(/You can revoke this approval at any time from your wallet settings/i)
		).toBeInTheDocument();
	});

	it('calls onApprove when approve button is clicked', () => {
		const handleApprove = vi.fn();
		render(
			<AllowanceApprovalStep
				isApproving={false}
				errorMessage={null}
				onApprove={handleApprove}
			/>
		);

		const button = screen.getByTestId('allowance-approve-btn');
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent(/Approve transfer/i);

		fireEvent.click(button);
		expect(handleApprove).toHaveBeenCalledTimes(1);
	});

	it('displays loading state and disables button when isApproving is true', () => {
		render(
			<AllowanceApprovalStep
				isApproving={true}
				errorMessage={null}
				onApprove={vi.fn()}
			/>
		);

		const button = screen.getByTestId('allowance-approve-btn');
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('Approving…')).toBeInTheDocument();
	});

	it('displays error alert when errorMessage is provided', () => {
		render(
			<AllowanceApprovalStep
				isApproving={false}
				errorMessage="Transaction was rejected by user."
				onApprove={vi.fn()}
			/>
		);

		const alert = screen.getByRole('alert');
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveTextContent('Transaction was rejected by user.');
	});
});
