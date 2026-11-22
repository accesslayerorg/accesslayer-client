import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingUpgradeBanner from '@/components/common/PendingUpgradeBanner';
import { useContractVersion } from '@/hooks/useContractVersion';

vi.mock('@/hooks/useContractVersion', {
	useContractVersion: vi.fn(),
});

const mockedUseContractVersion = vi.mocked(useContractVersion);

const DISMISSED_KEY = 'protocol-upgrade-dismissed';

describe('PendingUpgradeBanner', () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('renders the banner with target version and countdown when an upgrade is pending', () => {
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: {
				version: '2.0.0',
				executableAt: Date.now() + 2 * 60 * 60 * 1000,
			},
		});

		render(<PendingUpgradeBanner />);

		expect(screen.getByText('2.0.0')).toBeInTheDocument();
		expect(screen.getByTestId('upgrade-countdown').textContent).toMatch(
			/^02h00m00s$/
		);
	});

	it('does not render when no upgrade is pending', () => {
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: null,
		});

		const { container } = render(<PendingUpgradeBanner />);

		expect(container).toBeEmpty();
	});

	it('hides the banner when the upgrade version was dismissed', () => {
		window.localStorage.setItem(DISMISSED_KEY, '2.0.0');
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: {
				version: '2.0.0',
				executableAt: Date.now() + 60 * 60 * 1000,
			},
		});

		const { container } = render(<PendingUpgradeBanner />);

		expect(container).toBeEmpty();
	});

	it('re-shows the banner for a newer upgrade version', () => {
		window.localStorage.setItem(DISMISSED_KEY, '2.0.0');
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: {
				version: '2.1.0',
				executableAt: Date.now() + 60 * 60 * 1000,
			},
		});

		render(<PendingUpgradeBanner />);

		expect(screen.getByText('2.1.0')).toBeInTheDocument();
	});

	it('shows the warning variant within 1 hour of execution', () => {
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: {
				version: '2.0.0',
				executableAt: Date.now() + 30 * 60 * 1000,
			},
		});

		render(<PendingUpgradeBanner />);

		expect(screen.getByText('Upgrade imminent')).toBeInTheDocument();
		expect(screen.getByText(/Avoid open trades/)).toBeInTheDocument();
	});

	it('disappears once the upgrade has executed', () => {
		mockedUseContractVersion.mockReturnValue({
			currentVersion: '1.0.0',
			pendingUpgrade: { version: '2.0.0', executableAt: Date.now() + 1000 },
		});

		const { container } = render(<PendingUpgradeBanner />);

		expect(container).not.toBeEmpty();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(container).toBeEmpty();
	});
});
