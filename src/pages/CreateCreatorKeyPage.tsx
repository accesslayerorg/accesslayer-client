import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import {
	useCreatorKeyEligibility,
	useDeployCreatorKeyMutation,
	useKeyDeploymentStatus,
} from '@/hooks/useKeyFactory';
import KeyFactoryWizard from '@/components/common/KeyFactoryWizard';
import {
	EMPTY_KEY_FACTORY_DRAFT,
	type KeyFactoryDraft,
} from '@/utils/keyFactory.utils';

/**
 * Key factory deployment page (#959).
 *
 * Hidden entirely from creators who are not on the factory allowlist — the
 * allowlist is fail-closed client-side, and the factory contract remains the
 * authority on the actual deployment. Whitelisted creators configure their key
 * through the wizard, preview the bonding curve, and are taken to the new key's
 * detail page once the deployment confirms.
 */
export default function CreateCreatorKeyPage() {
	useDocumentTitle('Create creator key');
	useNavigationTiming('create-creator-key');

	const { address, isConnected } = useStellarWallet();
	const { isWhitelisted } = useCreatorKeyEligibility(address);
	const navigate = useNavigate();

	const [draft, setDraft] = useState<KeyFactoryDraft>(EMPTY_KEY_FACTORY_DRAFT);
	const [deployedKeyId, setDeployedKeyId] = useState<string | null>(null);

	const deployMutation = useDeployCreatorKeyMutation(address ?? '');

	// Poll the submitted deployment; polling stops once it settles.
	const { data: deployment } = useKeyDeploymentStatus(
		deployedKeyId ?? undefined,
		deployedKeyId !== null
	);

	const deploymentStatus = deployment?.status ?? null;

	// Take the creator to the new key's detail page once the deployment confirms.
	useEffect(() => {
		if (deploymentStatus === 'confirmed' && deployedKeyId) {
			navigate(`/creators/${deployedKeyId}`, { replace: true });
		}
	}, [deploymentStatus, deployedKeyId, navigate]);

	const handleDraftChange = (patch: Partial<KeyFactoryDraft>) => {
		setDraft(current => ({ ...current, ...patch }));
	};

	const handleDeploy = () => {
		deployMutation.mutate(
			{ draft },
			{
				onSuccess: receipt => {
					setDeployedKeyId(receipt?.keyId ?? null);
				},
			}
		);
	};

	if (!isConnected || !isWhitelisted) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-2xl space-y-4">
					<div className="flex items-center gap-2 text-amber-300">
						<ShieldCheck className="size-5" aria-hidden="true" />
						<h1 className="font-grotesque text-2xl font-black tracking-tight">
							Key factory access
						</h1>
					</div>
					<p className="text-sm text-white/60">
						Creator key deployment is limited to whitelisted creators. If
						you should have access, ask the team to add your wallet to
						the factory allowlist.
					</p>
					<Link
						to="/"
						className="inline-block text-sm font-semibold text-amber-300 hover:text-amber-200"
					>
						Back to marketplace
					</Link>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-4xl space-y-8">
				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						Create a creator key
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Configure and deploy a new key through the factory contract.
						Every step is reviewed before anything is submitted on-chain.
					</p>
				</header>

				{deployMutation.isError && (
					<div
						role="alert"
						className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
						data-testid="key-factory-deploy-error"
					>
						<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span>
							Deployment failed. Check that your wallet is connected to
							the correct network and try again.
						</span>
					</div>
				)}

				<KeyFactoryWizard
					deployer={address ?? ''}
					draft={draft}
					onDraftChange={handleDraftChange}
					onDeploy={handleDeploy}
					isDeploying={deployMutation.isPending}
					deploymentStatus={deploymentStatus}
					transactionHash={deployment?.transactionHash ?? null}
					deployedKeyId={deployedKeyId}
					className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
				/>
			</div>
		</main>
	);
}
