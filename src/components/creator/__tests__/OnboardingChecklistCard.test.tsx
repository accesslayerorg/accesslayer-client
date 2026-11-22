import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import OnboardingChecklistCard from '../OnboardingChecklistCard';
import type { CreatorOnboardingChecklist } from '@/hooks/useCreatorOnboardingChecklist';
import {
	ONBOARDING_STEPS,
	getOnboardingProgress,
	type OnboardingCompletion,
	type OnboardingStepId,
} from '@/utils/creatorOnboarding.utils';

function makeChecklist(
	done: OnboardingStepId[],
	overrides: Partial<CreatorOnboardingChecklist> = {}
): CreatorOnboardingChecklist {
	const completion = Object.fromEntries(
		ONBOARDING_STEPS.map(step => [step.id, done.includes(step.id)])
	) as OnboardingCompletion;

	return {
		steps: ONBOARDING_STEPS.map(step => ({
			...step,
			completed: completion[step.id],
		})),
		...getOnboardingProgress(completion),
		isLoading: false,
		...overrides,
	};
}

function renderCard(checklist: CreatorOnboardingChecklist) {
	return render(
		<MemoryRouter>
			<OnboardingChecklistCard keyId="key-1" checklist={checklist} />
		</MemoryRouter>
	);
}

describe('OnboardingChecklistCard (#1248)', () => {
	it('renders all five steps in order', () => {
		renderCard(makeChecklist([]));

		const items = within(screen.getByRole('list')).getAllByRole('listitem');
		expect(items.map(item => item.getAttribute('data-testid'))).toEqual([
			'onboarding-step-price-floor',
			'onboarding-step-whitelist',
			'onboarding-step-announcement',
			'onboarding-step-staking-pool',
			'onboarding-step-distribution',
		]);
	});

	it('marks each step completed or pending from its status', () => {
		renderCard(makeChecklist(['whitelist', 'distribution']));

		const expected: Record<OnboardingStepId, 'completed' | 'pending'> = {
			'price-floor': 'pending',
			whitelist: 'completed',
			announcement: 'pending',
			'staking-pool': 'pending',
			distribution: 'completed',
		};

		for (const [id, status] of Object.entries(expected)) {
			expect(screen.getByTestId(`onboarding-step-${id}`)).toHaveAttribute(
				'data-status',
				status
			);
			expect(
				screen.getByTestId(`onboarding-step-${id}-status`)
			).toHaveTextContent(status === 'completed' ? 'Completed' : 'Pending');
		}
	});

	it('gives every step a CTA link to its dashboard panel', () => {
		renderCard(makeChecklist(['announcement']));

		const hrefs: Record<OnboardingStepId, string> = {
			'price-floor':
				'/creator/key-1/dashboard?tab=settings#graduated-curve-section',
			whitelist: '/creator/key-1/dashboard?tab=settings#whitelist-section',
			announcement:
				'/creator/key-1/dashboard?tab=overview#dashboard-announcements-section',
			'staking-pool':
				'/creator/key-1/dashboard?tab=settings#staking-pool-section',
			distribution:
				'/creator/key-1/dashboard?tab=revenue#distribute-revenue-section',
		};

		for (const [id, href] of Object.entries(hrefs)) {
			expect(
				screen.getByTestId(`onboarding-step-${id}-cta`)
			).toHaveAttribute('href', href);
		}
	});

	it('labels the CTA "Review" once a step is completed', () => {
		renderCard(makeChecklist(['whitelist']));

		expect(
			screen.getByTestId('onboarding-step-whitelist-cta')
		).toHaveTextContent('Review');
		expect(
			screen.getByTestId('onboarding-step-announcement-cta')
		).toHaveTextContent('Post announcement');
	});

	it.each([
		[0, 0],
		[2, 40],
		[4, 80],
	])('shows %i completed steps as a %i%% progress bar', (count, percent) => {
		renderCard(
			makeChecklist(ONBOARDING_STEPS.slice(0, count).map(step => step.id))
		);

		expect(screen.getByTestId('onboarding-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			String(percent)
		);
		expect(screen.getByTestId('onboarding-progress-label')).toHaveTextContent(
			`${percent}%`
		);
		expect(
			screen.getByText(`${count} of 5 steps complete`)
		).toBeInTheDocument();
	});

	it('renders nothing once every step is completed', () => {
		renderCard(makeChecklist(ONBOARDING_STEPS.map(step => step.id)));

		expect(
			screen.queryByTestId('onboarding-checklist')
		).not.toBeInTheDocument();
	});

	it('renders nothing while statuses are still loading', () => {
		renderCard(makeChecklist([], { isLoading: true }));

		expect(
			screen.queryByTestId('onboarding-checklist')
		).not.toBeInTheDocument();
	});
});
