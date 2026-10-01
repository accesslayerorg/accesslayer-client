import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import KeyBuybackModal from '@/components/common/KeyBuybackModal';
import * as keyBuybackHooks from '@/hooks/useKeyBuyback';

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

describe('KeyBuybackModal (#923)', () => {
	let queryClient: QueryClient;
	const mockMutateAsync = vi.fn();

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		});
		vi.clearAllMocks();

		// Mock the mutation hook
		vi.spyOn(keyBuybackHooks, 'useSubmitKeyBuybackMutation').mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		} as unknown as ReturnType<
			typeof keyBuybackHooks.useSubmitKeyBuybackMutation
		>);

		// Mock the query hook
		vi.spyOn(keyBuybackHooks, 'useKeyBuyback').mockReturnValue({
			data: {
				keyId: 'creator-dep-1',
				deprecated: true,
				buybackPriceStroops: 2_500_000,
				expiryDate: '2026-12-31T23:59:59Z',
				terms: 'Contract guaranteed buyback terms.',
				isActive: true,
			},
			isLoading: false,
		} as unknown as ReturnType<typeof keyBuybackHooks.useKeyBuyback>);
	});

	const renderModal = (
		props: Partial<React.ComponentProps<typeof KeyBuybackModal>> = {}
	) => {
		const defaultProps = {
			open: true,
			onOpenChange: vi.fn(),
			creatorId: 'creator-dep-1',
			creatorTitle: 'Maya Lin',
			holdingsCount: 10,
			buybackPriceStroops: 2_500_000,
			expiryDate: '2026-12-31T23:59:59Z',
			terms: 'Guaranteed settlement at 0.25 XLM per key.',
			userAddress: 'GWALLET123',
			onSettled: vi.fn(),
			...props,
		};

		return {
			...render(
				<QueryClientProvider client={queryClient}>
					<KeyBuybackModal {...defaultProps} />
				</QueryClientProvider>
			),
			props: defaultProps,
		};
	};

	it('renders confirmation modal with correct breakdown and terms', () => {
		renderModal();

		expect(screen.getByTestId('key-buyback-modal')).toBeInTheDocument();
		expect(screen.getByText('Confirm Key Buyback')).toBeInTheDocument();
		expect(screen.getByText('10')).toBeInTheDocument();
		expect(screen.getByText('0.25 XLM')).toBeInTheDocument();
		expect(screen.getByText('2.50 XLM')).toBeInTheDocument();
		expect(screen.getByTestId('buyback-terms')).toHaveTextContent(
			'Guaranteed settlement at 0.25 XLM per key.'
		);
		expect(screen.getByTestId('confirm-buyback-button')).toBeEnabled();
	});

	it('calls onOpenChange(false) when Cancel is clicked', () => {
		const onOpenChange = vi.fn();
		renderModal({ onOpenChange });

		fireEvent.click(screen.getByTestId('cancel-buyback-button'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('submits buyback on confirm and displays post-buyback settlement receipt', async () => {
		const onSettled = vi.fn();
		const mockReceipt = {
			txHash: '0x1234567890abcdef1234567890abcdef',
			creatorId: 'creator-dep-1',
			quantity: 10,
			buybackPriceStroops: 2_500_000,
			totalPayoutStroops: 25_000_000,
			settledAt: '2026-09-25T12:00:00Z',
		};

		mockMutateAsync.mockResolvedValue(mockReceipt);

		const { props } = renderModal({ onSettled });

		fireEvent.click(screen.getByTestId('confirm-buyback-button'));

		expect(mockMutateAsync).toHaveBeenCalledWith({
			creatorId: 'creator-dep-1',
			quantity: 10,
			buybackPriceStroops: 2_500_000,
		});

		await waitFor(() => {
			expect(
				screen.getByTestId('buyback-settlement-confirmed')
			).toBeInTheDocument();
		});

		// Check settlement receipt
		const receipt = screen.getByTestId('buyback-settlement-receipt');
		expect(receipt).toBeInTheDocument();
		expect(receipt).toHaveTextContent('2.50 XLM');
		expect(receipt).toHaveTextContent('10');
		expect(receipt).toHaveTextContent('0.25 XLM');
		expect(receipt).toHaveTextContent(mockReceipt.txHash);
		expect(receipt).toHaveTextContent(
			'Position cleared. 0 keys remaining in your wallet.'
		);

		expect(onSettled).toHaveBeenCalledWith(mockReceipt);

		// Test Done button closes modal
		fireEvent.click(screen.getByTestId('buyback-done-button'));
		expect(props.onOpenChange).toHaveBeenCalledWith(false);
	});
});
