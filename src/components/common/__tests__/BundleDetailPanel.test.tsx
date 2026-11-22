import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import BundleDetailPanel from '@/components/common/BundleDetailPanel';
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

function renderPanel(bundle: MarketplaceBundle, props: Partial<React.ComponentProps<typeof BundleDetailPanel>> = {}) {
    return render(
        <MemoryRouter>
            <BundleDetailPanel
                bundle={bundle}
                onBuy={vi.fn()}
                isBuying={false}
                buyError={null}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('BundleDetailPanel (issue #981)', () => {
    it('renders the bundle name and description', () => {
        renderPanel(makeBundle());
        expect(screen.getByRole('heading', { level: 1, name: 'Art Collector Starter' })).toBeInTheDocument();
        expect(screen.getByText('A starter bundle.')).toBeInTheDocument();
    });

    it('renders a price breakdown comparing bundle vs individual total', () => {
        renderPanel(makeBundle());
        // Individual total: 6,300,000 stroops = 0.63 XLM
        expect(screen.getByText('0.63 XLM')).toBeInTheDocument();
        // Bundle price: 5,000,000 stroops = 0.50 XLM — appears in the "You pay" row + the button
        expect(screen.getAllByText(/0\.50 XLM/).length).toBeGreaterThan(0);
        // Discount line: 1,300,000 stroops = 0.13 XLM, with the percent
        expect(screen.getByText(/−0\.13 XLM/)).toBeInTheDocument();
    });

    it('renders the full key list, one row per key', () => {
        renderPanel(makeBundle());
        expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
        expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
        expect(screen.getByText('3 × 0.05 XLM')).toBeInTheDocument();
        expect(screen.getByText('4 × 0.12 XLM')).toBeInTheDocument();
    });

    it('calls onBuy when the buy button is clicked', async () => {
        const onBuy = vi.fn();
        renderPanel(makeBundle(), { onBuy });
        await userEvent.click(screen.getByRole('button', { name: /buy bundle for 0\.50 xlm/i }));
        expect(onBuy).toHaveBeenCalledTimes(1);
    });

    it('renders a disabled "Bundle expired" button for an expired bundle', () => {
        renderPanel(makeBundle({ expiresAt: past }));
        const button = screen.getByRole('button', { name: /bundle expired/i });
        expect(button).toBeDisabled();
    });

    it('renders the buy error message when buyError is set', () => {
        renderPanel(makeBundle(), { buyError: 'Transaction rejected' });
        expect(screen.getByRole('alert')).toHaveTextContent('Transaction rejected');
    });
});