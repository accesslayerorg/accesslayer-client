import { useState } from 'react';
import type { HolderAttestation } from '@/types/holderAttestation';
import { attestationShareUrl, isAttestationCurrent } from '@/utils/holderAttestation.utils';

export default function HolderAttestationCard({ attestation }: { attestation: HolderAttestation }) {
	const [copied, setCopied] = useState(false);
	const shareUrl = attestationShareUrl(attestation);
	const current = isAttestationCurrent(attestation);
	const copy = async () => {
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
	};

	return (
		<article className="rounded-xl border border-white/10 bg-white/5 p-5" aria-label="Holder balance attestation">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="font-semibold text-white">Holder balance attestation</h2>
					<p className="mt-1 text-sm text-white/60">{attestation.holder}</p>
				</div>
				<span className={current ? 'text-emerald-300' : 'text-amber-300'}>{current ? 'Current' : 'Expired'}</span>
			</div>
			<p className="mt-4 text-2xl font-semibold text-white">{attestation.balance}</p>
			<p className="mt-1 text-xs text-white/50">Valid until {new Date(attestation.expiresAt).toLocaleString()}</p>
			<button type="button" onClick={() => void copy()} className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-sm text-white">
				{copied ? 'Link copied' : 'Copy verification link'}
			</button>
		</article>
	);
}
