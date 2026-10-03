import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DeprecationBanner from '../DeprecationBanner';

// Issue #996 — the deprecation notice flow. The banner must surface the
// deprecation date, reason and successor key, route its Migrate now CTA to
// the successor key's page, and be dismissible per visit.

const FULL_DEPRECATION = {
	deprecatedAt: '2026-09-01T00:00:00.000Z',
	reason: 'Issuer rotated to a new key after a compromise',
	successorId: 'succ-123',
	successorName: 'Artist New Key',
};

function renderBanner(overrides: Partial<typeof FULL_DEPRECATION> = {}) {
	const onDismiss = jest.fn();
	render(
		<MemoryRouter>
			<DeprecationBanner
				deprecation={{ ...FULL_DEPRECATION, ...overrides }}
				onDismiss={onDismiss}
			/>
		</MemoryRouter>
	);
	return { onDismiss };
}

describe('DeprecationBanner', () => {
	it('shows the deprecation date, reason and successor key', () => {
		renderBanner();
		expect(screen.getByTestId('deprecation-banner')).toBeInTheDocument();
		const details = screen.getByTestId('deprecation-details');
		expect(details.textContent).toContain('September 1, 2026');
		expect(details.textContent).toContain(
			'Issuer rotated to a new key after a compromise'
		);
		expect(details.textContent).toContain('Artist New Key');
	});

	it('routes the Migrate now CTA to the successor key page', () => {
		renderBanner();
		const cta = screen.getByTestId('migrate-now-cta');
		expect(cta).toHaveAttribute('href', '/creator/succ-123');
		expect(cta.textContent).toContain('Migrate now');
	});

	it('omits the CTA when no successor key is designated', () => {
		renderBanner({ successorId: undefined, successorName: undefined });
		expect(screen.queryByTestId('migrate-now-cta')).toBeNull();
	});

	it('dismisses via the close button', () => {
		const { onDismiss } = renderBanner();
		fireEvent.click(screen.getByTestId('deprecation-banner-dismiss'));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('renders a raw date when the timestamp is unparseable', () => {
		renderBanner({ deprecatedAt: 'not-a-date' });
		expect(screen.getByTestId('deprecation-details').textContent).toContain(
			'not-a-date'
		);
	});
});
