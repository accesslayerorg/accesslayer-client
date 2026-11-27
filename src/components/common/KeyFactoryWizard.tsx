import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Stepper from '@/components/common/Stepper';
import { truncateTxHash } from '@/constants/stellar';
import {
	canAdvanceToStep,
	KEY_FACTORY_STEPS,
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
	draft,
	isDeploying = false,
	deploymentStatus = null,
	transactionHash = null,
	deployedKeyId = null,
	onDeploy,
	className,
}) => {
	const navigate = useNavigate();
	const [stepIndex, setStepIndex] = useState(0);
	const [, setShowErrors] = useState(false);

	const step = KEY_FACTORY_STEPS[stepIndex];
	const validation = validateKeyFactoryStep(step.value, draft);
	const draftValidation = validateKeyFactoryDraft(draft);

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

			<div className="mt-8 flex items-center justify-between gap-3">
				<Button
					type="button"
					variant="outline"
					disabled={stepIndex === 0 || isDeploying}
					onClick={handleBack}
					data-testid="key-factory-back"
				>
					Back
				</Button>
				<Button
					type="button"
					disabled={isDeploying || isDeploymentSettled || (!draftValidation.isValid && isLastStep)}
					onClick={handleNext}
					data-testid="key-factory-next"
				>
					{isLastStep ? (
						<>
							{isDeploying ? (
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							) : (
								<Rocket className="size-4" aria-hidden="true" />
							)}
							Deploy key
						</>
					) : (
						'Next'
					)}
				</Button>
			</div>

			{deploymentStatus && (
				<div className="mt-6 space-y-2 text-sm text-white/60" data-testid="key-factory-deployment-status">
					<p>{DEPLOYMENT_STATUS_COPY[deploymentStatus]}</p>
					{transactionHash && (
						<p className="font-mono text-xs">Tx {truncateTxHash(transactionHash)}</p>
					)}
				</div>
			)}
		</section>
	);
};

export default KeyFactoryWizard;
