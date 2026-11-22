import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import AirdropPanel from '../AirdropPanel';
import * as stellarService from '@/services/stellar';

const VALID_ADDR_1 = 'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';
const VALID_ADDR_2 = 'GDZNGW2K34STGYJ32W3A6YV5I6HBLTY3Q3NFXK77F542WTH7ZPV5M74V';

describe('AirdropPanel with federation resolution', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stellarService.clearFederationCache();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('disables submit when federation address is pending resolution', async () => {
		vi.spyOn(
			stellarService.FederationServer,
			'resolve'
		).mockResolvedValueOnce({
			account_id: VALID_ADDR_2,
		});

		render(<AirdropPanel />);

		const textarea = screen.getByLabelText('Airdrop recipient list');
		fireEvent.change(textarea, { target: { value: 'alice*example.com:5' } });

		const submitButton = screen.getByRole('button', {
			name: /submit airdrop/i,
		});
		expect(submitButton).toBeDisabled();

		// Advance timer to resolve
		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByTestId('address-resolved')).toBeInTheDocument();
		expect(submitButton).not.toBeDisabled();
	});

	it('enables submit immediately for raw valid public keys', () => {
		render(<AirdropPanel />);

		const textarea = screen.getByLabelText('Airdrop recipient list');
		fireEvent.change(textarea, { target: { value: `${VALID_ADDR_1}:10` } });

		const submitButton = screen.getByRole('button', {
			name: /submit airdrop/i,
		});
		expect(submitButton).not.toBeDisabled();
	});

	it('keeps submit disabled when resolution fails', async () => {
		vi.spyOn(
			stellarService.FederationServer,
			'resolve'
		).mockRejectedValueOnce(new Error('Request failed with status code 404'));

		render(<AirdropPanel />);

		const textarea = screen.getByLabelText('Airdrop recipient list');
		fireEvent.change(textarea, {
			target: { value: 'unknown*example.com:5' },
		});

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByTestId('address-error')).toHaveTextContent(
			'Federation address not found'
		);
		const submitButton = screen.getByRole('button', {
			name: /submit airdrop/i,
		});
		expect(submitButton).toBeDisabled();
	});
});
