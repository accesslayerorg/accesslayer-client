import { useState } from 'react';
import { FileSignature, Loader2 } from 'lucide-react';
import AllowanceApprovalStep from '@/components/common/AllowanceApprovalStep';
import SignPermitModal from '@/components/common/SignPermitModal';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { usePermit, resolvePermitApprovalMode } from '@/hooks/usePermit';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';
import type {
	PermitAllowanceConfig,
	PermitService,
	PermitTransferResult,
} from '@/types/permit';
import {
	createPermitDeadline,
	clampPermitDeadlineMinutes,
	DEFAULT_PERMIT_DEADLINE_MINUTES,
	MAX_PERMIT_DEADLINE_MINUTES,
} from '@/utils/permit.utils';

export interface PermitAllowanceStepProps {
	owner: string;
	keyId: string;
	amount: number;
	permitConfig?: PermitAllowanceConfig;
	isApproving: boolean;
	errorMessage: string | null;
	onApprove: () => void;
	onPermitTransferComplete?: (result: PermitTransferResult) => void;
}

function hasPermitDetails(
	config: PermitAllowanceConfig | undefined,
	owner: string,
	keyId: string
): config is PermitAllowanceConfig {
	return Boolean(
		config &&
		owner &&
		keyId &&
		config.contractId &&
		config.networkPassphrase &&
		config.spender &&
		config.recipient
	);
}

/** Chooses the signed path only when both contract and wallet support it. */
function shouldUseSignedPermit(
	config: PermitAllowanceConfig | undefined,
	service: PermitService,
	owner: string,
	keyId: string
): config is PermitAllowanceConfig {
	return (
		hasPermitDetails(config, owner, keyId) &&
		resolvePermitApprovalMode(service, config.signer) === 'permit'
	);
}

interface SignedPermitStepProps {
	owner: string;
	keyId: string;
	amount: number;
	config: PermitAllowanceConfig;
	service: PermitService;
	onComplete?: (result: PermitTransferResult) => void;
}

function SignedPermitStep({
	owner,
	keyId,
	amount,
	config,
	service,
	onComplete,
}: SignedPermitStepProps) {
	const maxDeadlineMinutes =
		config.maxDeadlineMinutes ?? MAX_PERMIT_DEADLINE_MINUTES;
	const [modalOpen, setModalOpen] = useState(false);
	const [deadlineMinutes, setDeadlineMinutes] = useState(
		clampPermitDeadlineMinutes(
			DEFAULT_PERMIT_DEADLINE_MINUTES,
			maxDeadlineMinutes
		)
	);
	const [deadlineBaseMs, setDeadlineBaseMs] = useState(() => Date.now());
	const deadline = createPermitDeadline(
		deadlineBaseMs,
		deadlineMinutes,
		maxDeadlineMinutes
	);

	const permit = usePermit({
		owner,
		spender: config.spender,
		recipient: config.recipient,
		key: keyId,
		amount,
		deadline,
		contractId: config.contractId,
		networkPassphrase: config.networkPassphrase,
		signer: config.signer,
		service,
	});

	const openReview = async () => {
		setDeadlineBaseMs(Date.now());
		setDeadlineMinutes(
			clampPermitDeadlineMinutes(
				DEFAULT_PERMIT_DEADLINE_MINUTES,
				maxDeadlineMinutes
			)
		);
		permit.resetError();
		await permit.refreshNonce();
		setModalOpen(true);
	};

	const submit = async () => {
		try {
			const result = await permit.submitPermitAndTransfer();
			setModalOpen(false);
			onComplete?.(result);
		} catch {
			// The hook retains and classifies the error for the open review modal.
		}
	};

	return (
		<>
			<div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-4">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
						<FileSignature
							className="size-3.5 text-emerald-300"
							aria-hidden="true"
						/>
					</div>
					<div>
						<p className="text-sm font-bold text-emerald-100">
							One-step signed approval
						</p>
						<p className="mt-1 text-xs leading-relaxed text-emerald-100/65">
							Review and sign an off-chain permit. The spender will
							submit the permit and key transfer together in one
							transaction.
						</p>
					</div>
				</div>

				<Button
					type="button"
					onClick={() => void openReview()}
					disabled={permit.isLoadingNonce}
					className="w-full rounded-xl font-bold"
				>
					<StableButtonContent
						isLoading={permit.isLoadingNonce}
						loadingLabel="Loading permit…"
						spinner={
							<Loader2
								className="size-4 animate-spin"
								aria-hidden="true"
							/>
						}
					>
						<FileSignature className="size-4" aria-hidden="true" />
						Review signed permit
					</StableButtonContent>
				</Button>
			</div>

			<SignPermitModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				payload={permit.payload}
				recipient={config.recipient}
				deadlineMinutes={deadlineMinutes}
				maxDeadlineMinutes={maxDeadlineMinutes}
				onDeadlineMinutesChange={minutes => {
					permit.resetError();
					setDeadlineMinutes(minutes);
				}}
				onSign={submit}
				isLoadingNonce={permit.isLoadingNonce}
				isSigning={permit.isSigning}
				errorMessage={permit.errorMessage}
			/>
		</>
	);
}

/**
 * Permit-aware allowance step. Unsupported wallets or contracts render the
 * existing two-transaction approval without attempting a nonce read.
 */
export default function PermitAllowanceStep({
	owner,
	keyId,
	amount,
	permitConfig,
	isApproving,
	errorMessage,
	onApprove,
	onPermitTransferComplete,
}: PermitAllowanceStepProps) {
	const service = permitConfig?.service ?? creatorKeysContractService;

	if (!shouldUseSignedPermit(permitConfig, service, owner, keyId)) {
		return (
			<AllowanceApprovalStep
				isApproving={isApproving}
				errorMessage={errorMessage}
				onApprove={onApprove}
			/>
		);
	}

	return (
		<SignedPermitStep
			owner={owner}
			keyId={keyId}
			amount={amount}
			config={permitConfig}
			service={service}
			onComplete={onPermitTransferComplete}
		/>
	);
}
