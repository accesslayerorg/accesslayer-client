import { useState } from 'react';
import { LifeBuoy, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PendingRecoveryBanner from '@/components/recovery/PendingRecoveryBanner';
import RecoveryRiskNotice from '@/components/recovery/RecoveryRiskNotice';
import RecoveryStatusCard from '@/components/recovery/RecoveryStatusCard';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useNowMs } from '@/hooks/useNowMs';
import { useSocialRecovery } from '@/hooks/useSocialRecovery';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { truncateWalletAddress } from '@/utils/referral.utils';
import {
	MAX_GUARDIANS,
	MIN_GUARDIANS,
	MIN_THRESHOLD,
	RECOVERY_DELAY_MS,
	defaultThreshold,
	normalizeAddress,
	pendingRequestForOwner,
	validateGuardianAddress,
	type GuardianConfig,
	type GuardianSetErrors,
} from '@/utils/socialRecovery.utils';

interface GuardianSetupFormProps {
	owner: string;
	config?: GuardianConfig;
	locked: boolean;
}

function GuardianSetupForm({ owner, config, locked }: GuardianSetupFormProps) {
	const saveGuardians = useSocialRecovery(state => state.saveGuardians);

	const [guardians, setGuardians] = useState<string[]>(
		() => config?.guardians ?? []
	);
	const [threshold, setThreshold] = useState<number>(
		() => config?.threshold ?? defaultThreshold(MIN_GUARDIANS)
	);
	const [candidate, setCandidate] = useState('');
	const [candidateError, setCandidateError] = useState<string | null>(null);
	const [errors, setErrors] = useState<GuardianSetErrors>({});
	const [acknowledged, setAcknowledged] = useState(false);
	const [saved, setSaved] = useState(false);

	const delayMs = config?.delayMs ?? RECOVERY_DELAY_MS;
	const maxThreshold = Math.max(MIN_THRESHOLD, guardians.length);
	const thresholdOptions = Array.from(
		{ length: maxThreshold - MIN_THRESHOLD + 1 },
		(_, index) => MIN_THRESHOLD + index
	);

	const handleAdd = (event: React.FormEvent) => {
		event.preventDefault();
		const error = validateGuardianAddress(candidate, guardians, owner);
		if (error) {
			setCandidateError(error);
			return;
		}
		setGuardians([...guardians, normalizeAddress(candidate)]);
		setCandidate('');
		setCandidateError(null);
		setErrors({});
		setSaved(false);
	};

	const handleRemove = (address: string) => {
		const next = guardians.filter(item => item !== address);
		setGuardians(next);
		setThreshold(current =>
			Math.max(MIN_THRESHOLD, Math.min(current, next.length))
		);
		setErrors({});
		setSaved(false);
	};

	const handleSave = () => {
		const result = saveGuardians(owner, guardians, threshold);
		if (!result.ok) {
			setErrors(result.errors);
			setSaved(false);
			return;
		}
		setErrors({});
		setSaved(true);
	};

	return (
		<section
			aria-labelledby="guardians-heading"
			className="rounded-xl border border-border p-6"
		>
			<div className="mb-4 flex items-center gap-3">
				<ShieldCheck
					className="size-5 text-foreground"
					aria-hidden="true"
				/>
				<div>
					<h2
						id="guardians-heading"
						className="font-jakarta text-lg font-semibold"
					>
						Guardians
					</h2>
					<p className="text-xs text-muted-foreground">
						Add {MIN_GUARDIANS} to {MAX_GUARDIANS} trusted Stellar
						wallets. {guardians.length} of {MAX_GUARDIANS} added.
					</p>
				</div>
			</div>

			{locked && (
				<p className="mb-4 text-xs text-amber-300" role="status">
					Guardians cannot change while a recovery is pending. Cancel it
					first.
				</p>
			)}

			<form onSubmit={handleAdd} className="space-y-2" noValidate>
				<Label htmlFor="guardian-address">Guardian address</Label>
				<div className="flex gap-2">
					<Input
						id="guardian-address"
						value={candidate}
						onChange={e => {
							setCandidate(e.target.value);
							setCandidateError(null);
						}}
						aria-invalid={Boolean(candidateError)}
						aria-describedby={
							candidateError ? 'guardian-address-error' : undefined
						}
						className="font-mono text-sm"
						placeholder="G..."
						spellCheck={false}
						autoComplete="off"
						disabled={locked}
					/>
					<Button
						type="submit"
						disabled={locked || guardians.length >= MAX_GUARDIANS}
					>
						<UserPlus aria-hidden="true" />
						Add guardian
					</Button>
				</div>
				{candidateError && (
					<p
						id="guardian-address-error"
						role="alert"
						className="text-xs text-destructive"
					>
						{candidateError}
					</p>
				)}
			</form>

			{guardians.length === 0 ? (
				<p className="mt-4 text-sm text-muted-foreground">
					No guardians added yet.
				</p>
			) : (
				<ul
					className="mt-4 divide-y divide-border"
					aria-label="Guardian list"
				>
					{guardians.map(address => (
						<li
							key={address}
							className="flex items-center justify-between gap-3 py-2"
						>
							<span className="font-mono text-xs" title={address}>
								{truncateWalletAddress(address)}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`Remove guardian ${truncateWalletAddress(address)}`}
								onClick={() => handleRemove(address)}
								disabled={locked}
							>
								<Trash2 className="size-4" aria-hidden="true" />
							</Button>
						</li>
					))}
				</ul>
			)}
			{errors.guardians && (
				<p role="alert" className="mt-2 text-xs text-destructive">
					{errors.guardians}
				</p>
			)}

			<div className="mt-4">
				<Label htmlFor="guardian-threshold">Approvals required</Label>
				<select
					id="guardian-threshold"
					value={threshold}
					onChange={e => {
						setThreshold(Number(e.target.value));
						setSaved(false);
					}}
					disabled={locked}
					className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
				>
					{thresholdOptions.map(option => (
						<option key={option} value={option}>
							{option} of {Math.max(guardians.length, option)}
						</option>
					))}
				</select>
				{errors.threshold && (
					<p role="alert" className="mt-1 text-xs text-destructive">
						{errors.threshold}
					</p>
				)}
			</div>

			<div className="mt-4">
				<RecoveryRiskNotice
					threshold={threshold}
					guardianCount={guardians.length}
					delayMs={delayMs}
					acknowledged={acknowledged}
					onAcknowledgedChange={setAcknowledged}
				/>
			</div>

			<div className="mt-4 flex items-center gap-3">
				<Button
					type="button"
					onClick={handleSave}
					disabled={locked || !acknowledged}
				>
					Save guardians
				</Button>
				{saved && (
					<p role="status" className="text-xs text-emerald-300">
						Guardians saved.
					</p>
				)}
			</div>
		</section>
	);
}

