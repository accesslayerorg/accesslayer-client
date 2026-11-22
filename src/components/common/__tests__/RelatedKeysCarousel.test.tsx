import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import RelatedKeysCarousel from '../RelatedKeysCarousel';
import type { RelatedKey } from '@/services/relatedKeys.service';
import { relatedKeysService } from '@/services/relatedKeys.service';

const track = vi.fn();

vi.mock('@/hooks/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@/services/relatedKeys.service', () => ({
	relatedKeysService: { getRelatedKeys: vi.fn() },
}));

const getRelatedKeys = vi.mocked(relatedKeysService.getRelatedKeys);

const items: RelatedKey[] = [
	{
		id: 'key-a',
		handle: '@Alice',
		name: 'Alice',
		priceStroops: 12_500_000,
		change24h: 12.5,
		holderOverlapPct: 40,
	},
	{
		id: 'key-b',
		handle: 'bob',
		name: 'Bob',
		priceStroops: 20_000_000,
		change24h: -3,
	},
];

function renderCarousel() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={['/creator/source']}>
				<Routes>
					<Route
						path="/creator/:id"
						element={<RelatedKeysCarousel keyId="source" />}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('RelatedKeysCarousel (#1318)', () => {
	beforeEach(() => {
		track.mockReset();
		getRelatedKeys.mockReset();
		Element.prototype.scrollBy = vi.fn();
	});

	it('shows a skeleton while loading', () => {
		getRelatedKeys.mockReturnValue(new Promise(() => {}));
		renderCarousel();

		expect(screen.getByTestId('related-keys-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('key-mini-card')).not.toBeInTheDocument();
	});

	it('renders related keys with price and change values', async () => {
		getRelatedKeys.mockResolvedValue(items);
		renderCarousel();

		const cards = await screen.findAllByTestId('key-mini-card');
		expect(cards).toHaveLength(2);
		expect(getRelatedKeys).toHaveBeenCalledWith('source', 12);

		expect(screen.getAllByTestId('key-mini-card-handle')[0]).toHaveTextContent(
			'@alice'
		);
		expect(screen.getAllByTestId('key-mini-card-price')[0]).toHaveTextContent(
			'1.25 XLM'
		);
		expect(cards[0]).toHaveTextContent('+12.5%');
		expect(cards[1]).toHaveTextContent('2 XLM');
		expect(cards[1]).toHaveTextContent('-3%');
		expect(screen.getByTestId('key-mini-card-overlap')).toHaveTextContent(
			'40% shared holders'
		);
		expect(
			screen.queryByTestId('related-keys-skeleton')
		).not.toBeInTheDocument();
	});

	it('hides the section when the response is empty', async () => {
		getRelatedKeys.mockResolvedValue([]);
		renderCarousel();

		await waitFor(() =>
			expect(
				screen.queryByTestId('related-keys-skeleton')
			).not.toBeInTheDocument()
		);
		expect(screen.queryByTestId('related-keys-carousel')).not.toBeInTheDocument();
	});

	it('hides the section silently on error', async () => {
		getRelatedKeys.mockRejectedValue(new Error('boom'));
		renderCarousel();

		await waitFor(() =>
			expect(
				screen.queryByTestId('related-keys-skeleton')
			).not.toBeInTheDocument()
		);
		expect(screen.queryByTestId('related-keys-carousel')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('scrolls with the previous and next buttons', async () => {
		getRelatedKeys.mockResolvedValue(items);
		renderCarousel();
		await screen.findAllByTestId('key-mini-card');

		fireEvent.click(screen.getByRole('button', { name: 'Next related keys' }));
		expect(Element.prototype.scrollBy).toHaveBeenLastCalledWith(
			expect.objectContaining({ left: expect.any(Number) })
		);
		const nextLeft = vi.mocked(Element.prototype.scrollBy).mock
			.calls[0][0] as ScrollToOptions;
		expect(nextLeft.left).toBeGreaterThan(0);

		fireEvent.click(
			screen.getByRole('button', { name: 'Previous related keys' })
		);
		const prevLeft = vi.mocked(Element.prototype.scrollBy).mock
			.calls[1][0] as ScrollToOptions;
		expect(prevLeft.left).toBeLessThan(0);
	});

	it('scrolls with the arrow keys', async () => {
		getRelatedKeys.mockResolvedValue(items);
		renderCarousel();
		await screen.findAllByTestId('key-mini-card');
		const track = screen.getByTestId('related-keys-track');

		fireEvent.keyDown(track, { key: 'ArrowRight' });
		fireEvent.keyDown(track, { key: 'ArrowLeft' });

		const calls = vi.mocked(Element.prototype.scrollBy).mock.calls;
		expect(calls).toHaveLength(2);
		expect((calls[0][0] as ScrollToOptions).left).toBeGreaterThan(0);
		expect((calls[1][0] as ScrollToOptions).left).toBeLessThan(0);
	});

	it('tracks card clicks with the source key id and links to the key page', async () => {
		getRelatedKeys.mockResolvedValue(items);
		renderCarousel();
		const cards = await screen.findAllByTestId('key-mini-card');

		expect(cards[1]).toHaveAttribute('href', '/creator/key-b');
		fireEvent.click(cards[1]);

		expect(track).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'UserAction',
				action: 'related_key_click',
				metadata: { sourceKeyId: 'source', relatedKeyId: 'key-b' },
			})
		);
	});
});
