import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';

vi.mock('@/hooks/useWallet', () => ({
    useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useWalletHoldings: () => ({ data: [] }),
}));

vi.mock('@/services/course.service', () => ({
    courseService: {
        getCourses: vi.fn(),
    },
}));

vi.mock('@/hooks/useNetworkMismatch', () => ({
    useNetworkMismatch: () => ({
        isMismatch: false,
        expectedChainName: 'Stellar Testnet',
    }),
}));

vi.mock('@/hooks/useStaleData', () => ({
    useStaleData: () => ({
        stale: false,
        ageMs: 0,
        msUntilStale: 60000,
        revalidate: vi.fn(),
    }),
}));

vi.mock('@/components/common/StellarConnectionQualityBadge', async () => {
    const React = await import('react');
    return {
        default: () => React.createElement('div', { role: 'status' }, 'RPC good'),
    };
});

vi.mock('@/components/common/CreatorCard', async () => {
    const React = await import('react');
    return {
        default: ({ creator }: { creator: { title: string } }) =>
            React.createElement('article', { 'aria-label': `Creator ${creator.title}` }, creator.title),
    };
});

vi.mock('framer-motion', async () => {
    const React = await import('react');
    type MotionDivProps = { layout?: boolean; transition?: unknown; children?: React.ReactNode };
    return {
        AnimatePresence: ({ children }: { children: React.ReactNode }) =>
            React.createElement(React.Fragment, null, children),
        LayoutGroup: ({ children }: { children: React.ReactNode }) =>
            React.createElement(React.Fragment, null, children),
        motion: {
            div: ({ layout, transition, children, ...props }: MotionDivProps) => {
                void layout; void transition;
                return React.createElement('div', props, children);
            },
            h1: (props: Record<string, unknown>) => React.createElement('h1', props),
            button: (props: Record<string, unknown>) => React.createElement('button', props),
        },
    };
});

const mockMatchMedia = () => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

const mockGetCourses = vi.mocked(courseService.getCourses);

const seededCreator: Course = {
    id: 'arivers',
    title: 'Alex Rivers',
    description: 'Digital Artist and Illustrator',
    price: 0.05,
    priceStroops: 500000,
    creatorShareSupply: 120,
    instructorId: 'arivers',
    category: 'Art',
    level: 'BEGINNER',
    isVerified: true,
};

describe('Creator Profile Page - Integration', () => {
    beforeEach(() => {
        mockMatchMedia();
        window.localStorage.clear();
        window.sessionStorage.clear();
        mockGetCourses.mockReset();
    });

    it('renders all expected creator profile sections with data', async () => {
        mockGetCourses.mockResolvedValue([seededCreator]);
        render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );

        // Creator name visible
        await waitFor(() => {
            expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
        });

        // Current price visible (0.05 XLM from priceStroops 500000)
        expect(screen.getByText('0.05 XLM')).toBeInTheDocument();

        // Holder count visible ("3 keys" from featuredHoldings default)
        expect(screen.getByText(/3 keys/)).toBeInTheDocument();

        // Sparkline rendered (PriceSparkline component exists within the page)
        // The PriceSparkline is inside CreatorCard which is mocked, but the profile
        // section itself uses CreatorProfileInfoGrid with stats.
        // Verify the profile info grid is present via a stat label
        expect(screen.getByText('Membership')).toBeInTheDocument();

        // Buy button visible and enabled
        const buyButton = screen.getAllByRole('button', { name: /Buy/i });
        expect(buyButton.length).toBeGreaterThan(0);
        expect(buyButton[0]).not.toBeDisabled();

        // Sell button visible and enabled
        const sellButton = screen.getAllByRole('button', { name: /Sell/i });
        expect(sellButton.length).toBeGreaterThan(0);
        expect(sellButton[0]).not.toBeDisabled();

        // No skeleton states present
        expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();

        // No error state present
        expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument();
    });
});
