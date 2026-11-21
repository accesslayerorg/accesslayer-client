import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PerformanceBondPanel from '../PerformanceBondPanel';
import type { PerformanceBond } from '@/services/course.service';

describe('PerformanceBondPanel', () => {
	const mockStakedBond: PerformanceBond = {
		keyId: 'creator-1',
		amountStroops: 10_000_000_000, // 1000 XLM
		state: 'staked',
		milestone: '1,000 Keys Sold',
	};

	const mockReleasedBond: PerformanceBond = {
		keyId: 'creator-2',
		amountXlm: 500,
		state: 'released',
		milestone: '500 Holders',
		releasedAt: '2026-08-15T12:00:00Z',
	};

	const mockForfeitedBond: PerformanceBond = {
		keyId: 'creator-3',
		amountStroops: 2_000_000_000, // 200 XLM
		state: 'forfeited',
		milestone: 'Active for 6 months',
		forfeitureReason: 'Creator abandoned project before reaching milestone.',
	};

	it('renders nothing when no bond exists', () => {
		const { container } = render(<PerformanceBondPanel bond={null} />);
		expect(container.firstChild).toBeNull();
		expect(
			screen.queryByTestId('performance-bond-panel')
		).not.toBeInTheDocument();
	});

	it('renders nothing when undefined bond and not loading', () => {
		const { container } = render(<PerformanceBondPanel bond={undefined} />);
		expect(container.firstChild).toBeNull();
	});

	it('renders loading skeleton when isLoading is true and no bond data', () => {
		render(<PerformanceBondPanel isLoading={true} bond={null} />);
		expect(
			screen.getByTestId('performance-bond-panel-loading')
		).toBeInTheDocument();
	});

	it('renders bonded amount, state, and milestone correctly for staked bond', () => {
		render(<PerformanceBondPanel bond={mockStakedBond} />);

		expect(screen.getByTestId('performance-bond-panel')).toBeInTheDocument();
		expect(screen.getByTestId('performance-bond-amount')).toHaveTextContent(
			'1,000 XLM'
		);
		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent(
			'Staked'
		);
		expect(screen.getByTestId('performance-bond-milestone')).toHaveTextContent(
			'1,000 Keys Sold'
		);
	});

	it('renders released state with release timestamp clearly', () => {
		render(<PerformanceBondPanel bond={mockReleasedBond} />);

		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent(
			'Released'
		);
		const releaseEl = screen.getByTestId('performance-bond-released-at');
		expect(releaseEl).toBeInTheDocument();
		expect(releaseEl).toHaveTextContent(/Released on/i);
		expect(releaseEl).toHaveTextContent(/Aug 15, 2026/i);
	});

	it('renders forfeited state with forfeiture reason clearly', () => {
		render(<PerformanceBondPanel bond={mockForfeitedBond} />);

		expect(screen.getByTestId('performance-bond-state')).toHaveTextContent(
			'Forfeited'
		);
		const reasonEl = screen.getByTestId('performance-bond-reason');
		expect(reasonEl).toBeInTheDocument();
		expect(reasonEl).toHaveTextContent(
			'Creator abandoned project before reaching milestone.'
		);
	});

	it('renders tooltip explaining the investor protection role', async () => {
		const user = userEvent.setup();
		render(<PerformanceBondPanel bond={mockStakedBond} />);

		const triggerBtn = screen.getByRole('button', {
			name: /explanation for performance bond/i,
		});
		expect(triggerBtn).toBeInTheDocument();

		await user.hover(triggerBtn);
		expect(
			await screen.findByText(
				/locks creator capital on-chain until maturity milestones are met/i
			)
		).toBeInTheDocument();
	});
});
