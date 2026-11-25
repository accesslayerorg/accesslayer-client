import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EscapeBanner from '../EscapeBanner';
import { useEscapeStatus } from '@/hooks/useEscapeStatus';

vi.mock('@/hooks/useEscapeStatus', () => ({
	useEscapeStatus: vi.fn(),
}));

const mockUseEscapeStatus = vi.mocked(useEscapeStatus);

describe('EscapeBanner (#1320)', () => {
	beforeEach(() => {
		mockUseEscapeStatus.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders nothing while loading or when protocol is not paused', () => {
		mockUseEscapeStatus.mockReturnValue({
			status: null,
			isLoading: true,
			isError: false,
			error: null,
			refetch: vi.fn(),
			isProtocolPaused: false,
			isEscapeModeActive: false,
			escapeAvailableAt: null,
			msUntilEscapeAvailable: 0,
			pauseStartedAt: null,
		});
		const { rerender } = render(
			<MemoryRouter>
				<EscapeBanner />
			</MemoryRouter>
		);
		expect(screen.queryByTestId('escape-banner')).not.toBeInTheDocument();

		mockUseEscapeStatus.mockReturnValue({
			status: null,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
			isProtocolPaused: false,
			isEscapeModeActive: false,
			escapeAvailableAt: null,
			msUntilEscapeAvailable: 0,
			pauseStartedAt: null,
		});
		rerender(
			<MemoryRouter>
				<EscapeBanner />
			</MemoryRouter>
		);
		expect(screen.queryByTestId('escape-banner')).not.toBeInTheDocument();
	});

	it('shows a countdown and hides the redemption link before escape is available', () => {
		mockUseEscapeStatus.mockReturnValue({
			status: {
				protocolPaused: true,
				pauseStartedAt: '2026-01-01T00:00:00.000Z',
				escapeEnabled: false,
			},
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
			isProtocolPaused: true,
			isEscapeModeActive: false,
			escapeAvailableAt: Date.now() + 2 * 60 * 60 * 1000,
			msUntilEscapeAvailable: 2 * 60 * 60 * 1000,
			pauseStartedAt: '2026-01-01T00:00:00.000Z',
		});

		render(
			<MemoryRouter>
				<EscapeBanner />
			</MemoryRouter>
		);

		expect(screen.getByTestId('escape-banner')).toBeInTheDocument();
		expect(screen.getByTestId('escape-countdown')).toHaveTextContent(
			/Escape available in/i
		);
		expect(screen.queryByTestId('escape-page-link')).not.toBeInTheDocument();
	});

	it('shows the redemption page link once escape mode is active', () => {
		mockUseEscapeStatus.mockReturnValue({
			status: {
				protocolPaused: true,
				pauseStartedAt: '2026-01-01T00:00:00.000Z',
				escapeEnabled: true,
			},
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
			isProtocolPaused: true,
			isEscapeModeActive: true,
			escapeAvailableAt: Date.now() - 1000,
			msUntilEscapeAvailable: 0,
			pauseStartedAt: '2026-01-01T00:00:00.000Z',
		});

		render(
			<MemoryRouter>
				<EscapeBanner />
			</MemoryRouter>
		);

		expect(screen.getByTestId('escape-banner')).toBeInTheDocument();
		expect(screen.getByTestId('escape-countdown')).toHaveTextContent(
			/Escape hatch open/i
		);
		const link = screen.getByTestId('escape-page-link');
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/escape');
	});
});
