import { useState } from 'react';
import { KeyRound, Link2 } from 'lucide-react';
import { Networks } from '@stellar/stellar-sdk';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FreighterSigner, type Signer } from '@/lib/signing';
import { describeAuthError, usePasskeyAuth, type PasskeyAuthDependencies } from '@/hooks/usePasskeyAuth';
import { embeddedWalletService, type EmbeddedWalletApi } from '@/services/embeddedWallet.service';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { env } from '@/utils/env.utils';

const NETWORK_PASSPHRASE = env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export interface EmbeddedWalletSectionProps {
	className?: string;
	dependencies?: PasskeyAuthDependencies;
	/** The browser wallet used to prove ownership when linking. */
	createSelfCustodySigner?: () => Signer;
}

/**
 * Embedded wallet controls in settings (#1477): export the key after a
 * passkey check, and link a self-custody wallet with guidance on moving
 * holdings to it. Renders nothing without an embedded wallet session.
 */
export default function EmbeddedWalletSection({
	className,
	dependencies,
	createSelfCustodySigner = () => new FreighterSigner(NETWORK_PASSPHRASE),
}: EmbeddedWalletSectionProps) {
	const api: EmbeddedWalletApi = dependencies?.api ?? embeddedWalletService;
	const { session, reauthenticate } = usePasskeyAuth(dependencies);
	const [secret, setSecret] = useState<string | null>(null);
	const [secretSaved, setSecretSaved] = useState(false);
	const [busy, setBusy] = useState<'export' | 'link' | null>(null);
	const [error, setError] = useState<string | null>(null);

	if (!session) return null;
	const linked = session.linkedWallet ?? null;

	const exportKey = async () => {
		setBusy('export');
		setError(null);
		try {
			const assertion = await reauthenticate('export');
			setSecret(await api.exportSecret(assertion));
			setSecretSaved(false);
		} catch (e) {
			setError(describeAuthError(e));
		} finally {
			setBusy(null);
		}
	};

	const linkWallet = async () => {
		setBusy('link');
		setError(null);
		try {
			const signer = createSelfCustodySigner();
			if (!signer.signMessage) throw new Error('This wallet cannot sign a message to prove ownership.');
			const publicKey = await signer.getPublicKey();
			if (publicKey === session.wallet.publicKey) throw new Error('That is your embedded wallet. Connect a different wallet.');
			const { challenge } = await api.linkChallenge(publicKey);
			await api.linkWallet(publicKey, await signer.signMessage(challenge));
		} catch (e) {
			setError(describeAuthError(e));
		} finally {
			setBusy(null);
		}
	};

	return (
		<section aria-labelledby="embedded-wallet-heading" className={`rounded-xl border border-border p-4 ${className ?? ''}`} data-testid="embedded-wallet-section">
			<h2 id="embedded-wallet-heading" className="font-jakarta text-lg font-semibold">Embedded wallet</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Signed in with {session.method === 'passkey' ? 'a passkey' : `email${session.email ? ` (${session.email})` : ''}`}. AccessLayer holds this wallet&apos;s key.
			</p>
			<code className="mt-2 block break-all font-mono text-xs" data-testid="settings-embedded-address">{session.wallet.publicKey}</code>

			<div className="mt-4 space-y-2">
				<h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" aria-hidden="true" /> Export keys</h3>
				{session.hasPasskey ? (
					<Button type="button" variant="outline" size="sm" disabled={busy !== null || secret !== null} onClick={() => void exportKey()}>
						Export secret key
					</Button>
				) : (
					<p className="text-xs text-muted-foreground">Exporting needs a passkey confirmation. Sign in with a passkey to export this wallet&apos;s key.</p>
				)}
				{secret && (
					<div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3" data-testid="exported-secret">
						<p className="text-xs">
							Anyone with this key controls the wallet. Store it offline and never share it. It is not saved in this browser and disappears when you hide it.
						</p>
						<code className="block break-all font-mono text-xs">{secret}</code>
						<div className="flex flex-wrap items-center gap-3">
							<Button type="button" size="sm" variant="outline" onClick={() => void copyTextToClipboard(secret)}>Copy</Button>
							<label className="flex items-center gap-2 text-xs">
								<Checkbox checked={secretSaved} onCheckedChange={setSecretSaved} /> I have stored it safely
							</label>
							<Button type="button" size="sm" disabled={!secretSaved} onClick={() => setSecret(null)}>Hide key</Button>
						</div>
					</div>
				)}
			</div>

			<div className="mt-5 space-y-2">
				<h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" aria-hidden="true" /> Link self-custody wallet</h3>
				{linked ? (
					<>
						<p className="text-sm">
							Linked: <code className="break-all font-mono text-xs" data-testid="linked-wallet">{linked.publicKey}</code>
						</p>
						<ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground" aria-label="Move your holdings">
							<li>Keep your linked wallet funded with a little XLM for fees.</li>
							<li>Sell or transfer each key you hold from the embedded wallet to the linked address.</li>
							<li>Send the remaining XLM to the linked address, keeping the minimum balance until the last step.</li>
							<li>Check your portfolio from the linked wallet, then export or stop using the embedded wallet.</li>
						</ol>
					</>
				) : (
					<>
						<p className="text-xs text-muted-foreground">
							Connect a Stellar wallet you control and sign a message to prove it is yours. Nothing moves until you transfer your holdings.
						</p>
						<Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void linkWallet()}>
							Link a wallet
						</Button>
					</>
				)}
			</div>
			{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
		</section>
	);
}
