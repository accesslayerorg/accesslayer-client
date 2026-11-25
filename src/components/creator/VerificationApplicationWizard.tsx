import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import Stepper from '@/components/common/Stepper';
import { Button } from '@/components/ui/button';
import type { VerificationApplicationDraft } from '@/services/creatorVerification.service';
import {
	validateVerificationDraft,
	formatVerificationTimestamp,
} from '@/utils/verificationApplication.utils';

export type ProofCheckState =
	| { status: 'unchecked' }
	| { status: 'verified'; checkedAt: string }
	| { status: 'not_found'; checkedAt: string };

export interface VerificationApplicationWizardProps {
	draft: VerificationApplicationDraft;
	onDraftChange: (draft: VerificationApplicationDraft) => void;
	onSubmit: () => void;
	isSubmitting: boolean;
	submitLabel?: string;
	proofCheck?: ProofCheckState;
	onCheckProof?: () => void;
}

const STEPS = ['Identity', 'Social proofs', 'Review'];

const inputClass =
	'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-jakarta text-sm text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none';

export default function VerificationApplicationWizard({
	draft,
	onDraftChange,
	onSubmit,
	isSubmitting,
	submitLabel = 'Submit application',
	proofCheck = { status: 'unchecked' },
	onCheckProof,
}: VerificationApplicationWizardProps) {
	const [step, setStep] = useState(1);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const stepErrors = () => {
		const all = validateVerificationDraft(draft);
		if (step === 1) {
			return all.legalName ? { legalName: all.legalName } : {};
		}
		if (step === 2) {
			return {
				...(all.socialUrls ? { socialUrls: all.socialUrls } : {}),
				...(all.proofCode ? { proofCode: all.proofCode } : {}),
			};
		}
		return all;
	};

	const handleNext = () => {
		const nextErrors = stepErrors();
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length === 0) {
			setStep(current => Math.min(current + 1, 3));
		}
	};

	const handleSubmit = () => {
		const nextErrors = validateVerificationDraft(draft);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length === 0) onSubmit();
	};

	const updateSocialUrl = (index: number, value: string) => {
		const socialUrls = [...draft.socialUrls];
		socialUrls[index] = value;
		onDraftChange({ ...draft, socialUrls });
	};

	return (
		<section
			aria-labelledby="verification-application-heading"
			data-testid="verification-application-wizard"
			className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md"
		>
			<h2
				id="verification-application-heading"
				className="font-grotesque text-xl font-bold text-white"
			>
				Apply for verified status
			</h2>
			<Stepper
				currentStep={step}
				totalSteps={3}
				steps={STEPS}
				ariaLabel="Verification application"
				className="my-5"
			/>

			{step === 1 && (
				<div data-testid="verification-step-identity">
					<label
						htmlFor="verification-legal-name"
						className="block font-jakarta text-sm font-bold text-white/80"
					>
						Legal name
					</label>
					<input
						id="verification-legal-name"
						value={draft.legalName}
						onChange={event =>
							onDraftChange({ ...draft, legalName: event.target.value })
						}
						aria-invalid={Boolean(errors.legalName)}
						aria-describedby={errors.legalName ? 'legal-name-error' : undefined}
						className={`mt-2 ${inputClass}`}
						placeholder="Full legal name"
					/>
					{errors.legalName && (
						<p id="legal-name-error" role="alert" className="mt-1 text-xs text-red-300">
							{errors.legalName}
						</p>
					)}
				</div>
			)}

			{step === 2 && (
				<div data-testid="verification-step-social" className="space-y-5">
					<div>
						<span className="block font-jakarta text-sm font-bold text-white/80">
							Verified social accounts
						</span>
						{draft.socialUrls.map((url, index) => (
							<div key={index} className="mt-2 flex gap-2">
								<input
									aria-label={`Social account link ${index + 1}`}
									value={url}
									onChange={event => updateSocialUrl(index, event.target.value)}
									aria-invalid={Boolean(errors.socialUrls)}
									className={inputClass}
									placeholder="https://x.com/your-handle"
								/>
								{draft.socialUrls.length > 1 && (
									<Button
										type="button"
										variant="outline"
										aria-label={`Remove social link ${index + 1}`}
										onClick={() =>
											onDraftChange({
												...draft,
												socialUrls: draft.socialUrls.filter(
													(_, itemIndex) => itemIndex !== index
												),
											})
										}
									>
										<X className="size-4" aria-hidden="true" />
									</Button>
								)}
							</div>
						))}
						{errors.socialUrls && (
							<p role="alert" className="mt-1 text-xs text-red-300">
								{errors.socialUrls}
							</p>
						)}
						<Button
							type="button"
							variant="outline"
							className="mt-2"
							onClick={() =>
								onDraftChange({ ...draft, socialUrls: [...draft.socialUrls, ''] })
							}
						>
							<Plus className="size-4" aria-hidden="true" /> Add another link
						</Button>
					</div>

					<div>
						<span className="block font-jakarta text-sm font-bold text-white/80">
							Proof code
						</span>
						<p className="mt-1 font-jakarta text-xs text-white/50">
							Post this code from one of the accounts above, then check the post.
						</p>
						<code
							data-testid="verification-proof-code"
							className="mt-2 block rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 font-mono text-sm font-bold text-amber-200"
						>
							{draft.proofCode}
						</code>
						{errors.proofCode && (
							<p role="alert" className="mt-1 text-xs text-red-300">
								{errors.proofCode}
							</p>
						)}
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={onCheckProof}
								disabled={!onCheckProof}
								data-testid="verification-check-proof"
							>
								Check proof post
							</Button>
							<span
								data-testid="verification-proof-check-state"
								data-state={proofCheck.status}
								className="font-jakarta text-xs text-white/60"
							>
								{proofCheck.status === 'verified' &&
									`Proof verified at ${formatVerificationTimestamp(proofCheck.checkedAt)}`}
								{proofCheck.status === 'not_found' &&
									`No post found (checked ${formatVerificationTimestamp(proofCheck.checkedAt)})`}
								{proofCheck.status === 'unchecked' && 'Proof not checked yet'}
							</span>
						</div>
					</div>
				</div>
			)}

			{step === 3 && (
				<div data-testid="verification-step-review" className="space-y-2 font-jakarta text-sm text-white/70">
					<p>
						<strong className="text-white">Legal name:</strong> {draft.legalName}
					</p>
					<p>
						<strong className="text-white">Social links:</strong>{' '}
						{draft.socialUrls.filter(Boolean).join(', ')}
					</p>
					<p>
						<strong className="text-white">Proof code:</strong>{' '}
						<code className="font-mono text-amber-200">{draft.proofCode}</code>
					</p>
					{errors.legalName && (
						<p role="alert" className="text-xs text-red-300">{errors.legalName}</p>
					)}
					{errors.socialUrls && (
						<p role="alert" className="text-xs text-red-300">{errors.socialUrls}</p>
					)}
				</div>
			)}

			<div className="mt-6 flex items-center justify-between gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => setStep(current => Math.max(1, current - 1))}
					disabled={step === 1}
				>
					Back
				</Button>
				{step < 3 ? (
					<Button type="button" onClick={handleNext}>
						Continue
					</Button>
				) : (
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={isSubmitting}
						data-testid="verification-submit"
					>
						<Check className="size-4" aria-hidden="true" />
						{isSubmitting ? 'Submitting…' : submitLabel}
					</Button>
				)}
			</div>
		</section>
	);
}
