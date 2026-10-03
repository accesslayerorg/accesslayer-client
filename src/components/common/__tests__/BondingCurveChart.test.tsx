import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BondingCurveChart from '../BondingCurveChart';

describe('BondingCurveChart', () => {
	it('should render chart with current supply and price', () => {
		render(
			<BondingCurveChart
				currentSupply={250}
				currentPriceStroops={3000}
			/>
		);

		// Check for current supply display
		expect(screen.getByText(/250/i)).toBeInTheDocument();
	});

	it('should display current price correctly', () => {
		render(
			<BondingCurveChart
				currentSupply={100}
				currentPriceStroops={2000}
			/>
		);

		// Should show price in XLM format
		expect(screen.getByText(/XLM/i)).toBeInTheDocument();
	});

	it('should show price impact preview when buy quantity is provided', () => {
		render(
			<BondingCurveChart
				currentSupply={100}
				currentPriceStroops={2000}
				buyQuantity={50}
			/>
		);

		// Should show price impact section
		expect(screen.getByText(/Price Impact/i)).toBeInTheDocument();
		expect(screen.getByText(/\+/i)).toBeInTheDocument(); // Check for percentage indicator
	});

	it('should not show price impact when buy quantity is zero', () => {
		render(
			<BondingCurveChart
				currentSupply={100}
				currentPriceStroops={2000}
				buyQuantity={0}
			/>
		);

		// Should not show price impact section
		expect(screen.queryByText(/Price Impact/i)).not.toBeInTheDocument();
	});

	it('should display milestone information', () => {
		render(
			<BondingCurveChart
				currentSupply={100}
				currentPriceStroops={2000}
			/>
		);

		// Should show next milestone information
		expect(screen.getByText(/Next:/i)).toBeInTheDocument();
	});

	it('should handle custom milestones', () => {
		const customMilestones = [
			{ supply: 0, priceStroops: 500, label: 'Custom Launch' },
			{ supply: 1000, priceStroops: 1000, label: 'Custom 1K' },
		];

		render(
			<BondingCurveChart
				currentSupply={500}
				currentPriceStroops={750}
				customMilestones={customMilestones}
			/>
		);

		// Should still render without errors
		expect(screen.getByText(/500/i)).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		const { container } = render(
			<BondingCurveChart
				currentSupply={100}
				currentPriceStroops={2000}
				className="custom-class"
			/>
		);

		const wrapper = container.querySelector('.custom-class');
		expect(wrapper).toBeInTheDocument();
	});

	it('should display at final milestone when current supply exceeds all milestones', () => {
		render(
			<BondingCurveChart
				currentSupply={200000}
				currentPriceStroops={500000}
			/>
		);

		// Should show "At final milestone" message
		expect(screen.getByText(/final milestone/i)).toBeInTheDocument();
	});
});