function StartRecoveryForm({ newOwner }: { newOwner: string }) {
	const startRecovery = useSocialRecovery(state => state.startRecovery);
	const [lostAccount, setLostAccount] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const result = startRecovery(lostAccount, newOwner);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		setError(null);
		setLostAccount('');
	};

	return (
		<section
			aria-labelledby="start-recovery-heading"
			className="rounded-xl border border-border p-6"
		>
			<div className="mb-4 flex items-center gap-3">
				<LifeBuoy className="size-5 text-foreground" aria-hidden="true" />
				<div>
					<h2
						id="start-recovery-heading"
						className="font-jakarta text-lg font-semibold"
					>
						Lost access to another account?
					</h2>
					<p className="text-xs text-muted-foreground">
						Start a recovery that moves it to this connected wallet. Its
						guardians must approve, and the owner can cancel during the
						safety delay.
					</p>
				</div>
			</div>
			<form onSubmit={handleSubmit} className="space-y-2" noValidate>
				<Label htmlFor="lost-account-address">Account to recover</Label>
				<div className="flex gap-2">
					<Input
						id="lost-account-address"
						value={lostAccount}
						onChange={e => {
							setLostAccount(e.target.value);
							setError(null);
						}}
						aria-invalid={Boolean(error)}
						className="font-mono text-sm"
						placeholder="G..."
						spellCheck={false}
						autoComplete="off"
					/>
					<Button type="submit" variant="outline">
						Start recovery
					</Button>
				</div>
				{error && (
					<p role="alert" className="text-xs text-destructive">
						{error}
					</p>
				)}
			</form>
		</section>
	);
}

/**
 * Social recovery settings (#1382) at `/settings/recovery`.
 *
 * Owners nominate guardians and a threshold, see a warning banner and status
 * card for any pending recovery of their account, and can cancel it during
 * the safety delay. A wallet that started a recovery of another account sees
 * its progress here and is offered execution once it is allowed.
 */
export default function GuardiansPage() {
	useNavigationTiming('social-recovery');

	const { address, isConnected, loading } = useStellarWallet();
	const nowMs = useNowMs(1000);
	const owner = address ? normalizeAddress(address) : undefined;

	const config = useSocialRecovery(state =>
		owner ? state.configs[owner] : undefined
	);
	const requests = useSocialRecovery(state => state.requests);
	const cancel = useSocialRecovery(state => state.cancel);
	const execute = useSocialRecovery(state => state.execute);
	const [actionError, setActionError] = useState<string | null>(null);

	const pending = pendingRequestForOwner(requests, owner);
	const outgoing = owner
		? requests.filter(
				request =>
					request.status === 'pending' && request.newOwner === owner
			)
		: [];

	const handleCancel = (requestId: string) => {
		if (!owner) return;
		const result = cancel(requestId, owner);
		setActionError(result.ok ? null : result.error);
	};

	const handleExecute = (requestId: string) => {
		const result = execute(requestId);
		setActionError(result.ok ? null : result.error);
	};

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<div className="mb-2 flex items-center gap-3">
				<ShieldCheck
					className="size-6 text-foreground"
					aria-hidden="true"
				/>
				<h1 className="font-jakarta text-2xl font-semibold">
					Social recovery
				</h1>
			</div>
			<p className="mb-8 text-sm text-muted-foreground">
				If you lose this wallet, guardians you trust can approve moving your
				account to a new one.{' '}
				<Link to="/settings/recovery/approve" className="underline">
					Requests waiting for your approval
				</Link>
			</p>

			{loading ? (
				<p className="text-sm text-muted-foreground" role="status">
					Checking wallet…
				</p>
			) : !isConnected || !owner ? (
				<p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
					Connect your Stellar wallet to set up guardians.
				</p>
			) : (
				<div className="space-y-6">
					{pending && (
						<>
							<PendingRecoveryBanner request={pending} nowMs={nowMs} />
							<RecoveryStatusCard
								request={pending}
								nowMs={nowMs}
								onCancel={() => handleCancel(pending.id)}
							/>
						</>
					)}

					{outgoing.map(request => (
						<RecoveryStatusCard
							key={request.id}
							request={request}
							nowMs={nowMs}
							onExecute={() => handleExecute(request.id)}
						/>
					))}

					{actionError && (
						<p role="alert" className="text-xs text-destructive">
							{actionError}
						</p>
					)}

					<GuardianSetupForm
						key={owner}
						owner={owner}
						config={config}
						locked={Boolean(pending)}
					/>

					<StartRecoveryForm newOwner={owner} />
				</div>
			)}
		</main>
	);
}
