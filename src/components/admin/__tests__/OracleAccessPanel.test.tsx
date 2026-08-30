import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OracleAccessPanel from '@/components/admin/OracleAccessPanel';
import {
	useAddOracleCaller,
	useOracleCallers,
	useRemoveOracleCaller,
} from '@/hooks/useOracleCallers';

vi.mock('@/hooks/useOracleCallers', () => ({
	useOracleCallers: vi.fn(),
	useAddOracleCaller: vi.fn(),
	useRemoveOracleCaller: vi.fn(),
}));

const mockUseOracleCallers = vi.mocked(useOracleCallers);
const mockUseAddOracleCaller = vi.mocked(useAddOracleCaller);
const mockUseRemoveOracleCaller = vi.mocked(useRemoveOracleCaller);

const CALLER_A = 'CAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7DRX';
const CALLER_B = 'CD7757P47P5PT6HX6327J47S6HYO73XN5TV6V2PI47TOLZHD4LQ6ACUD';
// A length-56, C-prefixed string that fails the checksum check.
const INVALID_ADDRESS = `${CALLER_A.slice(0, 55)}B`;

interface SetupOptions {
	callers?: Array<{ address: string; addedAt?: string }>;
	isLoading?: boolean;
	isError?: boolean;
}

function setupHooks({
	callers = [],
	isLoading = false,
	isError = false,
}: SetupOptions = {}) {
	const addMutate = vi.fn(
		(_address: string, options?: { onSuccess?: () => void }) => {
			options?.onSuccess?.();
		}
	);
	const removeMutate = vi.fn(
		(_address: string, options?: { onSuccess?: () => void }) => {
			options?.onSuccess?.();
		}
	);

	mockUseOracleCallers.mockReturnValue({
		data: callers,
		isLoading,
		isError,
		refetch: vi.fn(),
	} as never);
	mockUseAddOracleCaller.mockReturnValue({
		isPending: false,
		mutate: addMutate,
	} as never);
	mockUseRemoveOracleCaller.mockReturnValue({
		isPending: false,
		mutate: removeMutate,
	} as never);

	return { addMutate, removeMutate };
}

describe('OracleAccessPanel (#829)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('lists each approved caller with a Remove button (acceptance #1)', async () => {
		setupHooks({ callers: [{ address: CALLER_A }, { address: CALLER_B }] });

		render(<OracleAccessPanel />);

		expect(screen.getByTestId('oracle-callers-list')).toBeInTheDocument();
		expect(
			screen.getByTestId(`oracle-caller-remove-${CALLER_A}`)
		).toBeInTheDocument();
		expect(
			screen.getByTestId(`oracle-caller-remove-${CALLER_B}`)
		).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(
			2
		);
	});

	it('shows an empty state when no callers are approved (acceptance #5)', () => {
		setupHooks({ callers: [] });

		render(<OracleAccessPanel />);

		expect(screen.getByTestId('oracle-callers-empty')).toBeInTheDocument();
		expect(
			screen.queryByTestId('oracle-callers-list')
		).not.toBeInTheDocument();
	});

	it('shows skeleton rows while the callers list is loading', () => {
		setupHooks({ isLoading: true });

		render(<OracleAccessPanel />);

		expect(screen.getByTestId('oracle-callers-loading')).toBeInTheDocument();
		expect(
			screen.queryByTestId('oracle-callers-empty')
		).not.toBeInTheDocument();
	});

	it('keeps the Add button disabled while the input is empty', () => {
		setupHooks();

		render(<OracleAccessPanel />);

		expect(screen.getByTestId('oracle-caller-add')).toBeDisabled();
	});

	it('shows a validation error and keeps Add disabled for an invalid contract address (acceptance #2)', async () => {
		const user = userEvent.setup();
		const { addMutate } = setupHooks();

		render(<OracleAccessPanel />);

		await user.type(
			screen.getByTestId('oracle-caller-input'),
			INVALID_ADDRESS
		);

		expect(
			screen.getByTestId('oracle-caller-validation-error')
		).toHaveTextContent(/valid Stellar contract address/i);
		expect(screen.getByTestId('oracle-caller-add')).toBeDisabled();
		expect(addMutate).not.toHaveBeenCalled();
	});

	it('clicks Add with an invalid address and surfaces the validation error', async () => {
		const user = userEvent.setup();
		const { addMutate } = setupHooks();

		render(<OracleAccessPanel />);

		await user.type(
			screen.getByTestId('oracle-caller-input'),
			'not-an-address'
		);
		await user.click(screen.getByTestId('oracle-caller-add'));

		expect(
			screen.getByTestId('oracle-caller-validation-error')
		).toBeInTheDocument();
		expect(addMutate).not.toHaveBeenCalled();
	});

	it('submits a validated address, normalizes it, clears the input, and updates the list (acceptance #3)', async () => {
		const user = userEvent.setup();
		const { addMutate } = setupHooks({ callers: [] });

		render(<OracleAccessPanel />);

		await user.type(
			screen.getByTestId('oracle-caller-input'),
			CALLER_A.toLowerCase()
		);

		expect(screen.getByTestId('oracle-caller-add')).toBeEnabled();

		await user.click(screen.getByTestId('oracle-caller-add'));

		expect(addMutate).toHaveBeenCalledWith(
			CALLER_A,
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
		expect(screen.getByTestId('oracle-caller-input')).toHaveValue('');
	});

	it('blocks adding a caller that is already approved', async () => {
		const user = userEvent.setup();
		const { addMutate } = setupHooks({ callers: [{ address: CALLER_A }] });

		render(<OracleAccessPanel />);

		await user.type(screen.getByTestId('oracle-caller-input'), CALLER_A);

		expect(
			screen.getByTestId('oracle-caller-validation-error')
		).toHaveTextContent(/already approved/i);
		expect(screen.getByTestId('oracle-caller-add')).toBeDisabled();
		expect(addMutate).not.toHaveBeenCalled();
	});

	it('removes a caller only after confirmation (acceptance #4)', async () => {
		const user = userEvent.setup();
		const { removeMutate } = setupHooks({
			callers: [{ address: CALLER_A }, { address: CALLER_B }],
		});

		render(<OracleAccessPanel />);

		await user.click(screen.getByTestId(`oracle-caller-remove-${CALLER_A}`));

		const dialog = screen.getByTestId('oracle-caller-remove-dialog');
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveTextContent(CALLER_A);

		await user.click(screen.getByTestId('oracle-caller-confirm-remove'));

		expect(removeMutate).toHaveBeenCalledWith(
			CALLER_A,
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
		await waitFor(() => {
			expect(
				screen.queryByTestId('oracle-caller-remove-dialog')
			).not.toBeInTheDocument();
		});
	});

	it('cancels the confirmation dialog without removing the caller', async () => {
		const user = userEvent.setup();
		const { removeMutate } = setupHooks({ callers: [{ address: CALLER_A }] });

		render(<OracleAccessPanel />);

		await user.click(screen.getByTestId(`oracle-caller-remove-${CALLER_A}`));
		expect(
			screen.getByTestId('oracle-caller-remove-dialog')
		).toBeInTheDocument();

		await user.click(screen.getByTestId('oracle-caller-cancel-remove'));

		await waitFor(() => {
			expect(
				screen.queryByTestId('oracle-caller-remove-dialog')
			).not.toBeInTheDocument();
		});
		expect(removeMutate).not.toHaveBeenCalled();
	});
});
