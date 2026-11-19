import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from '@/pages/LandingPage';
import { courseService, type Course } from '@/services/course.service';
import * as imageCaptureModule from '@/utils/imageCapture.utils';

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: 'GDEMOWALLET0000000000000000000000000000000000000000000000001' }),
}));

vi.mock('@/hooks/useWallet', () => ({
	useTradeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useSelfFreezeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useReinvestDividendMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useRedeemDeprecatedKeyMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
	useWalletHoldings: () => ({
		data: [
			{ creatorId: 'creator-1', quantity: 3, liquidQuantity: 3 },
			{ creatorId: 'creator-2', quantity: 2, liquidQuantity: 2 },
		],
	}),
}));

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
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
		msUntilStale: 60_000,
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
	type MotionDivProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};

	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionDivProps) => {
				const { layout, transition, ...divProps } = props;
				void layout;
				void transition;
				return React.createElement('div', divProps, children);
			},
			h1: ({ children, ...props }: ComponentProps<'h1'>) =>
				React.createElement('h1', props, children),
			button: ({ children, ...props }: ComponentProps<'button'>) =>
				React.createElement('button', props, children),
		},
	};
});

vi.mock('gsap', () => ({
	default: {
		timeline: vi.fn(() => ({
			to: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			fromTo: vi.fn().mockReturnThis(),
		})),
		to: vi.fn(),
		from: vi.fn(),
		fromTo: vi.fn(),
	},
}));

const mockCourses: Course[] = [
	{
		id: 'creator-1',
		title: 'Creator One',
		description: 'Desc 1',
		price: 0.5,
		priceStroops: 5_000_000,
		instructorId: 'creator-1',
		category: 'Art',
		level: 'BEGINNER',
		isVerified: true,
	},
	{
		id: 'creator-2',
		title: 'Creator Two',
		description: 'Desc 2',
		price: 1.2,
		priceStroops: 12_000_000,
		instructorId: 'creator-2',
		category: 'Music',
		level: 'INTERMEDIATE',
		isVerified: false,
	},
];

describe('LandingPage — Share Performance Button (#881)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		vi.mocked(courseService.getCourses).mockResolvedValue(mockCourses);
		vi.spyOn(imageCaptureModule, 'captureElementToPng').mockResolvedValue({
			dataUrl: 'data:image/png;base64,mock',
			blob: new Blob(['mock'], { type: 'image/png' }),
		});
	});

	it('renders "Share Performance" button inside the PnL summary card and opens modal on click', async () => {
		const user = userEvent.setup();

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<LandingPage />
				</MemoryRouter>
			</QueryClientProvider>
		);

		// Wait for PnL summary card to appear
		const pnlCard = await screen.findByTestId('pnl-summary-card', {}, { timeout: 3000 });
		expect(pnlCard).toBeInTheDocument();

		// Find the Share Performance button
		const shareBtn = screen.getByTestId('share-performance-btn');
		expect(shareBtn).toBeInTheDocument();
		expect(shareBtn).toHaveTextContent('Share Performance');

		// Click the Share Performance button
		await user.click(shareBtn);

		// Verify that the Share Portfolio Performance modal opens
		await waitFor(() => {
			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByText('Share Portfolio Performance')).toBeInTheDocument();
			expect(screen.getByTestId('download-png-button')).toBeInTheDocument();
			expect(screen.getByTestId('copy-image-button')).toBeInTheDocument();
		});
	});
});
