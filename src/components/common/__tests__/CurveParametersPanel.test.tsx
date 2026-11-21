import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { CurveParametersPanel } from '../CurveParametersPanel';
import { curveContractService } from '@/services/curveContract.service';
import showToast from '@/utils/toast.util';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		curveUpdateProposed: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('CurveParametersPanel', () => {
	const creatorId = 'creator-test-123';

	beforeEach(() => {
		vi.clearAllMocks();
		curveContractService.clearProposal(creatorId);
		curveContractService.setCurveParams(creatorId, {
			slope: 0.001,
			intercept: 1.0,
		});
	});

	it('renders current slope and intercept parameters', async () => {
		render(
			<CurveParametersPanel creatorId={creatorId} currentSupply={20} />,
			{
				wrapper: createWrapper(),
			}
		);

		expect(
			await screen.findByRole('heading', {
				name: /Bonding Curve Parameters/i,
			})
		).toBeInTheDocument();

		expect(screen.getByTestId('current-slope')).toHaveTextContent(
			'0.001 XLM / key'
		);
		expect(screen.getByTestId('current-intercept')).toHaveTextContent(
			'1 XLM'
		);
		expect(screen.getByTestId('current-supply')).toHaveTextContent('20 keys');
	});

	it('shows impact preview when entering new slope and intercept', async () => {
		const user = userEvent.setup();
		render(
			<CurveParametersPanel creatorId={creatorId} currentSupply={20} />,
			{
				wrapper: createWrapper(),
			}
		);

		const slopeInput = await screen.findByTestId('curve-slope-input');
		const interceptInput = screen.getByTestId('curve-intercept-input');

		await user.clear(slopeInput);
		await user.type(slopeInput, '0.002');
		await user.clear(interceptInput);
		await user.type(interceptInput, '1.5');

		const impactPreview = screen.getByTestId('curve-impact-preview');
		expect(impactPreview).toBeInTheDocument();
		expect(impactPreview).toHaveTextContent(
			/Estimated price change from new parameters/i
		);

		// Current price at 20 supply: 1.0 + 0.001*20 = 1.02
		// New price at 20 supply: 1.5 + 0.002*20 = 1.54
		// Difference: +0.52
		expect(impactPreview).toHaveTextContent('+0.5200 XLM');
	});

	it('submits propose_curve_update contract call and fires CurveUpdateProposed toast on confirmation', async () => {
		const user = userEvent.setup();
		const proposeSpy = vi.spyOn(curveContractService, 'propose_curve_update');

		render(
			<CurveParametersPanel creatorId={creatorId} currentSupply={10} />,
			{
				wrapper: createWrapper(),
			}
		);

		const slopeInput = await screen.findByTestId('curve-slope-input');
		const interceptInput = screen.getByTestId('curve-intercept-input');
		const submitButton = screen.getByTestId('propose-update-button');

		await user.clear(slopeInput);
		await user.type(slopeInput, '0.003');
		await user.clear(interceptInput);
		await user.type(interceptInput, '1.2');

		expect(submitButton).toBeEnabled();
		await user.click(submitButton);

		await waitFor(() => {
			expect(proposeSpy).toHaveBeenCalledWith({
				creatorId,
				slope: 0.003,
				intercept: 1.2,
			});
		});

		// Verify toast fires on confirmation
		expect(showToast.curveUpdateProposed).toHaveBeenCalled();

		// Verify pending proposal card is rendered
		expect(
			await screen.findByTestId('pending-proposal-card')
		).toBeInTheDocument();
		expect(screen.getByTestId('proposed-slope')).toHaveTextContent(
			'0.003 XLM / key'
		);
		expect(screen.getByTestId('proposed-intercept')).toHaveTextContent(
			'1.2 XLM'
		);
	});

	it('displays accurate eta countdown in pending proposal card', async () => {
		// Mock an active proposal created 2 hours ago
		const now = Date.now();
		const proposedAt = now - 2 * 3600 * 1000;
		const eta = proposedAt + 48 * 3600 * 1000;

		curveContractService.setProposal({
			id: 'prop-active-1',
			creatorId,
			proposedSlope: 0.004,
			proposedIntercept: 2.0,
			currentSlope: 0.001,
			currentIntercept: 1.0,
			proposedAt,
			eta,
			timelockDurationHours: 48,
			status: 'pending',
		});

		render(
			<CurveParametersPanel creatorId={creatorId} currentSupply={10} />,
			{
				wrapper: createWrapper(),
			}
		);

		const pendingCard = await screen.findByTestId('pending-proposal-card');
		expect(pendingCard).toBeInTheDocument();

		const countdown = screen.getByTestId('eta-countdown');
		// ~46h remaining
		expect(countdown.textContent).toMatch(/4[56]h \d{2}m \d{2}s remaining/);
		expect(screen.getByTestId('proposed-slope')).toHaveTextContent(
			'0.004 XLM / key'
		);
		expect(screen.getByTestId('proposed-intercept')).toHaveTextContent(
			'2 XLM'
		);
	});

	it('submits cancel_curve_update call when clicking Cancel Proposal button', async () => {
		const user = userEvent.setup();
		const cancelSpy = vi.spyOn(curveContractService, 'cancel_curve_update');

		await curveContractService.propose_curve_update(creatorId, 0.005, 2.5);

		render(
			<CurveParametersPanel creatorId={creatorId} currentSupply={10} />,
			{
				wrapper: createWrapper(),
			}
		);

		const cancelButton = await screen.findByTestId('cancel-proposal-button');
		expect(cancelButton).toBeInTheDocument();

		await user.click(cancelButton);

		await waitFor(() => {
			expect(cancelSpy).toHaveBeenCalledWith({
				creatorId,
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
