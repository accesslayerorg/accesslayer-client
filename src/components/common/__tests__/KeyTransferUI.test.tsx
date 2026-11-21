import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import KeyTransferUI from '../KeyTransferUI';
import * as stellarService from '@/services/stellar';

const VALID_ADDR = 'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';

describe('KeyTransferUI', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stellarService.clearFederationCache();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('disables submit until federation address resolves to a valid account', async () => {
		vi.spyOn(stellarService.FederationServer, 'resolve').mockResolvedValue({
			account_id: VALID_ADDR,
		});

		render(
			<KeyTransferUI keyId="key-1" keyName="Master Key" currentOwner="You" />
		);

		// Open transfer form
		const initiateBtn = screen.getByRole('button', {
			name: /initiate transfer/i,
		});
		fireEvent.click(initiateBtn);

		const addressInput = screen.getByLabelText(/recipient address/i);
		const submitBtn = screen.getByRole('button', {
			name: /send transfer request/i,
		});

		// Initially submit disabled
		expect(submitBtn).toBeDisabled();

		// Enter federation address
		fireEvent.change(addressInput, {
			target: { value: 'alice*example.com' },
		});

		// Submit is still disabled while resolving
		expect(submitBtn).toBeDisabled();

		// Advance timer past debounce to resolve
		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByTestId('address-resolved')).toBeInTheDocument();
		expect(submitBtn).not.toBeDisabled();
	});

	it('enables submit for raw valid public key without resolution', async () => {
		render(
			<KeyTransferUI keyId="key-1" keyName="Master Key" currentOwner="You" />
		);

		const initiateBtn = screen.getByRole('button', {
			name: /initiate transfer/i,
		});
		fireEvent.click(initiateBtn);

		const addressInput = screen.getByLabelText(/recipient address/i);
		const submitBtn = screen.getByRole('button', {
			name: /send transfer request/i,
		});

		fireEvent.change(addressInput, { target: { value: VALID_ADDR } });

		expect(submitBtn).not.toBeDisabled();
	});
});
