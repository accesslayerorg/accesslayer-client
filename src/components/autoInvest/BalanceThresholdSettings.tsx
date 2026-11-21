import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
	currentThreshold: number;
	onUpdate: (threshold: number) => void;
	isUpdating: boolean;
}

export default function BalanceThresholdSettings({
	currentThreshold,
	onUpdate,
	isUpdating,
}: Props) {
	const [threshold, setThreshold] = useState(currentThreshold.toString());
	const [isEditing, setIsEditing] = useState(false);
	const [error, setError] = useState('');

	const handleSave = () => {
		const value = parseFloat(threshold);
		if (Number.isNaN(value) || value < 0) {
			setError('Please enter a valid amount');
			return;
		}
		setError('');
		onUpdate(value);
		setIsEditing(false);
	};

	return (
		<section className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6">
			<div className="flex items-start gap-4">
				<div className="mt-1 flex items-center justify-center rounded-lg bg-amber-400/10 p-2.5">
					<AlertCircle className="size-5 text-amber-400" />
				</div>

				<div className="flex-1 space-y-4">
					<div>
						<h3 className="font-grotesque text-lg font-bold tracking-tight text-white">
							Balance Threshold
						</h3>
						<p className="mt-1 text-sm text-white/60">
							Auto-invest will pause when your wallet balance falls below this threshold.
						</p>
					</div>

					{!isEditing ? (
						<div className="flex items-end gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50 mb-2">
									Current Threshold
								</p>
								<p className="text-2xl font-bold text-white font-mono">
									{currentThreshold.toFixed(2)} XLM
								</p>
							</div>
							<button
								onClick={() => {
									setThreshold(currentThreshold.toString());
									setError('');
									setIsEditing(true);
								}}
								className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/20"
							>
								Edit
							</button>
						</div>
					) : (
						<div className="space-y-3">
							<div>
								<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
									Minimum Balance (XLM)
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={threshold}
									onChange={(e) => setThreshold(e.target.value)}
									className="w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
									placeholder="0.00"
									autoFocus
								/>
								{error && (
									<p className="mt-1 text-xs text-red-400">{error}</p>
								)}
							</div>

							<div className="flex gap-2">
								<button
									onClick={handleSave}
									disabled={isUpdating}
									className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-amber-300 disabled:opacity-50"
								>
									{isUpdating ? 'Saving...' : 'Save'}
								</button>
								<button
									onClick={() => {
										setIsEditing(false);
										setError('');
										setThreshold(currentThreshold.toString());
									}}
									className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/10"
								>
									Cancel
								</button>
							</div>
						</div>
					)}

					<div className="rounded-lg bg-blue-400/10 border border-blue-400/20 px-3 py-2">
						<p className="text-xs text-blue-200">
							ℹ️ When your balance drops below this threshold, auto-invest rules will automatically pause to protect your account.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
