import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StakeForm from '@/components/common/StakeForm';

function makeProps(overrides = {}) {
	return {
		availableBalance: 5,
		rewardPoolBalance: 1000,
		onStake: vi.fn(),
		isSubmitting: false,
		isConnected: true,
		...overrides,
	};
}

describe('StakeForm (#1017)', () => {
	it('renders the amount input, Max button, lock period selector and submit button', () => {
		render(<StakeForm {...makeProps()} />);

		expect(screen.getByTestId('stake-amount-input')).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /max/i })
		).toBeInTheDocument();
		expect(screen.getByTestId('lock-period-selector')).toBeInTheDocument();
		expect(screen.getByTestId('stake-submit-button')).toBeInTheDocument();
	});

	it('renders all four lock period options', () => {
		render(<StakeForm {...makeProps()} />);

		expect(screen.getByTestId('lock-period-7')).toBeInTheDocument();
		expect(screen.getByTestId('lock-period-30')).toBeInTheDocument();
		expect(screen.getByTestId('lock-period-90')).toBeInTheDocument();
		expect(screen.getByTestId('lock-period-180')).toBeInTheDocument();
	});

	it('shows a validation error and blocks submit when amount is empty (acceptance: validates amount)', async () => {
		const user = userEvent.setup();
		const props = makeProps();
		render(<StakeForm {...props} />);

		await user.click(screen.getByTestId('stake-submit-button'));

		expect(screen.getByTestId('stake-amount-error')).toBeInTheDocument();
		expect(props.onStake).not.toHaveBeenCalled();
	});

	it('shows a validation error when amount exceeds available balance', async () => {
		const user = userEvent.setup();
		const props = makeProps({ availableBalance: 3 });
		render(<StakeForm {...props} />);

		await user.type(screen.getByTestId('stake-amount-input'), '10');
		await user.click(screen.getByTestId('stake-submit-button'));

		expect(screen.getByTestId('stake-amount-error')).toHaveTextContent(
			/only hold 3 key/i
		);
		expect(props.onStake).not.toHaveBeenCalled();
	});

	it('calls onStake with the entered amount and selected period on valid submit', async () => {
		const user = userEvent.setup();
		const props = makeProps({ availableBalance: 5 });
		render(<StakeForm {...props} />);

		await user.type(screen.getByTestId('stake-amount-input'), '2');
		// 30-day period is default — no need to click it
		await user.click(screen.getByTestId('stake-submit-button'));

		expect(props.onStake).toHaveBeenCalledWith(2, 30);
	});

	it('fills max balance when Max button is clicked', async () => {
		const user = userEvent.setup();
		render(<StakeForm {...makeProps({ availableBalance: 7 })} />);

		await user.click(screen.getByRole('button', { name: /max/i }));

		expect(screen.getByTestId('stake-amount-input')).toHaveValue('7');
	});

	it('shows the reward preview after a valid amount is entered (acceptance: reward preview)', async () => {
		const user = userEvent.setup();
		render(<StakeForm {...makeProps({ availableBalance: 5, rewardPoolBalance: 1000 })} />);

		await user.type(screen.getByTestId('stake-amount-input'), '2');

		expect(screen.getByTestId('reward-preview')).toBeInTheDocument();
		expect(screen.getByTestId('reward-preview-value')).toBeInTheDocument();
	});

	it('disables the submit button while isSubmitting is true', () => {
		render(<StakeForm {...makeProps({ isSubmitting: true })} />);

		expect(screen.getByTestId('stake-submit-button')).toBeDisabled();
	});

	it('disables the submit button when wallet is not connected', () => {
		render(<StakeForm {...makeProps({ isConnected: false })} />);

		expect(screen.getByTestId('stake-submit-button')).toBeDisabled();
		expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
	});
});
