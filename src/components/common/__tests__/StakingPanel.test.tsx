import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StakingPanel from '@/components/common/StakingPanel';

describe('StakingPanel (#815)', () => {
	const now = 1_700_000_000_000;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('disables Claim while unlock_ledger is in the future', () => {
		render(<StakingPanel key_id="key-1" unlock_ledger={now / 1000 + 3661} onClaim={vi.fn()} />);

		expect(screen.getByTestId('staking-claim-button')).toBeDisabled();
	});

	it('enables Claim when unlock_ledger has passed', () => {
		render(<StakingPanel key_id="key-1" unlock_ledger={now / 1000 - 1} onClaim={vi.fn()} />);

		expect(screen.getByTestId('staking-claim-button')).not.toBeDisabled();
	});

	it('displays the lock expiry countdown in HH:MM:SS format', () => {
		render(<StakingPanel key_id="key-1" unlock_ledger={now / 1000 + 3661} onClaim={vi.fn()} />);

		expect(screen.getByTestId('staking-lock-countdown')).toHaveTextContent('01:01:01');
	});

	it('enables Claim automatically when the countdown reaches zero', () => {
		render(<StakingPanel key_id="key-1" unlock_ledger={now / 1000 + 2} onClaim={vi.fn()} />);

		act(() => vi.advanceTimersByTime(2000));

		expect(screen.getByTestId('staking-lock-countdown')).toHaveTextContent('00:00:00');
		expect(screen.getByTestId('staking-claim-button')).not.toBeDisabled();
	});

	it('calls the contract boundary with the correct key_id on Claim', () => {
		const onClaim = vi.fn();
		render(<StakingPanel key_id={42} unlock_ledger={now / 1000 - 1} onClaim={onClaim} />);

		fireEvent.click(screen.getByTestId('staking-claim-button'));

		expect(onClaim).toHaveBeenCalledWith(42);
	});
});