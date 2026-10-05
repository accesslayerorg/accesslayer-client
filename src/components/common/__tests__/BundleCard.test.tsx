import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import BundleCard from '@/components/common/BundleCard';
import type { MarketplaceBundle } from '@/types/bundles';

const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
const past = new Date(Date.now() - 2 * 86_400_000).toISOString();

function makeBundle(overrides: Partial<MarketplaceBundle> = {}): MarketplaceBundle {
    const keys = overrides.keys ?? [
        {
            creatorId: '1',
            creatorName: 'Alex Rivers',
            creatorHandle: 'arivers',
            quantity: 3,
            individualPriceStroops: 500_000,
        },
        {
            creatorId: '2',
            creatorName: 'Sarah Chen',
            creatorHandle: 'schen_dev',
            quantity: 4,
            individualPriceStroops: 1_200_000,
        },
    ];
    const individualTotalStroops = keys.reduce(
        (sum, k) => sum + k.individualPriceStroops * k.quantity,
        0
    );
    const bundlePriceStroops = overrides.bundlePriceStroops ?? 5_000_000;
    const discountStroops = Math.max(0, individualTotalStroops - bundlePriceStroops);
    const discountPercent =
        individualTotalStroops > 0
            ? Math.round((discountStroops / individualTotalStroops) * 10_000) / 100
            : 0;

    return {
        id: 'bundle-art-starter',
        name: 'Art Collector Starter',
        description: 'A starter bundle.',
        keys,
        bundlePriceStroops,
        individualTotalStroops,
        discountStroops,
        discountPercent,
        expiresAt: future,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

function renderCard(bundle: MarketplaceBundle) {
    return render(
        <MemoryRouter>
            <BundleCard bundle={bundle} />
        </MemoryRouter>
    );
}

describe('BundleCard (issue #981)', () => {
    it('renders the bundle name and total key count', () => {
        renderCard(makeBundle());
        expect(screen.getByRole('heading', { name: 'Art Collector Starter' })).toBeInTheDocument();
        expect(screen.getByText(/7 keys across 2 creators/i)).toBeInTheDocument();
    });

    it('renders the discount percentage for a live bundle', () => {
        renderCard(makeBundle());
        // bundle: 5,000,000 stroops; individual: 3*500,000 + 4*1,200,000 = 6,300,000
        // discount: 1,300,000 / 6,300,000 = ~20.63%
        expect(screen.getByText(/-\d+(\.\d+)?%/)).toBeInTheDocument();
    });

    it('renders a countdown for a live bundle', () => {
        renderCard(makeBundle());
        expect(screen.getByText(/^\d+d \d+h$/)).toBeInTheDocument();
    });

    it('renders the bundle price and the individual total with strikethrough', () => {
        renderCard(makeBundle());
        expect(screen.getByText('0.50 XLM')).toBeInTheDocument();
        // individual total = 6,300,000 stroops = 0.63 XLM
        expect(screen.getByText('0.63 XLM')).toBeInTheDocument();
    });

    it('renders the "Expired" badge and disables navigation for an expired bundle', () => {
        renderCard(makeBundle({ expiresAt: past }));

        const expiredContainer = screen.getByTestId('bundle-card-expired');
        expect(expiredContainer).toHaveAttribute('aria-disabled', 'true');
        // No link role anywhere on the expired card
        expect(within(expiredContainer).queryByRole('link')).not.toBeInTheDocument();
        // And no countdown string, since we're past the expiry
        expect(screen.queryByText(/^\d+d \d+h$/)).not.toBeInTheDocument();
    });

    it('links to the bundle detail page for a live bundle', () => {
        renderCard(makeBundle());
        const link = screen.getByRole('link', { name: /view bundle art collector starter/i });
        expect(link).toHaveAttribute('href', '/bundles/bundle-art-starter');
    });

    it('collapses more than three creators into a "+N more" chip', () => {
        const keys = [
            { creatorId: 'a', creatorName: 'A', creatorHandle: 'a', quantity: 1, individualPriceStroops: 100_000 },
            { creatorId: 'b', creatorName: 'B', creatorHandle: 'b', quantity: 1, individualPriceStroops: 100_000 },
            { creatorId: 'c', creatorName: 'C', creatorHandle: 'c', quantity: 1, individualPriceStroops: 100_000 },
            { creatorId: 'd', creatorName: 'D', creatorHandle: 'd', quantity: 1, individualPriceStroops: 100_000 },
            { creatorId: 'e', creatorName: 'E', creatorHandle: 'e', quantity: 1, individualPriceStroops: 100_000 },
        ];
        renderCard(makeBundle({ keys }));

        expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
});