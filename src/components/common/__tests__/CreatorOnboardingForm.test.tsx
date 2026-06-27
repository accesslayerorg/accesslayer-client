import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CreatorOnboardingForm from '@/components/common/CreatorOnboardingForm';

describe('CreatorOnboardingForm', () => {
	it('announces the current onboarding step and updates it as fields receive focus', () => {
		render(<CreatorOnboardingForm />);

		const progress = screen.getByRole('navigation', {
			name: /creator onboarding progress: step 1 of 4/i,
		});

		expect(
			within(progress).getByRole('listitem', {
				name: /creator name, step 1 of 4, current/i,
			})
		).toHaveAttribute('aria-current', 'step');
		expect(
			within(progress).getByRole('listitem', {
				name: /email, step 2 of 4, upcoming/i,
			})
		).toBeInTheDocument();

		fireEvent.focus(screen.getByRole('textbox', { name: /email/i }));

		expect(
			screen.getByRole('navigation', {
				name: /creator onboarding progress: step 2 of 4/i,
			})
		).toBeInTheDocument();
		expect(
			within(progress).getByRole('listitem', {
				name: /creator name, step 1 of 4, completed/i,
			})
		).toBeInTheDocument();
		expect(
			within(progress).getByRole('listitem', {
				name: /email, step 2 of 4, current/i,
			})
		).toHaveAttribute('aria-current', 'step');
	});
});
