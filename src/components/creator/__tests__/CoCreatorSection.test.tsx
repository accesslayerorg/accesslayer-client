import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CoCreatorSection from '../CoCreatorSection';
import { isValidStellarAddress, isValidBps } from '@/utils/coCreator.utils';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('@/services/course.service', () => ({
	courseService: {
		setCoCreator: vi.fn().mockResolvedValue({
			id: 'course_123',
			coCreatorAddress: 'GA7QW3L7Y54N4P5O3G6J8K9L0M1N2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C',
			coCreatorSplitBps: 2500,
		}),
	},
}));

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('Stellar Address and BPS validation helpers', () => {
	it('validates Stellar G-addresses correctly', () => {
		const validAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';
		expect(isValidStellarAddress(validAddress)).toBe(true);

		expect(isValidStellarAddress('invalid_address')).toBe(false);
		expect(isValidStellarAddress('0x1234567890abcdef')).toBe(false);
		expect(isValidStellarAddress('G123')).toBe(false);
	});

	it('validates basis points range correctly', () => {
		expect(isValidBps(2500)).toBe(true);
		expect(isValidBps(1)).toBe(true);
		expect(isValidBps(10000)).toBe(true);

		expect(isValidBps(0)).toBe(false);
		expect(isValidBps(10001)).toBe(false);
		expect(isValidBps(-500)).toBe(false);
		expect(isValidBps(25.5)).toBe(false);
	});
});

describe('CoCreatorSection Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders "No co-creator configured" empty state when no split is configured', () => {
		render(<CoCreatorSection courseId="course_123" />, {
			wrapper: makeWrapper(),
		});

		expect(screen.getByTestId('cocreator-empty-state')).toBeInTheDocument();
		expect(screen.getByText('No co-creator configured')).toBeInTheDocument();
		expect(screen.getByTestId('set-cocreator-button')).toHaveTextContent(
			'Set Co-Creator'
		);
	});

	it('renders truncated address, split percentage, and stat cards when co-creator is set', () => {
		const coCreatorAddress =
			'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';
		render(
			<CoCreatorSection
				courseId="course_123"
				coCreatorAddress={coCreatorAddress}
				coCreatorSplitBps={2500}
				totalPaidToCoCreator={150000000} // 15 XLM
				totalPaidToCreator={450000000} // 45 XLM
			/>,
			{ wrapper: makeWrapper() }
		);

		expect(screen.queryByTestId('cocreator-empty-state')).not.toBeInTheDocument();
		expect(screen.getByTestId('cocreator-details')).toBeInTheDocument();

		expect(screen.getByTestId('cocreator-split-display')).toHaveTextContent('25%');
		expect(screen.getByTestId('total-paid-cocreator')).toHaveTextContent(/15.*XLM/);
		expect(screen.getByTestId('total-paid-creator')).toHaveTextContent(/45.*XLM/);
		expect(screen.getByTestId('set-cocreator-button')).toHaveTextContent(
			'Edit Co-Creator'
		);
	});

	it('opens the configuration modal when Set Co-Creator is clicked', async () => {
		const user = userEvent.setup();
		render(<CoCreatorSection courseId="course_123" />, {
			wrapper: makeWrapper(),
		});

		await user.click(screen.getByTestId('set-cocreator-button'));

		expect(screen.getByTestId('set-cocreator-modal')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: /configure co-creator split/i })
		).toBeInTheDocument();
	});

	it('shows error messages when submitting invalid Stellar address or BPS', async () => {
		const user = userEvent.setup();
		render(<CoCreatorSection courseId="course_123" />, {
			wrapper: makeWrapper(),
		});

		await user.click(screen.getByTestId('set-cocreator-button'));

		const addressInput = screen.getByTestId('cocreator-address-input');
		const bpsInput = screen.getByTestId('cocreator-bps-input');
		const submitBtn = screen.getByTestId('submit-cocreator-button');

		// Type invalid address and invalid BPS
		await user.type(addressInput, 'invalid-address');
		await user.type(bpsInput, '20000');
		await user.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByTestId('cocreator-address-error')).toBeInTheDocument();
			expect(screen.getByTestId('cocreator-bps-error')).toBeInTheDocument();
		});
	});
});
