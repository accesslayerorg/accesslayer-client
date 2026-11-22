import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BondingCurveChart, { CustomTooltip } from '../BondingCurveChart';

describe('BondingCurveChart TWAP Overlay (#931)', () => {
	const mockData = [
		{ supply: 20, priceXLM: 0.1 },
		{ supply: 40, priceXLM: 0.12 },
		{ supply: 60, priceXLM: 0.15 },
		{ supply: 80, priceXLM: 0.2 },
	];

	it('renders TWAP controls and legend when twapPriceStroops is provided', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				twapPriceStroops={1_200_000}
				twapWindow="24h"
			/>
		);

		expect(screen.getByTestId('twap-controls')).toBeInTheDocument();
		expect(screen.getByTestId('twap-current-value')).toHaveTextContent(/0\.12 XLM/i);
		expect(screen.getByTestId('twap-window-1h')).toBeInTheDocument();
		expect(screen.getByTestId('twap-window-24h')).toBeInTheDocument();
		expect(screen.getByTestId('twap-window-24h')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('twap-window-1h')).toHaveAttribute('aria-pressed', 'false');

		// Legend indicator
		expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
		expect(screen.getByTestId('twap-legend-indicator')).toHaveTextContent(/TWAP \(24h\)/i);
	});

	it('switches between 1h and 24h windows when toggle buttons are clicked', () => {
		const onTwapWindowChange = vi.fn();

		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				twapPriceStroops={1_200_000}
				twapWindow="24h"
				onTwapWindowChange={onTwapWindowChange}
			/>
		);

		const button1h = screen.getByTestId('twap-window-1h');
		fireEvent.click(button1h);
		expect(onTwapWindowChange).toHaveBeenCalledWith('1h');

		const button24h = screen.getByTestId('twap-window-24h');
		fireEvent.click(button24h);
		expect(onTwapWindowChange).toHaveBeenCalledWith('24h');
	});

	it('handles unavailable TWAP state gracefully with hidden overlay', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				twapPriceStroops={null}
				twapWindow="24h"
			/>
		);

		expect(screen.getByTestId('twap-controls')).toBeInTheDocument();
		expect(screen.getByTestId('twap-status-unavailable')).toHaveTextContent(/Unavailable/i);
		expect(screen.queryByTestId('twap-legend-indicator')).not.toBeInTheDocument();
		expect(screen.queryByTestId('twap-current-value')).not.toBeInTheDocument();
	});

	it('allows toggling overlay visibility on and off', () => {
		render(
			<BondingCurveChart
				data={mockData}
				currentSupply={60}
				currentPriceStroops={1_500_000}
				twapPriceStroops={1_200_000}
				twapWindow="24h"
			/>
		);

		const toggleBtn = screen.getByTestId('twap-toggle-visibility');
		expect(toggleBtn).toHaveTextContent(/Hide/i);
		expect(screen.getByTestId('twap-legend-indicator')).toBeInTheDocument();

		// Click to hide
		fireEvent.click(toggleBtn);
		expect(toggleBtn).toHaveTextContent(/Show/i);
		expect(screen.queryByTestId('twap-legend-indicator')).not.toBeInTheDocument();
		expect(screen.getByTestId('twap-status-unavailable')).toHaveTextContent(/Hidden/i);

		// Click to show again
		fireEvent.click(toggleBtn);
		expect(toggleBtn).toHaveTextContent(/Hide/i);
		expect(screen.getByTestId('twap-legend-indicator')).toBeInTheDocument();
	});

	describe('CustomTooltip', () => {
		it('renders spot price, supply, and TWAP with deviation percentage when TWAP is lower than spot', () => {
			const payload = [
				{
					payload: {
						priceStroops: 20_000_000, // 2 XLM
						supply: 100,
						twapPriceStroops: 18_000_000, // 1.8 XLM (-10%)
					},
				},
			];

			render(
				<CustomTooltip
					active={true}
					payload={payload}
					twapPriceStroops={18_000_000}
					twapWindow="1h"
					spotPriceStroops={20_000_000}
				/>
			);

			expect(screen.getByTestId('bonding-curve-tooltip')).toBeInTheDocument();
			expect(screen.getByText(/Supply: 100 keys/i)).toBeInTheDocument();
			expect(screen.getByText(/2 XLM/i)).toBeInTheDocument();

			// TWAP section
			expect(screen.getByTestId('twap-tooltip-section')).toBeInTheDocument();
			expect(screen.getByTestId('twap-tooltip-label')).toHaveTextContent('TWAP (1h):');
			expect(screen.getByTestId('twap-tooltip-price')).toHaveTextContent(/1\.8 XLM/i);
			expect(screen.getByTestId('twap-tooltip-deviation')).toHaveTextContent(/▼ 10\.00% vs spot/i);
		});

		it('renders positive deviation percentage when TWAP is higher than spot', () => {
			const payload = [
				{
					payload: {
						priceStroops: 10_000_000, // 1 XLM
						supply: 50,
					},
				},
			];

			render(
				<CustomTooltip
					active={true}
					payload={payload}
					twapPriceStroops={11_500_000} // 1.15 XLM (+15%)
					twapWindow="24h"
					spotPriceStroops={10_000_000}
				/>
			);

			expect(screen.getByTestId('twap-tooltip-label')).toHaveTextContent('TWAP (24h):');
			expect(screen.getByTestId('twap-tooltip-price')).toHaveTextContent(/1\.15 XLM/i);
			expect(screen.getByTestId('twap-tooltip-deviation')).toHaveTextContent(/▲ 15\.00% vs spot/i);
		});

		it('hides TWAP section in tooltip when TWAP is unavailable or overlay is disabled', () => {
			const payload = [
				{
					payload: {
						priceStroops: 10_000_000,
						supply: 50,
					},
				},
			];

			const { rerender } = render(
				<CustomTooltip
					active={true}
					payload={payload}
					twapPriceStroops={null}
					twapWindow="24h"
				/>
			);

			expect(screen.queryByTestId('twap-tooltip-section')).not.toBeInTheDocument();

			rerender(
				<CustomTooltip
					active={true}
					payload={payload}
					twapPriceStroops={10_000_000}
					showTwapOverlay={false}
				/>
			);

			expect(screen.queryByTestId('twap-tooltip-section')).not.toBeInTheDocument();
		});

		it('returns null when active is false or payload is empty', () => {
			const { container, rerender } = render(<CustomTooltip active={false} payload={[]} />);
			expect(container.firstChild).toBeNull();

			rerender(<CustomTooltip active={true} payload={[]} />);
			expect(container.firstChild).toBeNull();
		});
	});
});
