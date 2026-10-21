import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExitNoticeBanner from '@/components/common/ExitNoticeBanner';
import type { Course } from '@/services/course.service';

const baseCreator: Course = {
	id: 'creator-1',
	title: 'Luna Starlight',
	description: 'Top crypto artist',
	price: 0.25,
	priceStroops: 2_500_000,
	category: 'Art',
	level: 'BEGINNER',
	instructorId: 'luna',
};

describe('ExitNoticeBanner (#1246)', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders nothing when the key is neither deprecated nor retiring', () => {
		render(<ExitNoticeBanner creator={baseCreator} holdingsCount={5} />);

		expect(screen.queryByTestId('exit-notice-banner')).not.toBeInTheDocument();
	});

	it('renders nothing once the holder has fully exited their position', () => {
		render(
			<ExitNoticeBanner
				creator={{ ...baseCreator, isRetiring: true }}
				holdingsCount={0}
			/>
		);

		expect(screen.queryByTestId('exit-notice-banner')).not.toBeInTheDocument();
	});

	it('shows the Retirement action type with a red style, and the buyback price', () => {
		render(
			<ExitNoticeBanner
				creator={{
					...baseCreator,
					isRetiring: true,
					retirementBuybackPriceStroops: 1_000_000,
				}}
				holdingsCount={10}
			/>
		);

		const banner = screen.getByTestId('exit-notice-banner');
		expect(banner).toHaveAttribute('data-action-type', 'retirement');
		expect(screen.getByTestId('exit-notice-action-type')).toHaveTextContent(
			'Retirement'
		);
		expect(screen.getByTestId('exit-notice-buyback-price')).toBeInTheDocument();
	});

	it('shows the Deprecation action type with no buyback price when not retiring', () => {
		render(
			<ExitNoticeBanner
				creator={{ ...baseCreator, deprecated: true }}
				holdingsCount={10}
			/>
		);

		const banner = screen.getByTestId('exit-notice-banner');
		expect(banner).toHaveAttribute('data-action-type', 'deprecation');
		expect(screen.getByTestId('exit-notice-action-type')).toHaveTextContent(
			'Deprecation'
		);
		expect(
			screen.queryByTestId('exit-notice-buyback-price')
		).not.toBeInTheDocument();
	});

	it('prioritises retirement over deprecation when a key is both', () => {
		render(
			<ExitNoticeBanner
				creator={{ ...baseCreator, deprecated: true, isRetiring: true }}
				holdingsCount={10}
			/>
		);

		expect(screen.getByTestId('exit-notice-action-type')).toHaveTextContent(
			'Retirement'
		);
	});

	it('shows and updates a live countdown toward the notice expiry', () => {
		vi.useFakeTimers();
		const expiresAt = new Date(Date.now() + 65_000).toISOString();

		render(
			<ExitNoticeBanner
				creator={{
					...baseCreator,
					isRetiring: true,
					retirementNoticeExpiresAt: expiresAt,
				}}
				holdingsCount={10}
			/>
		);

		expect(screen.getByTestId('exit-notice-countdown')).toHaveTextContent(
			/Notice closes in 1m/
		);

		act(() => {
			vi.advanceTimersByTime(10_000);
		});

		expect(screen.getByTestId('exit-notice-countdown')).toHaveTextContent(
			/Notice closes in 55s/
		);
	});

	it('disables Sell Now and shows a closed state once the notice window expires', () => {
		vi.useFakeTimers();
		const expiresAt = new Date(Date.now() - 1_000).toISOString();

		render(
			<ExitNoticeBanner
				creator={{
					...baseCreator,
					isRetiring: true,
					retirementNoticeExpiresAt: expiresAt,
				}}
				holdingsCount={10}
			/>
		);

		expect(screen.getByTestId('exit-notice-countdown')).toHaveTextContent(
			'Notice window closed'
		);
		expect(screen.getByTestId('exit-notice-sell-now-button')).toBeDisabled();
	});

	it('calls onSellNow when Sell Now is clicked', () => {
		const onSellNow = vi.fn();
		render(
			<ExitNoticeBanner
				creator={{ ...baseCreator, isRetiring: true }}
				holdingsCount={10}
				onSellNow={onSellNow}
			/>
		);

		fireEvent.click(screen.getByTestId('exit-notice-sell-now-button'));
		expect(onSellNow).toHaveBeenCalledOnce();
	});
});
