import { useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { useCreatorEmailOptIns } from '@/hooks/useBroadcasts';
import { BroadcastError } from '@/services/broadcasts.service';

/**
 * Holder opt-in for creator emails, per key held (#1476). Everything is off
 * by default; opting in needs an email address.
 */
export default function CreatorEmailOptIns({ address }: { address: string }) {
	const holdings = useWalletHoldings(address);
	const prices = useCreatorPrices();
	const { subscriptions, setOptIn } = useCreatorEmailOptIns(address);
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);

	const savedEmail = subscriptions.find(s => s.email)?.email ?? '';
	const effectiveEmail = email || savedEmail;
	const names = useMemo(() => {
		const list = Array.isArray(prices.data) ? prices.data : [];
		return Object.fromEntries(list.map(c => [c.id, c.title]));
	}, [prices.data]);
	const held = (holdings.data ?? []).filter(h => (h.quantity ?? 0) > 0);

	const toggle = async (keyId: string, optedIn: boolean) => {
		setError(null);
		try {
			await setOptIn.mutateAsync({ keyId, email: effectiveEmail, optedIn });
		} catch (e) {
			setError(e instanceof BroadcastError ? e.message : 'Could not update your email preference.');
		}
	};

	return (
		<section aria-labelledby="creator-emails-heading" className="mt-10" data-testid="creator-email-opt-ins">
			<div className="mb-3 flex items-center gap-2">
				<Mail className="size-5" aria-hidden="true" />
				<h2 id="creator-emails-heading" className="font-jakarta text-lg font-semibold">Creator emails</h2>
			</div>
			<p className="mb-4 text-sm text-muted-foreground">
				Let creators of keys you hold email you. Off unless you turn it on, and every email has a one-click unsubscribe link.
			</p>
			<Label htmlFor="creator-email-address">Email address</Label>
			<Input
				id="creator-email-address"
				type="email"
				autoComplete="email"
				value={effectiveEmail}
				onChange={e => setEmail(e.target.value)}
				className="mt-1 max-w-sm"
			/>
			{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
			{holdings.isLoading ? (
				<p className="mt-4 text-sm text-muted-foreground">Loading your keys…</p>
			) : held.length === 0 ? (
				<p className="mt-4 text-sm text-muted-foreground">You do not hold any keys yet.</p>
			) : (
				<ul className="mt-4 overflow-hidden rounded-xl border border-border">
					{held.map((h, i) => {
						const sub = subscriptions.find(s => s.keyId === h.creatorId);
						const name = names[h.creatorId] ?? h.creatorId;
						return (
							<li key={h.creatorId} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
								<Checkbox
									id={`creator-email-${h.creatorId}`}
									checked={sub?.optedIn ?? false}
									disabled={setOptIn.isPending}
									onCheckedChange={checked => void toggle(h.creatorId, checked)}
								/>
								<label htmlFor={`creator-email-${h.creatorId}`} className="text-sm">
									Emails from {name}
								</label>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
