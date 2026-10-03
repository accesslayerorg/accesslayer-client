import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatorKeyDashboard } from '../CreatorKeyDashboard';
import { useCreatorKeyStore } from '@/hooks/useCreatorKeyStore';
import { useTimelockStore } from '@/hooks/useTimelockStore';

describe('CreatorKeyDashboard (#965)', () => {
	const testCreatorAddress = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
	const emptyCreatorAddress = '0x2222222222222222222222222222222222222222';

	beforeEach(() => {
		useCreatorKeyStore.getState().reset();
		useTimelockStore.getState().reset();
	});

	it('renders unconnected state when wallet is not connected', () => {
		render(<CreatorKeyDashboard />);

		expect(screen.getByTestId('dashboard-unconnected-state')).toBeInTheDocument();
		expect(screen.getByText('Connect Creator Wallet')).toBeInTheDocument();
	});

	it('renders empty state when connected wallet has no deployed keys', async () => {
		render(<CreatorKeyDashboard creatorAddress={emptyCreatorAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument();
		});
		expect(screen.getByText('No Deployed Keys Found')).toBeInTheDocument();
	});

	it('renders deployed keys and per-key analytics overview', async () => {
		render(<CreatorKeyDashboard creatorAddress={testCreatorAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('key-card-key-dev-1')).toBeInTheDocument();
			expect(screen.getByTestId('key-card-key-dev-2')).toBeInTheDocument();
		});

		// Check selected key analytics
		expect(screen.getByTestId('stat-holders')).toHaveTextContent('142');
		expect(screen.getByTestId('stat-volume')).toHaveTextContent(/48,200\s+XLM/i);
		expect(screen.getByTestId('stat-trades')).toHaveTextContent('1,240');
		expect(screen.getByTestId('stat-price')).toHaveTextContent(/12.5\s+XLM/i);
	});

	it('switches selected key and updates analytics', async () => {
		render(<CreatorKeyDashboard creatorAddress={testCreatorAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('key-card-key-dev-2')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('key-card-key-dev-2'));

		await waitFor(() => {
			expect(screen.getByTestId('stat-holders')).toHaveTextContent('89');
			expect(screen.getByTestId('stat-volume')).toHaveTextContent(/27,600\s+XLM/i);
			expect(screen.getByTestId('stat-trades')).toHaveTextContent('630');
			expect(screen.getByTestId('stat-price')).toHaveTextContent(/35\s+XLM/i);
		});
	});

	it('validates metadata and submits updates on-chain', async () => {
		render(<CreatorKeyDashboard creatorAddress={testCreatorAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('tab-metadata')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('tab-metadata'));

		const nameInput = screen.getByLabelText(/Key Name \*/i);
		expect(nameInput).toHaveValue('Rivers Access Key');

		// Clear name -> triggers validation error
		fireEvent.change(nameInput, { target: { value: '' } });
		fireEvent.click(screen.getByTestId('btn-save-metadata'));

		await waitFor(() => {
			expect(screen.getByTestId('err-meta-name')).toBeInTheDocument();
		});

		// Set valid name
		fireEvent.change(nameInput, { target: { value: 'Rivers Ultra Pass' } });
		fireEvent.click(screen.getByTestId('btn-save-metadata'));

		await waitFor(() => {
			expect(screen.getByTestId('dashboard-tx-banner')).toHaveTextContent(/Metadata successfully updated on-chain/i);
		});
	});

	it('validates config parameters and displays timelock notice on sensitive updates', async () => {
		render(<CreatorKeyDashboard creatorAddress={testCreatorAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('tab-config')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('tab-config'));

		const spreadInput = screen.getByTestId('input-config-spread');
		const capInput = screen.getByTestId('input-config-cap');

		// Out of range validation (e.g. spread 2500 bps > 1500 max)
		fireEvent.change(spreadInput, { target: { value: '2500' } });
		fireEvent.click(screen.getByTestId('btn-save-config'));

		await waitFor(() => {
			expect(screen.getByTestId('err-config-spread')).toBeInTheDocument();
		});

		// Valid values that trigger timelock notice (e.g. spread increased to 900 bps, holding cap lowered to 25)
		fireEvent.change(spreadInput, { target: { value: '900' } });
		fireEvent.change(capInput, { target: { value: '25' } });
		fireEvent.click(screen.getByTestId('btn-save-config'));

		await waitFor(() => {
			expect(screen.getByTestId('timelock-notice-banner')).toBeInTheDocument();
			expect(screen.getByText(/Timelock Notice \(24h Execution Delay Required\)/i)).toBeInTheDocument();
		});
	});
});
