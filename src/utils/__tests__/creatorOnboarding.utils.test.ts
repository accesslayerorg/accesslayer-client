import { describe, expect, it } from 'vitest';
import {
	ONBOARDING_STEPS,
	getOnboardingProgress,
	getOnboardingStepPath,
	type OnboardingCompletion,
	type OnboardingStepId,
} from '../creatorOnboarding.utils';

const ALL_IDS = ONBOARDING_STEPS.map(step => step.id);

function completionWith(done: OnboardingStepId[]): OnboardingCompletion {
	return Object.fromEntries(
		ALL_IDS.map(id => [id, done.includes(id)])
	) as OnboardingCompletion;
}

describe('creator onboarding utils (#1248)', () => {
	describe('ONBOARDING_STEPS', () => {
		it('lists the five steps in checklist order', () => {
			expect(ALL_IDS).toEqual([
				'price-floor',
				'whitelist',
				'announcement',
				'staking-pool',
				'distribution',
			]);
		});
	});

	describe('getOnboardingProgress', () => {
		it.each([
			[0, 0],
			[1, 20],
			[2, 40],
			[3, 60],
			[4, 80],
			[5, 100],
		])('reports %i completed step(s) as %i%%', (count, percent) => {
			const progress = getOnboardingProgress(
				completionWith(ALL_IDS.slice(0, count))
			);

			expect(progress.completedCount).toBe(count);
			expect(progress.totalCount).toBe(5);
			expect(progress.percent).toBe(percent);
		});

		it('is only complete when every step is complete', () => {
			expect(getOnboardingProgress(completionWith([])).isComplete).toBe(
				false
			);
			expect(
				getOnboardingProgress(completionWith(ALL_IDS.slice(0, 4)))
					.isComplete
			).toBe(false);
			expect(getOnboardingProgress(completionWith(ALL_IDS)).isComplete).toBe(
				true
			);
		});

		it('counts completed steps regardless of which ones they are', () => {
			const progress = getOnboardingProgress(
				completionWith(['whitelist', 'distribution'])
			);

			expect(progress.completedCount).toBe(2);
			expect(progress.percent).toBe(40);
		});
	});

	describe('getOnboardingStepPath', () => {
		it('targets the tab and section that host each step', () => {
			const paths = Object.fromEntries(
				ONBOARDING_STEPS.map(step => [
					step.id,
					getOnboardingStepPath(step, 'key-7'),
				])
			);

			expect(paths).toEqual({
				'price-floor':
					'/creator/key-7/dashboard?tab=settings#graduated-curve-section',
				whitelist:
					'/creator/key-7/dashboard?tab=settings#whitelist-section',
				announcement:
					'/creator/key-7/dashboard?tab=overview#dashboard-announcements-section',
				'staking-pool':
					'/creator/key-7/dashboard?tab=settings#staking-pool-section',
				distribution:
					'/creator/key-7/dashboard?tab=revenue#distribute-revenue-section',
			});
		});
	});
});
