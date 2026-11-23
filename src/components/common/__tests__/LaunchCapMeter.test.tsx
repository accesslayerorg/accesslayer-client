import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LaunchCapMeter from '../LaunchCapMeter';
import type { LaunchCapData } from '@/hooks/useLaunchCap';

const data: LaunchCapData = {
	keyId: 'key-1',
	wallet: 'GTEST',
	currentCap: 20,
	purchasedAmount: 7,
	remainingAllowance: 13,
	windowStart: Date.now() - 1000,
	windowEnd: Date.now() + 60_000,
	initialCap: 10,
	finalCap: 30,
	isExempt: false,
	exemptionReason: null,
};

describe('LaunchCapMeter', () => {
	it('shows remaining allowance and marks the current ramp point', () => {
		render(<LaunchCapMeter data={data} />);
		expect(screen.getByTestId('launch-cap-remaining')).toHaveTextContent(
			'13 remaining'
		);
		expect(
			screen.getByTestId('launch-cap-current-point')
		).toBeInTheDocument();
	});

	it('shows an exempt notice with no limit', () => {
		render(
			<LaunchCapMeter
				data={{ ...data, isExempt: true, exemptionReason: 'allowlisted' }}
			/>
		);
		expect(screen.getByTestId('launch-cap-exempt')).toHaveTextContent(
			'Exempt wallet'
		);
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();
	});

	it('hides the meter after the window ends', () => {
		render(<LaunchCapMeter data={{ ...data, windowEnd: Date.now() - 1 }} />);
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();
	});
});
