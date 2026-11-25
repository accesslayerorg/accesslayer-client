import { useState } from 'react';
import { ArrowLeft, Fingerprint, Mail, Wallet } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SecurityNotice from '@/components/auth/SecurityNotice';
import { useEmailSignIn, usePasskeyAuth, type PasskeyAuthDependencies } from '@/hooks/usePasskeyAuth';
import type { EmbeddedSession } from '@/services/embeddedWallet.service';

type Step = 'choose' | 'passkey' | 'email' | 'done';

export interface SignInOptionsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Opens the existing browser-wallet connection flow. */
	onConnectWallet: () => void;
	dependencies?: PasskeyAuthDependencies;
}

/**
 * Sign-in choices (#1477): connect a wallet, or continue with a passkey or
 * email, which creates an embedded wallet after the custody notice is
 * accepted. Browsers without WebAuthn get wallet connection instead.
 */
export default function SignInOptionsModal({ open, onOpenChange, onConnectWallet, dependencies }: SignInOptionsModalProps) {
	const [step, setStep] = useState<Step>('choose');
	const [session, setSession] = useState<EmbeddedSession | null>(null);

	const close = (next: boolean) => {
		onOpenChange(next);
		if (!next) {
			setStep('choose');
			setSession(null);
		}
	};
	const finished = (s: EmbeddedSession) => {
		setSession(s);
		setStep('done');
	};

	return (
		<Dialog open={open} onOpenChange={close}>
			<DialogContent data-testid="sign-in-options-modal" className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{step === 'done' ? 'You are signed in' : 'Sign in to AccessLayer'}</DialogTitle>
					<DialogDescription>
						{step === 'done'
							? 'Your embedded wallet is ready.'
							: 'Use your own Stellar wallet, or start with a passkey or email.'}
					</DialogDescription>
				</DialogHeader>
				{step !== 'choose' && step !== 'done' && (
					<Button type="button" variant="ghost" size="sm" className="w-fit gap-1" onClick={() => setStep('choose')}>
						<ArrowLeft className="size-4" aria-hidden="true" /> All options
					</Button>
				)}
				{step === 'choose' && (
					<ChooseStep
						dependencies={dependencies}
						onConnectWallet={() => {
							close(false);
							onConnectWallet();
						}}
						onPick={setStep}
					/>
				)}
				{step === 'passkey' && <PasskeyStep dependencies={dependencies} onDone={finished} />}
				{step === 'email' && <EmailStep dependencies={dependencies} onDone={finished} />}
				{step === 'done' && session && (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">Wallet address</p>
						<code data-testid="embedded-wallet-address" className="block break-all rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
							{session.wallet.publicKey}
						</code>
						<p className="text-xs text-muted-foreground">
							You can export the key or link your own wallet any time in Settings.
						</p>
						<Button type="button" className="w-full" onClick={() => close(false)}>
							Done
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ChooseStep({
	dependencies,
	onConnectWallet,
	onPick,
}: {
	dependencies?: PasskeyAuthDependencies;
	onConnectWallet: () => void;
	onPick: (step: Step) => void;
}) {
	const { supported } = usePasskeyAuth(dependencies);
	return (
		<div className="flex flex-col gap-3">
			<Button type="button" className="justify-start gap-2" onClick={onConnectWallet}>
				<Wallet className="size-4" aria-hidden="true" /> Connect wallet
			</Button>
			<Button type="button" variant="outline" className="justify-start gap-2" disabled={!supported} onClick={() => onPick('passkey')}>
				<Fingerprint className="size-4" aria-hidden="true" /> Continue with passkey
			</Button>
			{!supported && (
				<p role="note" className="text-xs text-muted-foreground" data-testid="passkey-unsupported">
					This browser does not support passkeys. Connect a Stellar wallet instead, or continue with email.
				</p>
			)}
			<Button type="button" variant="outline" className="justify-start gap-2" onClick={() => onPick('email')}>
				<Mail className="size-4" aria-hidden="true" /> Continue with email
			</Button>
		</div>
	);
}

function PasskeyStep({ dependencies, onDone }: { dependencies?: PasskeyAuthDependencies; onDone: (s: EmbeddedSession) => void }) {
	const passkey = usePasskeyAuth(dependencies);
	const [name, setName] = useState('');
	const [acknowledged, setAcknowledged] = useState(false);
	const attempt = (fn: () => Promise<EmbeddedSession>) => fn().then(onDone, () => undefined);

	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<p className="text-sm font-medium">Already have a passkey?</p>
				<Button type="button" variant="outline" className="w-full" disabled={passkey.pending} onClick={() => void attempt(passkey.signIn)}>
					Sign in with passkey
				</Button>
			</div>
			<div className="space-y-3 border-t border-border pt-4">
				<p className="text-sm font-medium">New here? Create a passkey and wallet</p>
				<div>
					<Label htmlFor="passkey-display-name">Name for this passkey</Label>
					<Input id="passkey-display-name" value={name} onChange={e => setName(e.target.value)} className="mt-1" autoComplete="username" />
				</div>
				<SecurityNotice acknowledged={acknowledged} onAcknowledgedChange={setAcknowledged} />
				<Button
					type="button"
					className="w-full"
					disabled={passkey.pending || !acknowledged || !name.trim()}
					onClick={() => void attempt(() => passkey.register(name.trim(), acknowledged))}
				>
					Create passkey and wallet
				</Button>
			</div>
			{passkey.error && <p role="alert" className="text-sm text-destructive">{passkey.error}</p>}
		</div>
	);
}

function EmailStep({ dependencies, onDone }: { dependencies?: PasskeyAuthDependencies; onDone: (s: EmbeddedSession) => void }) {
	const emailAuth = useEmailSignIn(dependencies);
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [sent, setSent] = useState<{ isNewUser: boolean } | null>(null);
	const [acknowledged, setAcknowledged] = useState(false);

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="sign-in-email">Email address</Label>
				<Input id="sign-in-email" type="email" autoComplete="email" value={email} disabled={Boolean(sent)} onChange={e => setEmail(e.target.value)} className="mt-1" />
			</div>
			{!sent ? (
				<Button
					type="button"
					className="w-full"
					disabled={emailAuth.pending || !email.trim()}
					onClick={() => void emailAuth.start(email).then(setSent, () => undefined)}
				>
					Email me a sign-in code
				</Button>
			) : (
				<>
					<div>
						<Label htmlFor="sign-in-code">Code from the email</Label>
						<Input id="sign-in-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} className="mt-1" />
					</div>
					{sent.isNewUser && <SecurityNotice acknowledged={acknowledged} onAcknowledgedChange={setAcknowledged} />}
					<Button
						type="button"
						className="w-full"
						disabled={emailAuth.pending || !code.trim() || (sent.isNewUser && !acknowledged)}
						onClick={() => void emailAuth.verify(email, code, sent.isNewUser, acknowledged).then(onDone, () => undefined)}
					>
						{sent.isNewUser ? 'Create wallet' : 'Sign in'}
					</Button>
				</>
			)}
			{emailAuth.error && <p role="alert" className="text-sm text-destructive">{emailAuth.error}</p>}
		</div>
	);
}
