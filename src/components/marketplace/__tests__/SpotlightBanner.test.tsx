import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SpotlightBanner from '@/components/marketplace/SpotlightBanner';
import { useActiveSpotlight } from '@/hooks/useSpotlightAuction';
import type { ActiveSpotlight } from '@/services/spotlightAuction.service';

vi.mock('@/hooks/useSpotlightAuction', () => ({
	useActiveSpotlight: vi.fn(),
}));

const mockUseActiveSpotlight = vi.mocked(useActiveSpotlight);
const NOW = Date.parse('2026-10-20T12:00:00Z');

function makeSpotlight(overrides: Partial<ActiveSpotlight> = {}): ActiveSpotlight {
	return {
		creatorId: 'creator-42',
		keyName: 'NOVA',
		creatorName: 'Nova Studio',
		creatorHandle: '@nova',
		priceXlm: 12.5,
		volume24hXlm: 15_300,
		holderCount: 1240,
		endsAt: new Date(NOW + 2 * 60 * 60 * 1000 + 5_000).toISOString(),
		...overrides,
	};
}

function mockSpotlight(data: ActiveSpotlight | null | undefined) {
	mockUseActiveSpotlight.mockReturnValue({
		data,
	} as unknown as ReturnType<typeof useActiveSpotlight>);
}

function renderBanner() {
	return render(
		<MemoryRouter>
			<SpotlightBanner />
		</MemoryRouter>
	);
}

describe('SpotlightBanner', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the spotlighted key stats', () => {
		mockSpotlight(makeSpotlight());
		renderBanner();

		expect(screen.getByTestId('spotlight-key-name')).toHaveTextContent('NOVA');
		expect(screen.getByTestId('spotlight-creator')).toHaveTextContent('by Nova Studio');
		expect(screen.getByTestId('spotlight-creator')).toHaveTextContent('nova');
		expect(screen.getByTestId('spotlight-price')).toHaveTextContent('12.50 XLM');
		expect(screen.getByTestId('spotlight-volume')).toHaveTextContent('15.3K XLM');
		expect(screen.getByTestId('spotlight-holders')).toHaveTextContent('1.2K');
	});

	it('shows the default sponsor label, or the API-provided one', () => {
		mockSpotlight(makeSpotlight());
		const { unmount } = renderBanner();
		expect(screen.getByTestId('spotlight-sponsor-label')).toHaveTextContent('Sponsored');
		unmount();

		mockSpotlight(makeSpotlight({ sponsorLabel: 'Paid placement' }));
		renderBanner();
		expect(screen.getByTestId('spotlight-sponsor-label')).toHaveTextContent(
			'Paid placement'
		);
	});

	it('links Buy Now to the key detail page', () => {
		mockSpotlight(makeSpotlight());
		renderBanner();
		expect(screen.getByTestId('spotlight-buy-now')).toHaveAttribute(
			'href',
			'/creator/creator-42'
		);
	});

	it('updates the countdown every second', () => {
		mockSpotlight(makeSpotlight());
		renderBanner();
		expect(screen.getByTestId('spotlight-countdown')).toHaveTextContent('2h 0m 5s');

		act(() => {
			vi.advanceTimersByTime(3_000);
		});
		expect(screen.getByTestId('spotlight-countdown')).toHaveTextContent('2h 0m 2s');
	});

	it('hides itself once the spotlight ends', () => {
		mockSpotlight(makeSpotlight({ endsAt: new Date(NOW + 2_000).toISOString() }));
		renderBanner();
		expect(screen.getByTestId('spotlight-banner')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(3_000);
		});
		expect(screen.queryByTestId('spotlight-banner')).not.toBeInTheDocument();
	});

	it('renders nothing when there is no active spotlight', () => {
		mockSpotlight(null);
		const { container } = renderBanner();
		expect(container).toBeEmptyDOMElement();
	});
});
