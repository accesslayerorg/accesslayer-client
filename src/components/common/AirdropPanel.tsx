import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import showToast from '@/utils/toast.util';
import {
	parseAirdropInput,
	validateAirdropRecipients,
	type AirdropRecipient,
} from '@/utils/airdropValidation';

const MAX_RECIPIENTS = 50;

const AirdropPanel: React.FC = () => {
	const [rawInput, setRawInput] = useState('');
	const [submitted, setSubmitted] = useState(false);

	const recipients: AirdropRecipient[] = useMemo(
		() => parseAirdropInput(rawInput),
		[rawInput]
	);

	const errors = useMemo(
		() => validateAirdropRecipients(recipients),
		[recipients]
	);

	const hasLimitError = errors.some(e => e.rowIndex === -1);
	const rowErrors = errors.filter(e => e.rowIndex >= 0);
	const rowErrorMap = new Map(rowErrors.map(e => [e.rowIndex, e.message]));
	const totalKeys = recipients.reduce((sum, r) => sum + r.quantity, 0);
	const canSubmit =
		recipients.length > 0 &&
		recipients.length <= MAX_RECIPIENTS &&
		rowErrors.length === 0;

	const handleSubmit = () => {
		if (!canSubmit) return;
		setSubmitted(true);
		showToast.transactionSuccess(
			'Airdrop submitted',
			`${totalKeys} keys distributed to ${recipients.length} recipients.`
		);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			setRawInput(String(reader.result ?? ''));
		};
		reader.readAsText(file);
	};

	return (
		<div className="space-y-4">
			<h3 className="font-grotesque text-xl font-black text-white">
				Airdrop Keys
			</h3>
			<p className="text-sm text-white/60">
				Paste wallet:quantity pairs (one per line) or upload a CSV. Up to{' '}
				{MAX_RECIPIENTS} recipients.
			</p>

			<textarea
				value={rawInput}
				onChange={e => {
					setRawInput(e.target.value);
					setSubmitted(false);
				}}
				placeholder={'GABC...:5\nGDEF...:10'}
				rows={6}
				className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-500/50"
				aria-label="Airdrop recipient list"
			/>

			<label className="inline-block cursor-pointer text-xs font-semibold text-amber-400 underline">
				Upload CSV
				<input
					type="file"
					accept=".csv,.txt"
					onChange={handleFileUpload}
					className="hidden"
				/>
			</label>

			{hasLimitError && (
				<p role="alert" className="text-sm font-bold text-red-400">
					Maximum 50 recipients per airdrop
				</p>
			)}

			{recipients.length > 0 && (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-white/10 text-xs text-white/50">
								<th className="pb-2 pr-4">#</th>
								<th className="pb-2 pr-4">Address</th>
								<th className="pb-2 pr-4">Qty</th>
								<th className="pb-2">Error</th>
							</tr>
						</thead>
						<tbody>
							{recipients.map((r, i) => (
								<tr key={i} className="border-b border-white/5">
									<td className="py-2 pr-4 text-white/40">{i + 1}</td>
									<td className="py-2 pr-4 font-mono text-white/80 truncate max-w-[200px]">
										{r.address}
									</td>
									<td className="py-2 pr-4 text-white/80">{r.quantity}</td>
									<td className="py-2 text-red-400 text-xs">
										{rowErrorMap.get(i) ?? '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<div className="mt-3 text-sm font-bold text-white/70">
						Total: {totalKeys} keys → {recipients.length} recipients
					</div>
				</div>
			)}

			<Button
				type="button"
				onClick={handleSubmit}
				disabled={!canSubmit}
				className="rounded-xl"
			>
				{submitted ? 'Submitted' : 'Submit Airdrop'}
			</Button>
		</div>
	);
};

export default AirdropPanel;
