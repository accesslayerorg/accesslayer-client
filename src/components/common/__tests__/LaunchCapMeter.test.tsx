import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LaunchCapMeter from '../LaunchCapMeter';
import { launchCapService } from '@/services/launchCap.service';
import type { LaunchCapConfig } from '@/types/launchCap';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('LaunchCapMeter component (#1385)', () => {
	const now = Date.now();
	const sampleConfig: LaunchCapConfig = {
		enabled: true,
		windowStart: now - 60_000,
		windowEnd: now + 3_600_000,
		creatorAddress: 'GC_CREATOR',
		allowlist: ['GC_ALLOWLIST'],
		steps: [
			{ timestamp: now - 60_000, cap: 10, label: 'Tier 1' },
			{ timestamp: now + 1_800_000, cap: 25, label: 'Tier 2' },
		],
	};

	beforeEach(() => {
		launchCapService.reset();
	});

	it('returns null when no launch cap is configured', () => {
		const { container } = render(
			<LaunchCapMeter keyId="unknown-key" wallet="GC_USER" />,
			{ wrapper: createWrapper() }
		);
		expect(container.firstChild).toBeNull();
	});

	it('returns null when the launch window has ended', () => {
		const endedConfig: LaunchCapConfig = {
			...sampleConfig,
			windowEnd: now - 1000,
		};
		const { container } = render(
			<LaunchCapMeter
				keyId="key-1"
				wallet="GC_USER"
				config={endedConfig}
			/>,
			{ wrapper: createWrapper() }
		);
		expect(container.firstChild).toBeNull();
	});

	it('displays remaining allowance and purchased amount', () => {
		launchCapService.setConfig('key-1', sampleConfig);
		launchCapService.recordPurchase('key-1', 'GC_USER', 3);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_USER" />,
			{ wrapper: createWrapper() }
		);

		expect(screen.getByTestId('launch-cap-meter')).toBeInTheDocument();
		expect(screen.getByTestId('launch-cap-remaining-allowance')).toHaveTextContent(
			'Remaining allowance: 7 keys'
		);
		expect(screen.getByTestId('launch-cap-purchased-amount')).toHaveTextContent(
			'Purchased: 3 / 10'
		);
	});

	it('displays next scheduled cap increase', () => {
		launchCapService.setConfig('key-1', sampleConfig);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_USER" />,
			{ wrapper: createWrapper() }
		);

		const nextIncrease = screen.getByTestId('launch-cap-next-increase');
		expect(nextIncrease).toHaveTextContent('Next increase to 25 keys');
	});

	it('renders ramp chart marking the current cap', () => {
		launchCapService.setConfig('key-1', sampleConfig);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_USER" />,
			{ wrapper: createWrapper() }
		);

		expect(screen.getByTestId('launch-cap-ramp-chart')).toBeInTheDocument();
		expect(screen.getByTestId('ramp-chart-current-point')).toBeInTheDocument();
	});

	it('shows exempt notice for the creator wallet and no limits', () => {
		launchCapService.setConfig('key-1', sampleConfig);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_CREATOR" />,
			{ wrapper: createWrapper() }
		);

		expect(screen.getByTestId('launch-cap-exempt-notice')).toBeInTheDocument();
		expect(screen.getByTestId('launch-cap-exempt-notice')).toHaveTextContent(
			'You are the creator of this key. No launch window purchase limit applies.'
		);
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();
	});

	it('shows exempt notice for allowlisted wallets and no limits', () => {
		launchCapService.setConfig('key-1', sampleConfig);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_ALLOWLIST" />,
			{ wrapper: createWrapper() }
		);

		expect(screen.getByTestId('launch-cap-exempt-notice')).toBeInTheDocument();
		expect(screen.getByTestId('launch-cap-exempt-notice')).toHaveTextContent(
			'Your wallet is allowlisted. No launch window purchase limit applies.'
		);
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();
	});

	it('displays cap reached notice when cumulative purchases equal or exceed cap', () => {
		launchCapService.setConfig('key-1', sampleConfig);
		launchCapService.recordPurchase('key-1', 'GC_USER', 10);

		render(
			<LaunchCapMeter keyId="key-1" wallet="GC_USER" />,
			{ wrapper: createWrapper() }
		);

		expect(screen.getByTestId('launch-cap-remaining-allowance')).toHaveTextContent(
			'Cap reached (0 keys remaining)'
		);
		expect(screen.getByTestId('launch-cap-purchased-amount')).toHaveTextContent(
			'Purchased: 10 / 10'
		);
	});
});
