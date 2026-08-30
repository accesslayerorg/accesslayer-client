import type { SigningError, SigningStage } from '@/lib/signing';

const STEPS: Array<{ stage: SigningStage; label: string }> = [
	{ stage: 'preparing', label: 'Preparing transaction' },
	{ stage: 'waiting-for-signature', label: 'Waiting for signature' },
	{ stage: 'submitting', label: 'Submitting to Stellar' },
];

const STAGE_INDEX: Partial<Record<SigningStage, number>> = {
	idle: -1,
	preparing: 0,
	'waiting-for-signature': 1,
	submitting: 2,
	complete: 3,
};

interface SigningProgressProps {
	stage: SigningStage;
	failedAt?: 'preparing' | 'waiting-for-signature' | 'submitting';
	error?: SigningError;
	onCheckLedger?: () => void;
}

export function SigningProgress({
	stage,
	failedAt,
	error,
	onCheckLedger,
}: SigningProgressProps) {
	const activeIndex = STAGE_INDEX[stage] ?? -1;
	const failedIndex =
		stage === 'failed' ? (STAGE_INDEX[failedAt ?? 'preparing'] ?? 0) : -1;
	const showCheckLedger =
		error?.type === 'LedgerLocked' || error?.type === 'LedgerAppNotOpen';

	return (
		<div
			aria-live="polite"
			aria-busy={!['idle', 'complete', 'failed'].includes(stage)}
		>
			<ol className="space-y-2" aria-label="Transaction signing progress">
				{STEPS.map((step, index) => {
					const complete = stage === 'complete' || index < activeIndex;
					const active = index === activeIndex;
					const failed = index === failedIndex;
					return (
						<li
							key={step.stage}
							className={
								failed
									? 'text-red-600'
									: complete
										? 'text-emerald-600'
										: active
											? 'text-foreground'
											: 'text-muted-foreground'
							}
							aria-current={active ? 'step' : undefined}
						>
							<span aria-hidden="true">
								{failed ? '×' : complete ? '✓' : active ? '●' : '○'}
							</span>{' '}
							{step.label}
						</li>
					);
				})}
			</ol>
			{error && (
				<div role="alert" className="mt-3 text-sm text-red-600">
					<p>{error.hint}</p>
					{showCheckLedger && onCheckLedger && (
						<button
							type="button"
							className="mt-2 underline"
							onClick={onCheckLedger}
						>
							Check Ledger
						</button>
					)}
				</div>
			)}
		</div>
	);
}
