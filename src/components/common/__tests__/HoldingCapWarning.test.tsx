import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HoldingCapWarning from '../HoldingCapWarning';
import type { HoldingCapData } from '@/hooks/useHoldingCapStore';

describe('HoldingCapWarning (#961)', () => {
	const baseData: HoldingCapData = {
		creatorId: 'creator-test',
		currentHolding: 10,
		maxCap: 50,
		isLoading: false,
		error: null,
	};

	it('renders nothing when data is loading or maxCap is 0', () => {
		const { container: loadingContainer } = render(
			<HoldingCapWarning data={{ ...baseData, isLoading: true }} />
		);
		expect(loadingContainer.firstChild).toBeNull();

		const { container: zeroCapContainer } = render(
			<HoldingCapWarning data={{ ...baseData, maxCap: 0 }} />
		);
		expect(zeroCapContainer.firstChild).toBeNull();
	});

	it('renders progress indicator with correct percentage and aria attributes', () => {
		render(<HoldingCapWarning data={{ ...baseData, currentHolding: 25, maxCap: 50 }} />);

		expect(screen.getByText(/Holding:/i)).toHaveTextContent('Holding: 25 / 50 keys');
		expect(screen.getByText('50%')).toBeInTheDocument();

		const progressbar = screen.getByRole('progressbar');
		expect(progressbar).toBeInTheDocument();
		expect(progressbar).toHaveAttribute('aria-valuenow', '50');
		expect(progressbar).toHaveAttribute('aria-valuemin', '0');
		expect(progressbar).toHaveAttribute('aria-valuemax', '100');

		// Below 80%: no warning banner
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('displays warning banner when holding exceeds 80% of cap', () => {
		// 42 / 50 = 84% -> approaching cap
		render(<HoldingCapWarning data={{ ...baseData, currentHolding: 42, maxCap: 50 }} />);

		expect(screen.getByText('84%')).toBeInTheDocument();

		const warning = screen.getByRole('status');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent(/You hold 84% of the maximum cap/i);
		expect(warning).toHaveTextContent(/You can buy up to 8 more keys/i);
	});

	it('displays cap reached alert when holding is at 100% of cap', () => {
		render(<HoldingCapWarning data={{ ...baseData, currentHolding: 50, maxCap: 50 }} />);

		expect(screen.getByText('100%')).toBeInTheDocument();

		const alert = screen.getByRole('alert');
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveTextContent(/Maximum holding cap reached \(50 keys\)/i);
		expect(alert).toHaveTextContent(/You cannot purchase more keys for this creator/i);

		// Approaching banner should not be present
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
	});
});
