import { ShieldAlert } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface SecurityNoticeProps {
	acknowledged: boolean;
	onAcknowledgedChange: (acknowledged: boolean) => void;
}

/**
 * Custody trade-offs of an embedded wallet (#1477). Creating one is blocked
 * until this is acknowledged.
 */
export default function SecurityNotice({ acknowledged, onAcknowledgedChange }: SecurityNoticeProps) {
	return (
		<section
			aria-labelledby="custody-notice-heading"
			className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
			data-testid="custody-notice"
		>
			<h3 id="custody-notice-heading" className="flex items-center gap-2 font-semibold">
				<ShieldAlert className="size-4" aria-hidden="true" /> Before we create your wallet
			</h3>
			<ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
				<li>
					AccessLayer creates this wallet and keeps its key in our signing service. Your passkey or
					email proves it is you; it is not the wallet key itself.
				</li>
				<li>
					That makes it custodial: you rely on AccessLayer to keep the key safe and available, and you
					cannot sign while the service is down.
				</li>
				<li>Large transactions ask for your passkey again before they are signed.</li>
				<li>
					You can export the key or move to a self-custody wallet at any time from Settings. If you lose
					your passkey and email access without exporting, you may lose the wallet.
				</li>
			</ul>
			<label className="mt-3 flex items-start gap-2">
				<Checkbox
					className="mt-0.5"
					checked={acknowledged}
					onCheckedChange={onAcknowledgedChange}
					aria-describedby="custody-notice-heading"
				/>
				<span>I understand AccessLayer holds this wallet&apos;s key until I export it or move to my own wallet.</span>
			</label>
		</section>
	);
}
