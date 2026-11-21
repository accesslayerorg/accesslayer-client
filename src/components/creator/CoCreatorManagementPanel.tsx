import { useState } from 'react';
import { Users, UserPlus, Trash2, X, CheckCircle, Shield, FileText, DollarSign } from 'lucide-react';

type CoCreatorRole = 'Admin' | 'Content' | 'Revenue';

interface CoCreator {
	wallet: string;
	role: CoCreatorRole;
	addedAt?: string;
}

interface CoCreatorManagementPanelProps {
	coCreators: CoCreator[];
	isPrimaryCreator: boolean;
	onAddCoCreator?: (wallet: string, role: CoCreatorRole) => Promise<void>;
	onRemoveCoCreator?: (wallet: string) => Promise<void>;
	className?: string;
}

const ROLE_CONFIG: Record<CoCreatorRole, { icon: typeof Shield; color: string; bg: string }> = {
	Admin: { icon: Shield, color: 'text-red-300', bg: 'bg-red-400/10 border-red-400/20' },
	Content: { icon: FileText, color: 'text-blue-300', bg: 'bg-blue-400/10 border-blue-400/20' },
	Revenue: { icon: DollarSign, color: 'text-green-300', bg: 'bg-green-400/10 border-green-400/20' },
};

/**
 * Co-creator management panel (#1202).
 * Primary creators can add/remove co-creators with roles and view the roster.
 */
export function CoCreatorManagementPanel({
	coCreators,
	isPrimaryCreator,
	onAddCoCreator,
	onRemoveCoCreator,
	className = '',
}: CoCreatorManagementPanelProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [newWallet, setNewWallet] = useState('');
	const [newRole, setNewRole] = useState<CoCreatorRole>('Content');
	const [removeTarget, setRemoveTarget] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [toast, setToast] = useState<{ type: 'success' | 'removed'; message: string } | null>(null);

	const showToast = (type: 'success' | 'removed', message: string) => {
		setToast({ type, message });
		setTimeout(() => setToast(null), 4000);
	};

	const handleAdd = async () => {
		if (!onAddCoCreator || isSubmitting || !newWallet.trim()) return;
		setIsSubmitting(true);
		try {
			await onAddCoCreator(newWallet.trim(), newRole);
			showToast('success', `CoCreatorAdded: ${newWallet.slice(0, 8)}… as ${newRole}`);
			setNewWallet('');
			setShowAddForm(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemove = async (wallet: string) => {
		if (!onRemoveCoCreator || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onRemoveCoCreator(wallet);
			showToast('removed', `CoCreatorRemoved: ${wallet.slice(0, 8)}…`);
			setRemoveTarget(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div data-testid="co-creator-management" className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md ${className}`}>
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
						<Users className="size-5" />
					</div>
					<div>
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">Co-Creators</h2>
						<p className="text-xs text-white/60">Manage your team with role-based access</p>
					</div>
				</div>
				{isPrimaryCreator && (
					<button
						data-testid="add-co-creator-button"
						onClick={() => setShowAddForm(!showAddForm)}
						className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
					>
						<UserPlus className="size-3" /> Add Co-Creator
					</button>
				)}
			</div>

			{/* Add form */}
			{showAddForm && isPrimaryCreator && (
				<div data-testid="add-co-creator-form" className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
					<div className="mb-3">
						<label className="block text-xs font-semibold text-white/70 mb-1">Wallet Address</label>
						<input
							type="text"
							value={newWallet}
							onChange={(e) => setNewWallet(e.target.value)}
							placeholder="G..."
							data-testid="co-creator-wallet-input"
							className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none"
						/>
					</div>
					<div className="mb-4">
						<label className="block text-xs font-semibold text-white/70 mb-2">Role</label>
						<div className="flex gap-2">
							{(['Admin', 'Content', 'Revenue'] as CoCreatorRole[]).map((role) => {
								const config = ROLE_CONFIG[role];
								const Icon = config.icon;
								return (
									<button
										key={role}
										data-testid={`role-${role}`}
										onClick={() => setNewRole(role)}
										className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
											newRole === role
												? `${config.bg} ${config.color}`
												: 'border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
										}`}
									>
										<Icon className="size-3" /> {role}
									</button>
								);
							})}
						</div>
					</div>
					<button
						onClick={handleAdd}
						disabled={isSubmitting || !newWallet.trim()}
						data-testid="submit-co-creator-button"
						className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
					>
						{isSubmitting ? 'Adding…' : 'Add Co-Creator'}
					</button>
				</div>
			)}

			{/* Roster table */}
			{coCreators.length > 0 ? (
				<div data-testid="co-creator-roster" className="rounded-xl border border-white/10 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-white/10 bg-white/[0.03]">
								<th className="px-4 py-3 text-left text-xs font-semibold text-white/70">Wallet</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-white/70">Role</th>
								{isPrimaryCreator && <th className="px-4 py-3 text-right text-xs font-semibold text-white/70">Actions</th>}
							</tr>
						</thead>
						<tbody>
							{coCreators.map((cc) => {
								const config = ROLE_CONFIG[cc.role];
								const Icon = config.icon;
								return (
									<tr key={cc.wallet} data-testid={`co-creator-row-${cc.wallet}`} className="border-b border-white/5 last:border-0">
										<td className="px-4 py-3">
											<span className="font-mono text-xs text-white/80">
												{cc.wallet.slice(0, 8)}…{cc.wallet.slice(-6)}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
												<Icon className="size-3" /> {cc.role}
											</span>
										</td>
										{isPrimaryCreator && (
											<td className="px-4 py-3 text-right">
												{removeTarget === cc.wallet ? (
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => handleRemove(cc.wallet)}
															disabled={isSubmitting}
															data-testid={`confirm-remove-${cc.wallet}`}
															className="rounded-lg bg-red-500/20 border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
														>
															Confirm
														</button>
														<button
															onClick={() => setRemoveTarget(null)}
															data-testid={`cancel-remove-${cc.wallet}`}
															className="rounded-lg bg-white/[0.05] px-3 py-1 text-xs text-white/60 hover:bg-white/[0.1]"
														>
															<X className="size-3" />
														</button>
													</div>
												) : (
													<button
														onClick={() => setRemoveTarget(cc.wallet)}
														data-testid={`remove-co-creator-${cc.wallet}`}
														className="rounded-lg border border-red-400/20 bg-red-400/5 p-1.5 text-red-300 hover:bg-red-400/15"
													>
														<Trash2 className="size-3" />
													</button>
												)}
											</td>
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div className="text-center py-8 text-white/40 text-sm">
					<Users className="size-8 mx-auto mb-2 opacity-50" />
					No co-creators yet
				</div>
			)}

			{/* Toast */}
			{toast && (
				<div data-testid="co-creator-toast" className="mt-4 flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/10 p-3">
					<CheckCircle className="size-4 text-green-400" />
					<span className="text-sm text-green-300">{toast.message}</span>
				</div>
			)}
		</div>
	);
}

export default CoCreatorManagementPanel;
