import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import KeyDeprecationBanner from '@/components/common/KeyDeprecationBanner';
import type { Course } from '@/services/course.service';
import { courseService } from '@/services/course.service';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getKeyBuyback: vi.fn(),
		},
	};
});

const mockGetKeyBuyback = vi.mocked(courseService.getKeyBuyback);

const baseCreator: Course = {
	id: 'creator-dep-1',
	title: 'Luna Starlight',
	description: 'Top crypto artist',
	price: 0.25,
	priceStroops: 2_500_000,
	category: 'Art',
	level: 'BEGINNER',
	instructorId: 'luna',
	deprecated: false,
};

describe('KeyDeprecationBanner (#923)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetKeyBuyback.mockReset();
		mockGetKeyBuyback.mockResolvedValue({
			keyId: 'creator-dep-1',
			deprecated: true,
			buybackPriceStroops: 2_500_000,
			expiryDate: '2026-12-31T23:59:59Z',
			terms: 'Guaranteed settlement at 0.25 XLM',
			isActive: true,
		});
	});

	const renderBanner = (props: Partial<React.ComponentProps<typeof KeyDeprecationBanner>> = {}) => {
		const mergedProps = {
			creator: { ...baseCreator, deprecated: true, ...props.creator },
			userAddress: 'GWALLET123',
			holdingsCount: 5,
			onInitiateBuyback: vi.fn(),
			...props,
		};

		return {
			...render(
				<QueryClientProvider client={queryClient}>
					<KeyDeprecationBanner {...mergedProps} />
				</QueryClientProvider>
			),
			props: mergedProps,
		};
	};

	it('returns null and does not render when key is not deprecated', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<KeyDeprecationBanner creator={{ ...baseCreator, deprecated: false }} />
			</QueryClientProvider>
		);

		expect(screen.queryByTestId('key-deprecation-banner')).not.toBeInTheDocument();
	});

	it('renders banner when key is deprecated', () => {
		renderBanner();
		expect(screen.getByTestId('key-deprecation-banner')).toBeInTheDocument();
		expect(screen.getByText('Key Deprecated')).toBeInTheDocument();
	});

	it('displays contract buyback price and expiry date once loaded', async () => {
		mockGetKeyBuyback.mockResolvedValue({
			keyId: 'creator-dep-1',
			deprecated: true,
			buybackPriceStroops: 3_000_000,
			expiryDate: '2026-11-15T12:00:00Z',
			terms: 'Guaranteed settlement at 0.3 XLM',
			isActive: true,
		});

		renderBanner();

		expect(
			await screen.findByText('0.3 XLM')
		).toBeInTheDocument();
		expect(screen.getByTestId('buyback-price')).toHaveTextContent('0.3 XLM');
		expect(screen.getByTestId('buyback-expiry')).toBeInTheDocument();
	});

	it('renders custom deprecationReason when provided', () => {
		renderBanner({
			creator: {
				...baseCreator,
				deprecated: true,
				deprecationReason: 'Creator migrated to new multi-token contract.',
			},
		});

		expect(
			screen.getByText('Creator migrated to new multi-token contract.')
		).toBeInTheDocument();
	});

	it('enables Initiate Buyback button when user holds keys and calls onInitiateBuyback on click', () => {
		const onInitiate = vi.fn();
		renderBanner({
			holdingsCount: 8,
			onInitiateBuyback: onInitiate,
		});

		const btn = screen.getByTestId('initiate-buyback-button');
		expect(btn).toBeEnabled();
		expect(screen.getByText(/Holding 8 keys/i)).toBeInTheDocument();

		fireEvent.click(btn);
		expect(onInitiate).toHaveBeenCalledTimes(1);
	});

	it('disables Initiate Buyback button when user holds 0 keys', () => {
		renderBanner({
			holdingsCount: 0,
		});

		const btn = screen.getByTestId('initiate-buyback-button');
		expect(btn).toBeDisabled();
		expect(btn).toHaveTextContent('No Keys Held');
	});

	it('displays settlement receipt banner when recentSettlement is provided', () => {
		renderBanner({
			holdingsCount: 0,
			recentSettlement: {
				txHash: '0xabc123',
				creatorId: 'creator-dep-1',
				quantity: 5,
				buybackPriceStroops: 2_500_000,
				totalPayoutStroops: 12_500_000,
				settledAt: new Date().toISOString(),
			},
		});

		expect(
			screen.getByText(/Settlement confirmed! Redeemed 5 keys for 1.25 XLM/i)
		).toBeInTheDocument();
	});
});
