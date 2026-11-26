import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Stepper from '@/components/common/Stepper';
import KeyFactoryCurvePreview from '@/components/common/KeyFactoryCurvePreview';
import WhitelistUploadInput from '@/components/common/WhitelistUploadInput';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { truncateTxHash } from '@/constants/stellar';
import {
	canAdvanceToStep,
	getDraftInitialPriceXlm,
	KEY_FACTORY_STEPS,
	parseWhitelistInput,
	validateKeyFactoryDraft,
	validateKeyFactoryStep,
	type KeyFactoryDraft,
} from '@/utils/keyFactory.utils';
import type { KeyDeploymentStatus } from '@/services/keyFactory.service';

export interface KeyFactoryWizardProps {
	/** Wallet deploying the key. */
	deployer: string;
	/** Current wizard draft. */
	draft: KeyFactoryDraft;
	/** Applies a partial draft update and re-renders the wizard. */
	onDraftChange: (patch: Partial<KeyFactoryDraft>) => void;
	/** Whether the deployment transaction is being submitted. */
	isDeploying?: boolean;
	/** Status of the submitted deployment, once known. */
	deploymentStatus?: KeyDeploymentStatus | null;
	/** Transaction hash of the submitted deployment. */
	transactionHash?: string | null;
	/** Id of the newly deployed key, once known. */
	deployedKeyId?: string | null;
	/** Submits the deployment through the factory contract. */
	onDeploy: () => void;
	className?: string;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

const DEPLOYMENT_STATUS_COPY: Record<KeyDeploymentStatus, string> = {
	submitted: 'Deployment submitted. Waiting for the factory contract…',
	pending: 'Deployment pending on-chain…',
	confirmed: 'Deployment confirmed. Opening your new key…',
	failed: 'Deployment failed. No key was created.',
};

/**
 * Step-by-step key factory deployment wizard (#959).
 *
 * Collects key details, the bonding-curve configuration, the launch mode, and
 * an optional bulk whitelist, previewing the curve before the creator deploys.
 * Every step validates before the creator can advance, and a successful
 * deployment redirects to the new key's detail page.
 */
export const KeyFactoryWizard: React.FC<KeyFactoryWizardProps> = ({
	deployer,
	draft,
	onDraftChange,
	isDeploying = false,
	deploymentStatus = null,
	transactionHash = null,
	deployedKeyId = null,
	onDeploy,
	className,
}) => {
	const navigate = useNavigate();
	const [stepIndex, setStepIndex] = useState(0);
	const [showErrors, setShowErrors] = useState(false);

	const step = KEY_FACTORY_STEPS[stepIndex];
	const validation = validateKeyFactoryStep(step.value, draft);
	const draftValidation = validateKeyFactoryDraft(draft);
	const whitelist = useMemo(
		() => parseWhitelistInput(draft.whitelistInput),
		[draft.whitelistInput]
	);

	const errorFor = (field: string): string | undefined =>
		showErrors ? validation.errors[field] : undefined;

	const isLastStep = stepIndex === KEY_FACTORY_STEPS.length - 1;
	const isDeploymentSettled =
		deploymentStatus === 'confirmed' || deploymentStatus === 'failed';

	const handleNext = () => {
		if (!validation.isValid) {
			setShowErrors(true);
			return;
		}
		setShowErrors(false);
		if (isLastStep) {
			onDeploy();
			return;
		}
		setStepIndex(index => Math.min(index + 1, KEY_FACTORY_STEPS.length - 1));
	};

	const handleBack = () => {
		setShowErrors(false);
		setStepIndex(index => Math.max(index - 1, 0));
	};

	const handleStepClick = (targetIndex: number) => {
		if (!canAdvanceToStep(draft, targetIndex)) return;
		setShowErrors(false);
		setStepIndex(targetIndex);
	};

	// `Stepper` reports 1-based step numbers; the wizard tracks a 0-based index.
	const handleStepperClick = (stepNumber: number) => {
		handleStepClick(stepNumber - 1);
	};

	// Once the deployment confirms, send the creator to the new key's page.
	if (deploymentStatus === 'confirmed' && deployedKeyId) {
		return (
			<section className={className} data-testid="key-factory-deploy-success">
				<div className="flex items-center gap-3 text-emerald-300">
					<CheckCircle2 className="size-6" aria-hidden="true" />
					<h2 className="font-grotesque text-xl font-black tracking-tight">
						Key deployed
					</h2>
				</div>
				<p className="mt-2 text-sm text-white/60">
					Your new key is live. Taking you to its detail page…
				</p>
				<Button
					type="button"
					className="mt-4 rounded-xl"
					onClick={() => navigate(`/creators/${deployedKeyId}`)}
					data-testid="key-factory-view-key"
				>
					View key
				</Button>
			</section>
		);
	}

	return (
		<section className={className} data-testid="key-factory-wizard">
			<Stepper
				currentStep={stepIndex + 1}
				totalSteps={KEY_FACTORY_STEPS.length}
				steps={KEY_FACTORY_STEPS.map(entry => entry.label)}
				clickableSteps
				onStepClick={handleStepperClick}
				ariaLabel="Key deployment progress"
			/>

			<div className="mt-8">
				<h2
					className="font-grotesque text-xl font-black tracking-tight text-white"
					data-testid="key-factory-step-title"
				>
					{step.label}
				</h2>
				<p className="mt-1 text-sm text-white/50">
					Step {stepIndex + 1} of {KEY_FACTORY_STEPS.length}
				</p>
			</div>

			{/* Step 1 — key details */}
			{step.value === 'details' && (
				<div className="mt-6 space-y-4" data-testid="key-factory-step-details">
					<div className="space-y-1.5">
						<label
							htmlFor="key-factory-name"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Key name
						</label>
						<input
							id="key-factory-name"
							type="text"
							className={fieldClass}
							value={draft.name}
							disabled={isDeploying}
							placeholder="My creator key"
							aria-invalid={errorFor('name') ? 'true' : undefined}
							onChange={event =>
								onDraftChange({ name: event.target.value })
							}
							data-testid="key-factory-name-input"
						/>
						{errorFor('name') && (
							<p role="alert" className="text-xs text-red-400">
								{errorFor('name')}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="key-factory-description"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Description
						</label>
						<textarea
							id="key-factory-description"
							rows={3}
							className={fieldClass}
							value={draft.description}
							disabled={isDeploying}
							placeholder="What is this key for?"
							aria-invalid={errorFor('description') ? 'true' : undefined}
							onChange={event =>
								onDraftChange({ description: event.target.value })
							}
							data-testid="key-factory-description-input"
						/>
						{errorFor('description') && (
							<p role="alert" className="text-xs text-red-400">
								{errorFor('description')}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="key-factory-category"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Category
						</label>
						<input
							id="key-factory-category"
							type="text"
							className={fieldClass}
							value={draft.category}
							disabled={isDeploying}
							placeholder="Education"
							aria-invalid={errorFor('category') ? 'true' : undefined}
							onChange={event =>
								onDraftChange({ category: event.target.value })
							}
							data-testid="key-factory-category-input"
						/>
						{errorFor('category') && (
							<p role="alert" className="text-xs text-red-400">
								{errorFor('category')}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Step 2 — bonding curve config + live preview */}
			{step.value === 'curve' && (
				<div
					className="mt-6 space-y-4"
					data-testid="key-factory-step-curve"
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div className="space-y-1.5">
							<label
								htmlFor="key-factory-base-price"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Base price (XLM)
							</label>
							<input
								id="key-factory-base-price"
								inputMode="decimal"
								className={fieldClass}
								value={draft.basePriceXlm}
								disabled={isDeploying}
								placeholder="1.00"
								aria-invalid={
									errorFor('basePriceXlm') ? 'true' : undefined
								}
								onChange={event =>
									onDraftChange({ basePriceXlm: event.target.value })
								}
								data-testid="key-factory-base-price-input"
							/>
							{errorFor('basePriceXlm') && (
								<p role="alert" className="text-xs text-red-400">
									{errorFor('basePriceXlm')}
								</p>
							)}
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="key-factory-growth-factor"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Growth factor
							</label>
							<input
								id="key-factory-growth-factor"
								inputMode="decimal"
								className={fieldClass}
								value={draft.growthFactor}
								disabled={isDeploying}
								placeholder="1.01"
								aria-invalid={
									errorFor('growthFactor') ? 'true' : undefined
								}
								onChange={event =>
									onDraftChange({ growthFactor: event.target.value })
								}
								data-testid="key-factory-growth-factor-input"
							/>
							{errorFor('growthFactor') && (
								<p role="alert" className="text-xs text-red-400">
									{errorFor('growthFactor')}
								</p>
							)}
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="key-factory-max-supply"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Max supply
							</label>
							<input
								id="key-factory-max-supply"
								inputMode="numeric"
								className={fieldClass}
								value={draft.maxSupply}
								disabled={isDeploying}
								placeholder="1000"
								aria-invalid={errorFor('maxSupply') ? 'true' : undefined}
								onChange={event =>
									onDraftChange({ maxSupply: event.target.value })
								}
								data-testid="key-factory-max-supply-input"
							/>
							{errorFor('maxSupply') && (
								<p role="alert" className="text-xs text-red-400">
									{errorFor('maxSupply')}
								</p>
							)}
						</div>
					</div>

					<KeyFactoryCurvePreview
						draft={draft}
						isValid={validateKeyFactoryStep('curve', draft).isValid}
						className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
					/>
				</div>
			)}

			{/* Step 3 — auction vs direct launch */}
			{step.value === 'launch' && (
				<div className="mt-6 space-y-4" data-testid="key-factory-step-launch">
					<fieldset className="space-y-3">
						<legend className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
							Launch mode
						</legend>

						{(
							[
								{
									value: 'direct',
									label: 'Direct launch',
									description:
										'The key opens for trading on the bonding curve immediately.',
								},
								{
									value: 'auction',
									label: 'Auction launch',
									description:
										'The first keys are sold at a fixed price to whitelisted buyers.',
								},
							] as const
						).map(option => (
							<label
								key={option.value}
								className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
							>
								<input
									type="radio"
									name="key-factory-launch-mode"
									value={option.value}
									checked={draft.launchMode === option.value}
									disabled={isDeploying}
									onChange={() =>
										onDraftChange({ launchMode: option.value })
									}
									data-testid={`key-factory-launch-${option.value}`}
									className="mt-1"
								/>
								<span>
									<span className="block text-sm font-bold text-white">
										{option.label}
									</span>
									<span className="mt-1 block text-xs text-white/55">
										{option.description}
									</span>
								</span>
							</label>
						))}
					</fieldset>

					{draft.launchMode === 'auction' && (
						<div className="space-y-1.5">
							<label
								htmlFor="key-factory-auction-price"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Auction price (XLM)
							</label>
							<input
								id="key-factory-auction-price"
								inputMode="decimal"
								className={fieldClass}
								value={draft.auctionPriceXlm}
								disabled={isDeploying}
								placeholder="5.00"
								aria-invalid={
									errorFor('auctionPriceXlm') ? 'true' : undefined
								}
								onChange={event =>
									onDraftChange({ auctionPriceXlm: event.target.value })
								}
								data-testid="key-factory-auction-price-input"
							/>
							{errorFor('auctionPriceXlm') && (
								<p role="alert" className="text-xs text-red-400">
									{errorFor('auctionPriceXlm')}
								</p>
							)}
						</div>
					)}
				</div>
			)}

			{/* Step 4 — bulk whitelist upload */}
			{step.value === 'whitelist' && (
				<div className="mt-6" data-testid="key-factory-step-whitelist">
					<WhitelistUploadInput
						value={draft.whitelistInput}
						disabled={isDeploying}
						error={errorFor('whitelistInput')}
						onChange={value => onDraftChange({ whitelistInput: value })}
					/>
				</div>
			)}

			{/* Step 5 — review & deploy */}
			{step.value === 'review' && (
				<div className="mt-6 space-y-6" data-testid="key-factory-step-review">
					<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{[
							{ label: 'Name', value: draft.name || '—' },
							{ label: 'Category', value: draft.category || '—' },
							{
								label: 'Initial price',
								value: formatXlmPrice(getDraftInitialPriceXlm(draft)),
							},
							{
								label: 'Launch mode',
								value:
									draft.launchMode === 'auction'
										? `Auction at ${draft.auctionPriceXlm || '—'} XLM`
										: 'Direct launch',
							},
							{
								label: 'Max supply',
								value: draft.maxSupply || '—',
							},
							{
								label: 'Whitelisted wallets',
								value: String(whitelist.addresses.length),
							},
							{
								label: 'Deployer',
								value: deployer || '—',
							},
						].map(row => (
							<div
								key={row.label}
								className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
							>
								<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
									{row.label}
								</dt>
								<dd className="mt-1 break-words text-sm text-white">
									{row.value}
								</dd>
							</div>
						))}
					</dl>

					{!draftValidation.isValid && showErrors && (
						<p
							role="alert"
							className="text-sm text-red-400"
							data-testid="key-factory-review-errors"
						>
							Fix the highlighted steps before deploying.
						</p>
					)}

					{deploymentStatus && (
						<div
							role="status"
							className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75"
							data-testid="key-factory-deployment-status"
						>
							{isDeploymentSettled ? null : (
								<Loader2
									className="size-4 animate-spin"
									aria-hidden="true"
								/>
							)}
							<span>
								{DEPLOYMENT_STATUS_COPY[deploymentStatus]}
							</span>
							{transactionHash && (
								<span
									className="font-mono text-xs text-white/50"
									data-testid="key-factory-deployment-tx"
								>
									{truncateTxHash(transactionHash)}
								</span>
							)}
						</div>
					)}
				</div>
			)}

			{/* Wizard navigation */}
			<div className="mt-8 flex flex-wrap items-center gap-3">
				<Button
					type="button"
					variant="outline"
					className="rounded-xl"
					onClick={handleBack}
					disabled={stepIndex === 0 || isDeploying}
					data-testid="key-factory-back"
				>
					Back
				</Button>

				<Button
					type="button"
					className="rounded-xl"
					onClick={handleNext}
					disabled={isDeploying}
					data-testid={
						isLastStep ? 'key-factory-deploy' : 'key-factory-next'
					}
				>
					{isLastStep ? (
						<>
							<Rocket className="mr-2 size-4" aria-hidden="true" />
							{isDeploying ? 'Deploying…' : 'Deploy key'}
						</>
					) : (
						'Continue'
					)}
				</Button>
			</div>
		</section>
	);
};

export default KeyFactoryWizard;
