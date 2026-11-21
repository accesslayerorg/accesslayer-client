import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import ContractPausedBanner from '../ContractPausedBanner';
import { useContractPausedStore } from '@/hooks/useContractPausedStore';

describe('ContractPausedBanner (#953)', () => {
	beforeEach(() => {
		useContractPausedStore.setState({
			status: 'inactive',
			lastCheckedAt: null,
			isChecking: false,
			_intervalId: null,
		});
	});

	it('renders nothing when contract pause state is inactive', () => {
		const { container } = render(<ContractPausedBanner />);
		expect(container.firstChild).toBeNull();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('renders nothing when contract pause state is unknown', () => {
		useContractPausedStore.setState({ status: 'unknown' });
		const { container } = render(<ContractPausedBanner />);
		expect(container.firstChild).toBeNull();
	});

	it('renders full-width banner when contract pause state is active', () => {
		useContractPausedStore.setState({ status: 'active' });
		render(<ContractPausedBanner />);

		const banner = screen.getByRole('alert');
		expect(banner).toBeInTheDocument();
		expect(
			screen.getByText('Trading suspended — contract paused')
		).toBeInTheDocument();
		expect(
			screen.getByText(/All buy, sell, stake, and transfer actions are disabled/i)
		).toBeInTheDocument();
	});

	it('dismisses banner automatically when contract is unpaused', async () => {
		useContractPausedStore.setState({ status: 'active' });
		render(<ContractPausedBanner />);

		expect(screen.getByRole('alert')).toBeInTheDocument();

		// Simulate contract unpause
		act(() => {
			useContractPausedStore.setState({ status: 'inactive' });
		});

		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});
	});
});
