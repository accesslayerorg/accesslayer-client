import type { ComponentProps, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreatorDashboardPage from '@/pages/CreatorDashboardPage';
import { courseService } from '@/services/course.service';
import { curveContractService } from '@/services/curveContract.service';
import showToast from '@/utils/toast.util';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
	},
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		curveUpdateProposed: vi.fn(),
	},
}));

vi.mock('framer-motion', async () => {
	const React = await import('react');
	type MotionProps = ComponentProps<'div'> & {
		layout?: boolean;
		transition?: unknown;
	};

	return {
		AnimatePresence: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		LayoutGroup: ({ children }: { children: ReactNode }) =>
			React.createElement(React.Fragment, null, children),
		motion: {
			div: ({ children, ...props }: MotionProps) => {
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

const mockGetCourse = vi.mocked(courseService.getCourse);

function makeFreshQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
}

describe('CreatorDashboardPage Integration', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = makeFreshQueryClient();
		mockGetCourse.mockReset();
		vi.clearAllMocks();
		curveContractService.clearProposal('creator-dash-1');
		curveContractService.setCurveParams('creator-dash-1', {
			slope: 0.001,
			intercept: 1.0,
		});
	});

	it('renders creator dashboard with curve parameters panel showing current slope and intercept', async () => {
		mockGetCourse.mockResolvedValue({
			id: 'creator-dash-1',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 120,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			isVerified: true,
			thumbnail:
				'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter
					initialEntries={['/creator/creator-dash-1/dashboard']}
				>
					<Routes>
						<Route
							path="/creator/:id/dashboard"
							element={<CreatorDashboardPage />}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		expect(
			await screen.findByText('Alex Rivers Dashboard')
		).toBeInTheDocument();
		expect(
			screen.getByRole('heading', { name: /Bonding Curve Parameters/i })
		).toBeInTheDocument();
		expect(screen.getByTestId('current-slope')).toHaveTextContent(
			'0.001 XLM / key'
		);
		expect(screen.getByTestId('current-intercept')).toHaveTextContent(
			'1 XLM'
		);
	});

	it('submits propose_curve_update, displays pending proposal with 48h timelock countdown and fires toast', async () => {
		const user = userEvent.setup();
		const proposeSpy = vi.spyOn(curveContractService, 'propose_curve_update');

		mockGetCourse.mockResolvedValue({
			id: 'creator-dash-1',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			priceStroops: 500_000,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
			isVerified: true,
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter
					initialEntries={['/creator/creator-dash-1/dashboard']}
				>
					<Routes>
						<Route
							path="/creator/:id/dashboard"
							element={<CreatorDashboardPage />}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await screen.findByText('Alex Rivers Dashboard');

		const slopeInput = screen.getByTestId('curve-slope-input');
		const interceptInput = screen.getByTestId('curve-intercept-input');

		await user.clear(slopeInput);
		await user.type(slopeInput, '0.005');
		await user.clear(interceptInput);
		await user.type(interceptInput, '2.0');

		// Impact preview: at 100 supply: current = 1.0 + 0.001*100 = 1.10; new = 2.0 + 0.005*100 = 2.50
		const impactPreview = screen.getByTestId('curve-impact-preview');
		expect(impactPreview).toHaveTextContent(
			/Estimated price change from new parameters/i
		);
		expect(impactPreview).toHaveTextContent('+1.4000 XLM');

		const submitBtn = screen.getByTestId('propose-update-button');
		await user.click(submitBtn);

		await waitFor(() => {
			expect(proposeSpy).toHaveBeenCalledWith({
				creatorId: 'creator-dash-1',
				slope: 0.005,
				intercept: 2.0,
			});
		});

		expect(showToast.curveUpdateProposed).toHaveBeenCalled();

		// Pending proposal card is displayed
		const pendingCard = await screen.findByTestId('pending-proposal-card');
		expect(pendingCard).toBeInTheDocument();
		expect(screen.getByTestId('proposed-slope')).toHaveTextContent(
			'0.005 XLM / key'
		);
		expect(screen.getByTestId('proposed-intercept')).toHaveTextContent(
			'2 XLM'
		);

		// Countdown displays accurate countdown
		const countdown = screen.getByTestId('eta-countdown');
		expect(countdown.textContent).toMatch(/4[78]h \d{2}m \d{2}s remaining/);
	});

	it('submits cancel_curve_update call when clicking Cancel Proposal button', async () => {
		const user = userEvent.setup();
		const cancelSpy = vi.spyOn(curveContractService, 'cancel_curve_update');

		await curveContractService.propose_curve_update(
			'creator-dash-1',
			0.005,
			2.0
		);

		mockGetCourse.mockResolvedValue({
			id: 'creator-dash-1',
			title: 'Alex Rivers',
			description: 'Digital Artist & Illustrator',
			price: 0.05,
			creatorShareSupply: 100,
			instructorId: 'arivers',
			category: 'Art',
			level: 'BEGINNER',
		});

		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter
					initialEntries={['/creator/creator-dash-1/dashboard']}
				>
					<Routes>
						<Route
							path="/creator/:id/dashboard"
							element={<CreatorDashboardPage />}
						/>
					</Routes>
				</MemoryRouter>
			</QueryClientProvider>
		);

		await screen.findByText('Alex Rivers Dashboard');

		const cancelBtn = await screen.findByTestId('cancel-proposal-button');
		expect(cancelBtn).toBeInTheDocument();

		await user.click(cancelBtn);

		await waitFor(() => {
			expect(cancelSpy).toHaveBeenCalledWith({
				creatorId: 'creator-dash-1',
			});
		});

		expect(showToast.success).toHaveBeenCalledWith(
			'Curve update proposal cancelled'
		);

		await waitFor(() => {
			expect(
				screen.queryByTestId('pending-proposal-card')
			).not.toBeInTheDocument();
		});
	});
});
