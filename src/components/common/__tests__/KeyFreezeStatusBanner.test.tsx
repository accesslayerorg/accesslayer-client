import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KeyFreezeStatusBanner, {
	FREEZE_SUPPORT_URL,
} from '../KeyFreezeStatusBanner';
import type { KeyFreezeStatus } from '@/hooks/useKeyFreeze';

// Issue #1121 — the freeze status banner must surface the freeze reason,
// the formatted expiry (or "indefinite"), and an admin contact link while
// the page disables every buy/sell control.

const EXPIRES_AT = '2026-10-18T15:30:00.000Z';

const baseFreeze: KeyFreezeStatus = {
	reason: 'Under review for suspicious trading activity',
	expiresAt: EXPIRES_AT,
	expiresAtMs: Date.parse(EXPIRES_AT),
};

function renderBanner(overrides: Partial<KeyFreezeStatus> = {}) {
	render(<KeyFreezeStatusBanner freeze={{ ...baseFreeze, ...overrides }} />);
}

describe('KeyFreezeStatusBanner', () => {
	it('renders an alert with the freeze title and reason', () => {
		renderBanner();
		const banner = screen.getByTestId('key-freeze-banner');
		expect(banner).toBeInTheDocument();
		expect(banner).toHaveAttribute('role', 'alert');
		expect(screen.getByTestId('key-freeze-banner-title')).toHaveTextContent(
			'This key is frozen'
		);
		expect(screen.getByTestId('key-freeze-reason')).toHaveTextContent(
			'Under review for suspicious trading activity'
		);
	});

	it('formats the expiry timestamp in a <time> element', () => {
		renderBanner();
		const time = screen.getByTestId('key-freeze-expiry');
		expect(time.tagName).toBe('TIME');
		expect(time).toHaveAttribute('dateTime', EXPIRES_AT);
		expect(time.textContent).toContain('October');
		expect(time.textContent).toContain('2026');
	});

	it('shows "indefinite" when the freeze has no expiry', () => {
		renderBanner({ expiresAt: null, expiresAtMs: null });
		expect(screen.getByTestId('key-freeze-expiry')).toHaveTextContent(
			'Freeze expires: indefinite'
		);
	});

	it('links to the admin contact route', () => {
		renderBanner();
		const link = screen.getByTestId('key-freeze-contact-link');
		expect(link).toHaveAttribute('href', FREEZE_SUPPORT_URL);
		expect(link).toHaveTextContent('Contact support');
	});

	it('states that buying and selling are disabled', () => {
		renderBanner();
		expect(screen.getByTestId('key-freeze-banner')).toHaveTextContent(
			'Buying and selling are disabled until the freeze is lifted.'
		);
	});
});
