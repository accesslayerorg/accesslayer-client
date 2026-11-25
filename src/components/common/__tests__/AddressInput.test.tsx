import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AddressInput from '../AddressInput';
import * as stellarService from '@/services/stellar';

const VALID_ACCOUNT_ID =
	'GB5XVAABEQMY63WTHDQ5RXADGYF345VWMNPTN2GFUDZT57D57ZQTJ7PS';

describe('AddressInput', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stellarService.clearFederationCache();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders with placeholder and value', () => {
		render(
			<AddressInput
				value="test"
				placeholder="Enter address"
				onChange={() => {}}
			/>
		);

		const input = screen.getByPlaceholderText('Enter address');
		expect(input).toBeInTheDocument();
		expect(input).toHaveValue('test');
	});

	it('displays resolved address truncated beneath the field for valid federation address', async () => {
		vi.spyOn(
			stellarService.FederationServer,
			'resolve'
		).mockResolvedValueOnce({
			account_id: VALID_ACCOUNT_ID,
		});

		const onResolved = vi.fn();
		render(
			<AddressInput
				value="alice*example.com"
				onChange={() => {}}
				onResolved={onResolved}
			/>
		);

		// While resolving
		expect(screen.getByTestId('address-resolving')).toBeInTheDocument();

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		const resolvedElement = screen.getByTestId('address-resolved');
		expect(resolvedElement).toBeInTheDocument();
		expect(resolvedElement).toHaveTextContent('Resolved: GB5XVA…QTJ7PS');
		expect(onResolved).toHaveBeenCalledWith(VALID_ACCOUNT_ID);
	});

	it('bypasses resolution for raw public keys and does not show resolved text', () => {
		const spy = vi.spyOn(stellarService.FederationServer, 'resolve');
		const onResolved = vi.fn();

		render(
			<AddressInput
				value={VALID_ACCOUNT_ID}
				onChange={() => {}}
				onResolved={onResolved}
			/>
		);

		expect(screen.queryByTestId('address-resolving')).not.toBeInTheDocument();
		expect(screen.queryByTestId('address-resolved')).not.toBeInTheDocument();
		expect(spy).not.toHaveBeenCalled();
		expect(onResolved).toHaveBeenCalledWith(VALID_ACCOUNT_ID);
	});

	it('displays distinct error message when address is not found', async () => {
		vi.spyOn(
			stellarService.FederationServer,
			'resolve'
		).mockRejectedValueOnce({
			message: 'Request failed with status code 404',
			response: { status: 404 },
		});

		render(<AddressInput value="unknown*example.com" onChange={() => {}} />);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		const errorElement = screen.getByTestId('address-error');
		expect(errorElement).toBeInTheDocument();
		expect(errorElement).toHaveTextContent('Federation address not found');
	});

	it('displays distinct error message for invalid domain', async () => {
		render(<AddressInput value="bob*invalid..domain" onChange={() => {}} />);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		const errorElement = screen.getByTestId('address-error');
		expect(errorElement).toBeInTheDocument();
		expect(errorElement).toHaveTextContent('Invalid federation domain');
	});

	it('displays distinct error message on network failure', async () => {
		vi.spyOn(
			stellarService.FederationServer,
			'resolve'
		).mockRejectedValueOnce(new Error('fetch failed'));

		render(<AddressInput value="bob*example.com" onChange={() => {}} />);

		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		const errorElement = screen.getByTestId('address-error');
		expect(errorElement).toBeInTheDocument();
		expect(errorElement).toHaveTextContent('Network error resolving address');
	});
});
