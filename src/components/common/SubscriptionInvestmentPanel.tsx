import { useState, useMemo } from 'react';
import { Calendar, X, AlertCircle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	SUBSCRIPTION_INTERVAL_LABELS,
	SUBSCRIPTION_INTERVAL_SECONDS,
	type SubscriptionInterval,
} from '@/types/keySubscription';
import { useKeySubscription, useCreateSubscription, useCancelSubscription } from '@/hooks/useKeySubscription';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

interface SubscriptionInvestmentPanelProps {
	creatorId: string;
	currentPriceStroops?: number | null;
	disabled?: boolean;
	disabledReason?: string;
}

const INTERVAL_OPTIONS: { value: SubscriptionInterval; label: string }[] = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
];

function formatNextExecution(nextExecutionAt: string): string {
	const date = new Date(nextExecutionAt);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();

	if (diffMs <= 0) return 'Executing soon...';

	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (diffDays > 0) {
		return `${diffDays}d ${diffHours}h`;
	}
	if (diffHours > 0) {
		return `${diffHours}h ${diffMinutes}m`;
	}
	return `${diffMinutes}m`;
}

function getNextExecutionDate(nextExecutionAt: string): Date {
	return new Date(nextExecutionAt);
}

export default function SubscriptionInvestmentPanel({
	creatorId,
	currentPriceStroops,
	disabled,
	disabledReason,
}: SubscriptionInvestmentPanelProps) {
	const { address } = useAccount();
	const isConnected = Boolean(address);

	const { data: subscription, isLoading: isSubscriptionLoading } = useKeySubscription(creatorId);
	const createSubscription = useCreateSubscription();
	const cancelSubscription = useCancelSubscription();

	const [amount, setAmount] = useState<string>('');
	const [interval, setInterval] = useState<SubscriptionInterval>('monthly');
	const [amountError, setAmountError] = useState<string | null>(null);

	const activeSubscription = subscription?.status === 'active' ? subscription : null;

	const preview = useMemo(() => {
		if (!amount || !currentPriceStroops) return null;
		const amountNum = parseFloat(amount);
		if (isNaN(amountNum) || amountNum <= 0) return null;

		const intervalSeconds = SUBSCRIPTION_INTERVAL_SECONDS[interval];
		const nextExecutionDate = new Date(Date.now() + intervalSeconds * 1000);
		const estimatedCostXlm = amountNum;

		return {
			nextExecutionDate,
			estimatedCostXlm,
		};
	}, [amount, interval, currentPriceStroops]);

	const validateAmount = (value: string): boolean => {
		const num = parseFloat(value);
		if (!value.trim()) {
			setAmountError('Enter an amount');
			return false;
		}
		if (isNaN(num) || num <= 0) {
			setAmountError('Amount must be greater than 0');
			return false;
		}
		if (num < 0.01) {
			setAmountError('Minimum amount is 0.01 XLM');
			return false;
		}
		setAmountError(null);
		return true;
	};

	const handleAmountChange = (value: string) => {
		setAmount(value);
		if (value.trim()) {
			validateAmount(value);
		} else {
			setAmountError(null);
		}
	};

	const handleCreateSubscription = async () => {
		if (!validateAmount(amount)) return;
		if (!isConnected) {
			showToast.error('Connect your wallet to create a subscription');
			return;
		}

		try {
			showToast.loading('Creating subscription...');
			await createSubscription.mutateAsync({
				creatorId,
				amountXlm: parseFloat(amount),
				interval,
			});
			showToast.transactionSuccess(
				'Subscription created',
				`Recurring ${SUBSCRIPTION_INTERVAL_LABELS[interval].toLowerCase()} investment of ${formatNumber(parseFloat(amount))} XLM set up`
			);
			setAmount('');
		} catch (error) {
			showToast.error(getSignatureErrorMessage(error));
		}
	};

	const handleCancelSubscription = async (subscriptionId: string) => {
		if (!isConnected) {
			showToast.error('Connect your wallet to cancel subscription');
			return;
		}

		try {
			showToast.loading('Cancelling subscription...');
			await cancelSubscription.mutateAsync({ subscriptionId });
			showToast.transactionSuccess(
				'Subscription cancelled',
				'Your recurring investment has been cancelled'
			);
		} catch (error) {
			showToast.error(getSignatureErrorMessage(error));
		}
	};

	const isSubmitting = createSubscription.isPending || cancelSubscription.isPending;

	if (!isConnected) {
		return (
			<Card className="border-white/10 bg-white/[0.02]">
				<CardContent className="pt-6">
					<div className="text-center py-8">
						<Calendar className="size-12 mx-auto text-white/30" />
						<h3 className="mt-4 font-semibold text-white">Connect to Subscribe</h3>
						<p className="mt-2 text-sm text-white/50">
							Connect your wallet to set up recurring automatic investments.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-white/10 bg-white/[0.02]">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-white">Subscription Investment</CardTitle>
						<CardDescription className="text-white/50">
							Set up recurring automatic investments in this key
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<Tabs defaultValue={activeSubscription ? 'active' : 'create'} className="w-full">
					<TabsList className="grid w-full grid-cols-2 bg-white/5">
						<TabsTrigger value="create" disabled={Boolean(activeSubscription)}>
							New Subscription
						</TabsTrigger>
						<TabsTrigger value="active" disabled={!activeSubscription}>
							Active Subscription
						</TabsTrigger>
					</TabsList>

					<TabsContent value="create" className="mt-4 space-y-4">
						{activeSubscription && (
							<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300 text-sm">
								<div className="flex items-center gap-2">
									<AlertCircle className="size-4 shrink-0" />
									<span>
										You have an active subscription. Cancel it first to create a new one.
									</span>
								</div>
							</div>
						)}

						{!activeSubscription && (
							<div className="space-y-4" data-testid="subscription-form">
								{/* Amount Input */}
								<div>
									<label
										htmlFor="subscription-amount"
										className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2"
									>
										Amount (XLM) *
									</label>
									<input
										id="subscription-amount"
										type="number"
										step="0.01"
										min="0.01"
										value={amount}
										onChange={(e) => handleAmountChange(e.target.value)}
										onBlur={() => validateAmount(amount)}
										placeholder="e.g., 10.00"
										disabled={disabled || isSubmitting}
										className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60 transition-colors ${
											amountError
												? 'border-red-500/60'
												: 'border-white/15 focus:border-amber-400/60'
										} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
										aria-invalid={!!amountError}
										aria-describedby={amountError ? 'amount-error' : undefined}
									/>
									{amountError && (
										<p id="amount-error" className="mt-1 text-xs text-red-400" role="alert">
											{amountError}
										</p>
									)}
									{disabledReason && !amountError && (
										<p className="mt-1 text-xs text-white/40">{disabledReason}</p>
									)}
								</div>

								{/* Interval Selector */}
								<div>
									<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
										Interval *
									</label>
									<select
										value={interval}
										onChange={(e) =>
											setInterval(e.target.value as SubscriptionInterval)
										}
										disabled={disabled || isSubmitting}
										className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-40 disabled:cursor-not-allowed"
									>
										{INTERVAL_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</div>

								{/* Next Execution Preview */}
								{preview && (
									<div
										className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
										data-testid="execution-preview"
									>
										<div className="flex items-center gap-2 text-emerald-300 mb-2">
											<Clock className="size-4" />
											<span className="font-semibold">Next Execution Preview</span>
										</div>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="text-white/50">Estimated Date</p>
												<p className="font-mono text-white">
													{preview.nextExecutionDate.toLocaleString()}
												</p>
											</div>
											<div>
												<p className="text-white/50">Estimated Cost</p>
												<p className="font-mono text-white">
													{formatNumber(preview.estimatedCostXlm)} XLM
												</p>
											</div>
										</div>
									</div>
								)}

								{/* Current Price Reference */}
								{currentPriceStroops && (
									<p className="text-xs text-white/40">
										Current key price:{' '}
										<span className="font-mono text-white/60">
											{formatNumber(currentPriceStroops / 10_000_000)} XLM
										</span>
									</p>
								)}

								{/* Submit Button */}
								<Button
									onClick={handleCreateSubscription}
									disabled={
										disabled ||
										isSubmitting ||
										!!amountError ||
										!amount.trim()
									}
									className="w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-amber-300 disabled:opacity-50"
									data-testid="create-subscription-button"
								>
									{isSubmitting ? (
										<>
											<RotateCcw className="size-4 mr-2 animate-spin" />
											Creating...
										</>
									) : (
										'Create Subscription'
									)}
								</Button>
							</div>
						)}
					</TabsContent>

					<TabsContent value="active" className="mt-4 space-y-4">
						{isSubscriptionLoading ? (
							<div className="space-y-4">
								<div className="h-24 bg-white/5 rounded-lg animate-pulse" />
							</div>
						) : activeSubscription ? (
							<div className="space-y-4" data-testid="active-subscription-card">
								{/* Subscription Config */}
								<div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
									<h4 className="font-semibold text-white mb-4 flex items-center gap-2">
										<CheckCircle2 className="size-4 text-emerald-400" />
										Active Subscription Configuration
									</h4>
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
										<div>
											<p className="text-white/50">Amount</p>
											<p className="font-mono text-white">
												{formatNumber(activeSubscription.amountXlm)} XLM
											</p>
										</div>
										<div>
											<p className="text-white/50">Interval</p>
											<p className="font-semibold text-white">
												{SUBSCRIPTION_INTERVAL_LABELS[activeSubscription.interval]}
											</p>
										</div>
										<div>
											<p className="text-white/50">Status</p>
											<p className="font-semibold text-emerald-400">
												{activeSubscription.status}
											</p>
										</div>
										<div>
											<p className="text-white/50">Total Invested</p>
											<p className="font-mono text-white">
												{formatNumber(activeSubscription.totalInvestedXlm)} XLM
											</p>
										</div>
									</div>
								</div>

								{/* Next Execution */}
								<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
									<div className="flex items-center gap-2 text-emerald-300 mb-2">
										<Clock className="size-4" />
										<span className="font-semibold">Next Execution</span>
									</div>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<p className="text-white/50">Date</p>
											<p className="font-mono text-white">
												{getNextExecutionDate(activeSubscription.nextExecutionAt).toLocaleString()}
											</p>
										</div>
										<div>
											<p className="text-white/50">In</p>
											<p className="font-mono text-white">
												{formatNextExecution(activeSubscription.nextExecutionAt)}
											</p>
										</div>
									</div>
								</div>

								{/* Cancel Button */}
								<Button
									variant="destructive"
									onClick={() =>
										handleCancelSubscription(activeSubscription.id)
									}
									disabled={isSubmitting}
									className="w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
									data-testid="cancel-subscription-button"
								>
									{isSubmitting ? (
										<>
											<RotateCcw className="size-4 mr-2 animate-spin" />
											Cancelling...
										</>
									) : (
										<>
											<X className="size-4 mr-2" />
											Cancel Subscription
										</>
									)}
								</Button>
							</div>
						) : (
							<div className="text-center py-8 text-white/50">
								<Clock className="size-12 mx-auto text-white/30 mb-4" />
								<p className="text-sm">No active subscription</p>
								<p className="text-xs text-white/40 mt-1">
									Create a new subscription to get started
								</p>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}