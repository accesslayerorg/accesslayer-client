import { useState } from 'react';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
	useAutoInvestRules,
	useAutoInvestHistory,
	useAutoInvestSettings,
	useToggleAutoInvestRule,
	useDeleteAutoInvestRule,
	useUpdateAutoInvestSettings,
} from '@/hooks/useAutoInvest';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';
import { formatNumber } from '@/utils/numberFormat.utils';
import AutoInvestRuleForm from '@/components/autoInvest/AutoInvestRuleForm';
import AutoInvestHistoryTable from '@/components/autoInvest/AutoInvestHistoryTable';
import BalanceThresholdSettings from '@/components/autoInvest/BalanceThresholdSettings';

export default function AutoInvestDashboardPage() {
	useNavigationTiming('auto-invest-dashboard');
	useDocumentTitle('Auto-Invest Dashboard — AccessLayer');

	const [showRuleForm, setShowRuleForm] = useState(false);
	const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

	const { data: rules = [], isLoading: rulesLoading } = useAutoInvestRules();
	const { data: history = [], isLoading: historyLoading } =
		useAutoInvestHistory();
	const { data: settings } = useAutoInvestSettings();
	const toggleRule = useToggleAutoInvestRule();
	const deleteRule = useDeleteAutoInvestRule();
	const updateSettings = useUpdateAutoInvestSettings();

	const editingRule = editingRuleId
		? rules.find(r => r.id === editingRuleId) || undefined
		: undefined;

	const handleToggleRule = (ruleId: string, currentEnabled: boolean) => {
		toggleRule.mutate({ ruleId, enabled: !currentEnabled });
	};

	const handleDeleteRule = (ruleId: string) => {
		if (confirm('Are you sure you want to delete this rule?')) {
			deleteRule.mutate(ruleId);
		}
	};

	const handleCloseForm = () => {
		setShowRuleForm(false);
		setEditingRuleId(null);
	};

	return (
		<div className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-6xl space-y-8">
				{/* Header */}
				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						Auto-Invest Dashboard
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Configure automatic purchase rules for new creator keys that
						match your preferences.
					</p>
				</header>

				{/* Settings Section */}
				<SectionErrorBoundary sectionName="balance threshold settings">
					<BalanceThresholdSettings
						currentThreshold={settings?.balanceThreshold ?? 0}
						onUpdate={threshold =>
							updateSettings.mutate({ balanceThreshold: threshold })
						}
						isUpdating={updateSettings.isPending}
					/>
				</SectionErrorBoundary>

				{/* Rules Section */}
				<SectionErrorBoundary sectionName="auto-invest rules">
					<section className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6">
						<div className="mb-6 flex items-center justify-between">
							<div>
								<h2 className="font-grotesque text-xl font-black tracking-tight">
									Investment Rules
								</h2>
								<p className="mt-1 text-sm text-white/50">
									{rules.length} rule{rules.length !== 1 ? 's' : ''}{' '}
									configured
								</p>
							</div>
							{!showRuleForm && (
								<button
									onClick={() => setShowRuleForm(true)}
									className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-amber-300"
								>
									<Plus className="size-4" />
									New Rule
								</button>
							)}
						</div>

						{/* Rule Form */}
						{showRuleForm && (
							<div className="mb-6">
								<AutoInvestRuleForm
									editingRule={editingRule}
									onClose={handleCloseForm}
								/>
							</div>
						)}

						{/* Rules List */}
						{rulesLoading ? (
							<div className="space-y-3">
								{[...Array(3)].map((_, i) => (
									<div
										key={i}
										className="h-20 rounded-lg bg-white/5 animate-pulse"
									/>
								))}
							</div>
						) : rules.length === 0 ? (
							<div className="rounded-lg border border-white/10 bg-white/5 px-6 py-8 text-center">
								<p className="text-sm text-white/60">
									No investment rules yet. Create one to get started.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{rules.map(rule => (
									<div
										key={rule.id}
										className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4"
									>
										<div className="flex-1 space-y-2">
											<div className="flex items-center gap-3">
												<h3 className="font-bold text-white">
													{rule.name}
												</h3>
												<span
													className={`text-xs font-semibold px-2 py-1 rounded-full ${
														rule.enabled
															? 'bg-emerald-400/20 text-emerald-300'
															: 'bg-white/10 text-white/50'
													}`}
												>
													{rule.enabled ? 'Active' : 'Inactive'}
												</span>
											</div>
											<div className="text-xs text-white/50 space-y-1">
												{rule.category && (
													<p>Category: {rule.category}</p>
												)}
												{rule.minRating !== undefined && (
													<p>Min Rating: {rule.minRating}★</p>
												)}
												<p>Max Price: {rule.maxPrice} XLM</p>
												{rule.minUniqueTradersVolumeXlm !==
													undefined && (
													<p>
														Min Volume:{' '}
														{formatNumber(
															rule.minUniqueTradersVolumeXlm
														)}{' '}
														XLM
													</p>
												)}
												<p>Max Per Key: {rule.maxPerKey} XLM</p>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<button
												onClick={() =>
													handleToggleRule(rule.id, rule.enabled)
												}
												disabled={toggleRule.isPending}
												className="p-2 rounded-lg hover:bg-white/10 transition-colors"
												aria-label={
													rule.enabled
														? 'Disable rule'
														: 'Enable rule'
												}
											>
												{rule.enabled ? (
													<ToggleRight className="size-5 text-emerald-400" />
												) : (
													<ToggleLeft className="size-5 text-white/40" />
												)}
											</button>
											<button
												onClick={() => setEditingRuleId(rule.id)}
												className="p-2 rounded-lg hover:bg-white/10 transition-colors"
												aria-label="Edit rule"
											>
												<Edit2 className="size-4 text-amber-400" />
											</button>
											<button
												onClick={() => handleDeleteRule(rule.id)}
												disabled={deleteRule.isPending}
												className="p-2 rounded-lg hover:bg-white/10 transition-colors"
												aria-label="Delete rule"
											>
												<Trash2 className="size-4 text-red-400" />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				</SectionErrorBoundary>

				{/* History Section */}
				<SectionErrorBoundary sectionName="auto-invest history">
					<section className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6">
						<div className="mb-6">
							<h2 className="font-grotesque text-xl font-black tracking-tight">
								Execution History
							</h2>
							<p className="mt-1 text-sm text-white/50">
								Recent auto-invest purchases triggered by your rules
							</p>
						</div>

						{historyLoading ? (
							<div className="space-y-3">
								{[...Array(5)].map((_, i) => (
									<div
										key={i}
										className="h-12 rounded-lg bg-white/5 animate-pulse"
									/>
								))}
							</div>
						) : (
							<AutoInvestHistoryTable history={history} />
						)}
					</section>
				</SectionErrorBoundary>
			</div>
		</div>
	);
}
