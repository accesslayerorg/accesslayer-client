import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import React from 'react';

import BondingCurveChart from '@/components/common/BondingCurveChart';

/**
 * Mobile responsiveness of the price chart on the key detail page (#1055).
 *
 * Acceptance criteria covered:
 *  - The price chart resizes to the mobile viewport without distortion:
 *    the chart surface is width-fluid inside its container, and on mobile
 *    the x-axis drops the desktop -45° rotated labels in favour of
 *    straight, gap-spaced ticks with tighter margins, so the plot area
 *    keeps a readable aspect ratio at 375px.
 *
 * jsdom gives ResponsiveContainer zero dimensions, so recharts does not
 * render SVG internals here (consistent with the existing BondingCurveChart
 * tests, which assert on text output only). We assert the responsive
 * plumbing instead: fluid width surface + fixed declared height.
 */

const renderChart = () =>
	render(
		<BondingCurveChart
			data={[
				{ supply: 20, priceXLM: 0.1 },
				{ supply: 40, priceXLM: 0.12 },
				{ supply: 60, priceXLM: 0.15 },
			]}
			currentSupply={60}
			height={300}
		/>
	);

const stubMatchMedia = (isMobile: boolean) => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn().mockImplementation((query: string) => ({
			matches: isMobile && query.includes('max-width'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}))
	);
};

describe('BondingCurveChart mobile resize (#1055)', () => {
	beforeEach(() => {
		stubMatchMedia(true);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('renders a responsive container with a fluid-width, fixed-height surface', () => {
		const { container } = renderChart();

		// ResponsiveContainer is the resize mechanism — it remeasures on
		// viewport changes instead of rendering a fixed pixel width.
		expect(
			container.querySelector('.recharts-responsive-container')
		).toBeInTheDocument();

		// The declared chart surface (our own wrapper around the container):
		// fills the container width, keeps the requested height. No fixed
		// pixel width means no horizontal overflow at any viewport width.
		// (The inner recharts div is measurement-driven and reads 0px in
		// jsdom, so it is deliberately not asserted here.)
		const surface = container.querySelector<HTMLElement>(
			':scope > div > div'
		);
		expect(surface).not.toBeNull();
		expect(surface?.style.width).toBe('100%');
		expect(surface?.style.height).toBe('300px');
	});

	it('keeps the fluid-width wrapper across breakpoints', () => {
		stubMatchMedia(false);

		const { container } = renderChart();

		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper).toHaveClass('w-full');
		expect(
			container.querySelector('.recharts-responsive-container')
		).toBeInTheDocument();
	});
});
