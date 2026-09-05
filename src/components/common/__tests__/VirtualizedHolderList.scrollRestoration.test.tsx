import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VirtualizedHolderList } from '../VirtualizedHolderList';
import type { HolderRow } from '@/types/holder.types';

vi.mock('@/services/holder.service', () => ({
	holderService: {
		getHolders: vi.fn(),
	},
}));

import { holderService } from '@/services/holder.service';

function generateMockHolders(count: number, startIndex = 0): HolderRow[] {
	return Array.from({ length: count }, (_, i) => ({
		address: `0x${(startIndex + i).toString(16).padStart(40, '0')}`,
		keyCount: Math.floor(Math.random() * 100) + 1,
		totalValue: Math.random() * 10000,
		sharePercentage: 0,
		rank: startIndex + i + 1,
		joinedAt: new Date().toISOString(),
	}));
}

describe('VirtualizedHolderList Scroll Restoration (#757)', () => {
	let queryClient: QueryClient;
	const CREATOR_ID = 'test-creator-123';
	const STORAGE_KEY = `holder-list:${CREATOR_ID}`;
	const CONTAINER_HEIGHT = 600;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});

		vi.clearAllMocks();
		sessionStorage.clear();

		const mockGetHolders = vi.mocked(holderService.getHolders);
		mockGetHolders.mockImplementation(async ({ cursor }) => {
			const page = cursor ? parseInt(cursor) : 0;
			return {
				holders: generateMockHolders(50, page * 50),
				total: 500,
				nextCursor: page < 9 ? (page + 1).toString() : undefined,
				hasMore: page < 9,
			};
		});
	});

	afterEach(() => {
		sessionStorage.clear();
	});

	it('Property 1: Restores scroll position from sessionStorage on mount', async () => {
		const savedScrollTop = 1200; // 25 rows down (25 * 48)
		sessionStorage.setItem(STORAGE_KEY, savedScrollTop.toString());

		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<VirtualizedHolderList creatorId={CREATOR_ID} containerHeight={CONTAINER_HEIGHT} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByText(/Key Holders/)).toBeInTheDocument();
		});

		// Wait for scroll restoration to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		const listContainer = container.querySelector('[style*="height: 600px"]');
		expect(listContainer).not.toBeNull();

		if (listContainer) {
			expect(listContainer.scrollTop).toBe(savedScrollTop);
		}
	});

	it('Property 2: Saves scroll position to sessionStorage on scroll', async () => {
		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<VirtualizedHolderList creatorId={CREATOR_ID} containerHeight={CONTAINER_HEIGHT} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByText(/Key Holders/)).toBeInTheDocument();
		});

		const listContainer = container.querySelector('[style*="height: 600px"]');
		expect(listContainer).not.toBeNull();

		if (listContainer) {
			const scrollPosition = 2400;
			Object.defineProperty(listContainer, 'scrollTop', {
				writable: true,
				configurable: true,
				value: scrollPosition,
			});
			listContainer.dispatchEvent(new Event('scroll', { bubbles: true }));

			// Wait for event to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			const savedScroll = sessionStorage.getItem(STORAGE_KEY);
			expect(savedScroll).toBe(scrollPosition.toString());
		}
	});

	it('Property 3: Does not restore scroll on mount if no saved position exists', async () => {
		// Ensure no saved position
		sessionStorage.removeItem(STORAGE_KEY);

		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<VirtualizedHolderList creatorId={CREATOR_ID} containerHeight={CONTAINER_HEIGHT} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByText(/Key Holders/)).toBeInTheDocument();
		});

		await new Promise(resolve => setTimeout(resolve, 100));

		const listContainer = container.querySelector('[style*="height: 600px"]');
		if (listContainer) {
			expect(listContainer.scrollTop).toBe(0);
		}
	});

	it('Property 4: Uses creator-specific storage key', async () => {
		const creatorId1 = 'creator-1';
		const creatorId2 = 'creator-2';
		const scroll1 = 1000;
		const scroll2 = 2000;

		// Set different scroll positions for different creators
		sessionStorage.setItem(`holder-list:${creatorId1}`, scroll1.toString());
		sessionStorage.setItem(`holder-list:${creatorId2}`, scroll2.toString());

		const { container: container1 } = render(
			<QueryClientProvider client={queryClient}>
				<VirtualizedHolderList creatorId={creatorId1} containerHeight={CONTAINER_HEIGHT} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByText(/Key Holders/)).toBeInTheDocument();
		});

		await new Promise(resolve => setTimeout(resolve, 100));

		const listContainer1 = container1.querySelector('[style*="height: 600px"]');
		if (listContainer1) {
			expect(listContainer1.scrollTop).toBe(scroll1);
		}
	});

	it('Property 5: Persists scroll position across multiple scroll events', async () => {
		const { container } = render(
			<QueryClientProvider client={queryClient}>
				<VirtualizedHolderList creatorId={CREATOR_ID} containerHeight={CONTAINER_HEIGHT} />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(screen.queryByText(/Key Holders/)).toBeInTheDocument();
		});

		const listContainer = container.querySelector('[style*="height: 600px"]');
		expect(listContainer).not.toBeNull();

		if (listContainer) {
			// Simulate multiple scroll events
			const positions = [100, 500, 1200, 2400, 3600];

			for (const position of positions) {
				Object.defineProperty(listContainer, 'scrollTop', {
					writable: true,
					configurable: true,
					value: position,
				});
				listContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
				await new Promise(resolve => setTimeout(resolve, 20));

				const savedScroll = sessionStorage.getItem(STORAGE_KEY);
				expect(savedScroll).toBe(position.toString());
			}
		}
	});
});
