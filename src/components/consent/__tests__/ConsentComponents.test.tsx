import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import ConsentBanner from '@/components/consent/ConsentBanner';
import ConsentPreferences from '@/components/consent/ConsentPreferences';
import Footer from '@/components/home/Footer';
import { useConsent } from '@/hooks/useConsent';

function renderConsentCenter() {
	return render(
		<>
			<ConsentBanner />
			<ConsentPreferences />
		</>
	);
}

describe('consent components', () => {
	beforeEach(() => {
		localStorage.clear();
		useConsent.setState({ preferences: null, preferencesOpen: false });
	});

	it('shows a keyboard-operable banner without making it a modal', () => {
		renderConsentCenter();

		expect(
			screen.getByRole('region', { name: /privacy choices/i })
		).toBeVisible();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Accept all' })).toBeEnabled();
		expect(
			screen.getByRole('button', { name: 'Reject non-essential' })
		).toBeEnabled();
	});

	it('opens the preference center and saves the selected categories', () => {
		renderConsentCenter();

		fireEvent.click(screen.getByRole('button', { name: 'Customize' }));

		expect(
			screen.getByRole('dialog', { name: 'Privacy preferences' })
		).toBeVisible();
		expect(screen.getByText('Always on')).toBeVisible();
		const analytics = screen.getByRole('checkbox', { name: /analytics/i });
		const errorReporting = screen.getByRole('checkbox', {
			name: /error reporting/i,
		});
		fireEvent.click(analytics);
		fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

		expect(useConsent.getState().preferences).toEqual({
			analytics: true,
			errorReporting: false,
		});
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.queryByTestId('consent-banner')).not.toBeInTheDocument();
		expect(errorReporting).not.toBeChecked();
	});

	it('reopens the preference center from the footer', () => {
		useConsent.getState().rejectNonEssential();
		render(
			<MemoryRouter>
				<Footer />
				<ConsentPreferences />
			</MemoryRouter>
		);

		fireEvent.click(
			screen.getByRole('button', { name: 'Privacy preferences' })
		);

		expect(
			screen.getByRole('dialog', { name: 'Privacy preferences' })
		).toBeVisible();
	});
});
