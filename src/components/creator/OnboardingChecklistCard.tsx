import { Link } from 'react-router';
import { CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { CreatorOnboardingChecklist } from '@/hooks/useCreatorOnboardingChecklist';
import { getOnboardingStepPath } from '@/utils/creatorOnboarding.utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

export interface OnboardingChecklistCardProps {
	keyId: string;
	checklist: CreatorOnboardingChecklist;
}

/**
 * Setup checklist shown at the top of the creator dashboard for a key that is
 * still being onboarded (#1248).
 *
 * Renders nothing while the first status load is in flight (so a fully
 * onboarded creator never sees a flash of "pending" steps) and nothing once
 * every step is complete.
 */
export default function OnboardingChecklistCard({
	keyId,
	checklist,
}: OnboardingChecklistCardProps) {
	const { steps, completedCount, totalCount, percent, isComplete, isLoading } =
		checklist;

	if (isLoading || isComplete) return null;

	return (
		<section
			className={CARD_CLASS}
			aria-labelledby="onboarding-checklist-heading"
			data-testid="onboarding-checklist"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2
						id="onboarding-checklist-heading"
						className="font-grotesque text-xl font-black tracking-tight"
					>
						Finish setting up your key
					</h2>
					<p className="mt-1 text-sm text-white/50">
						Complete these steps to get your key ready for holders.
					</p>
				</div>
				<span
					className="font-mono text-sm tabular-nums text-white/70"
					data-testid="onboarding-progress-label"
				>
					{percent}%
				</span>
			</div>

			<Progress
				value={percent}
				aria-label="Onboarding checklist progress"
				data-testid="onboarding-progress-bar"
				className="mt-4 h-1.5 bg-white/10 [&>div]:bg-emerald-400"
			/>
			<p className="mt-2 text-xs text-white/50">
				{completedCount} of {totalCount} steps complete
			</p>

			<ol className="mt-6 space-y-3">
				{steps.map(step => (
					<li
						key={step.id}
						data-testid={`onboarding-step-${step.id}`}
						data-status={step.completed ? 'completed' : 'pending'}
						className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="flex items-start gap-3">
							{step.completed ? (
								<CheckCircle2
									className="mt-0.5 size-5 shrink-0 text-emerald-400"
									aria-hidden="true"
								/>
							) : (
								<Circle
									className="mt-0.5 size-5 shrink-0 text-white/30"
									aria-hidden="true"
								/>
							)}
							<div>
								<p className="text-sm font-semibold text-white">
									{step.label}
									<span
										className={`ml-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] ${
											step.completed
												? 'text-emerald-400'
												: 'text-white/40'
										}`}
										data-testid={`onboarding-step-${step.id}-status`}
									>
										{step.completed ? 'Completed' : 'Pending'}
									</span>
								</p>
								<p className="mt-0.5 text-xs text-white/50">
									{step.description}
								</p>
							</div>
						</div>

						<Link
							to={getOnboardingStepPath(step, keyId)}
							data-testid={`onboarding-step-${step.id}-cta`}
							aria-label={`${step.completed ? 'Review' : step.ctaLabel}: ${step.label}`}
							className={`shrink-0 text-sm font-semibold underline-offset-4 hover:underline ${
								step.completed
									? 'text-white/50 hover:text-white/70'
									: 'text-amber-300 hover:text-amber-200'
							}`}
						>
							{step.completed ? 'Review' : step.ctaLabel}
						</Link>
					</li>
				))}
			</ol>
		</section>
	);
}
