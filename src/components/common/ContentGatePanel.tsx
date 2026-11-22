import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	useContentGateConfig,
	useSetContentGateMutation,
} from '@/hooks/useContentGate';
import type { ContentGateType } from '@/types/contentGate';
import {
	CONTENT_GATE_OPTIONS,
	getGateThresholdError,
	parseGateThreshold,
} from '@/utils/contentGate.utils';

export interface ContentGatePanelProps {
	/** Creator key whose gate is configured. */
	creatorId: string;
	/** Connected wallet that submits the contract call. */
	wallet?: string;
	className?: string;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

/**
 * Content gate configuration panel for the creator dashboard (#1221).
 *
 * Lets the creator pick the access rule for their key's gated content: no
 * gate, holder required, subscriber required, or a token-amount threshold. The
 * threshold field only appears for the threshold gate. Saving submits the
 * `set_gate` contract call; the panel opens on the configuration stored for
 * the key, loaded from `GET /keys/:keyId/gate`.
 */
export function ContentGatePanel({
	creatorId,
	wallet,
	className,
}: ContentGatePanelProps) {
	const { config, isLoading, isError } = useContentGateConfig(creatorId);
	const setGateMutation = useSetContentGateMutation(creatorId, wallet);

	const [gateType, setGateType] = useState<ContentGateType>(config.gateType);
	const [thresholdInput, setThresholdInput] = useState(
		config.thresholdAmount != null ? String(config.thresholdAmount) : ''
	);
	const [showError, setShowError] = useState(false);

	// Keep the form aligned with the stored configuration once it loads (or
	// changes after a save).
	useEffect(() => {
		setGateType(config.gateType);
		setThresholdInput(
			config.thresholdAmount != null ? String(config.thresholdAmount) : ''
		);
		setShowError(false);
	}, [config.gateType, config.thresholdAmount]);

	const isSubmitting = setGateMutation.isPending;

	const thresholdError = useMemo(
		() =>
			gateType === 'threshold' ? getGateThresholdError(thresholdInput) : null,
		[gateType, thresholdInput]
	);
	const thresholdValue =
		gateType === 'threshold' ? parseGateThreshold(thresholdInput) : null;

	const activeOption = CONTENT_GATE_OPTIONS.find(
		option => option.id === gateType
	);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (isSubmitting) return;

		if (gateType === 'threshold') {
			if (thresholdValue === null) {
				setShowError(true);
				return;
			}
			setGateMutation.mutate({
				gateType,
				thresholdAmount: thresholdValue,
			});
			return;
		}

		setGateMutation.mutate({ gateType, thresholdAmount: null });
	};

	return (
		<form
			onSubmit={handleSubmit}
			className={cn('space-y-5', className)}
			noValidate
			data-testid="content-gate-panel"
		>
			{isLoading ? (
				<div className="space-y-2" data-testid="content-gate-loading">
					<Skeleton className="h-16 w-full rounded-xl" />
					<Skeleton className="h-16 w-full rounded-xl" />
				</div>
			) : isError ? (
				<div
					className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
					role="alert"
					data-testid="content-gate-error"
				>
					Couldn&apos;t load the current content gate.
				</div>
			) : (
				<>
					<div>
						<p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
							Gate type
						</p>
						<div
							role="radiogroup"
							aria-label="Content gate type"
							className="grid grid-cols-1 gap-2 sm:grid-cols-2"
							data-testid="content-gate-type-selector"
						>
							{CONTENT_GATE_OPTIONS.map(option => {
								const isSelected = gateType === option.id;
								return (
									<button
										key={option.id}
										type="button"
										role="radio"
										aria-checked={isSelected}
										data-testid={`content-gate-option-${option.id}`}
										onClick={() => {
											setGateType(option.id);
											setShowError(false);
										}}
										disabled={isSubmitting}
										className={cn(
											'flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors',
											isSelected
												? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
												: 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.05]'
										)}
									>
										<span className="flex items-center gap-2 text-sm font-semibold">
											{option.id === 'none' ? (
												<ShieldCheck
													className="size-4 shrink-0"
													aria-hidden="true"
												/>
											) : (
												<Lock
													className="size-4 shrink-0"
													aria-hidden="true"
												/>
											)}
											{option.label}
										</span>
										<span className="text-[0.7rem] leading-snug opacity-75">
											{option.description}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{gateType === 'threshold' && (
						<div className="space-y-1.5">
							<label
								htmlFor="content-gate-threshold"
								className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
							>
								Threshold amount (tokens)
							</label>
							<input
								id="content-gate-threshold"
								data-testid="content-gate-threshold-input"
								type="number"
								inputMode="numeric"
								min={1}
								step={1}
								className={fieldClass}
								value={thresholdInput}
								onChange={event =>
									setThresholdInput(event.target.value)
								}
								disabled={isSubmitting}
								placeholder="100"
								aria-describedby="content-gate-threshold-hint"
								aria-invalid={
									showError && thresholdError ? 'true' : undefined
								}
							/>
							<p
								id="content-gate-threshold-hint"
								className="text-xs text-white/40"
								data-testid="content-gate-threshold-hint"
							>
								Viewers need to hold at least this many tokens to unlock the
								content.
							</p>
							{showError && thresholdError && (
								<p
									role="alert"
									className="text-xs text-red-400"
									data-testid="content-gate-threshold-error"
								>
									{thresholdError}
								</p>
							)}
						</div>
					)}

					<div className="flex flex-wrap items-center justify-between gap-3">
						<p
							className="text-xs text-white/45"
							data-testid="content-gate-current"
						>
							Current gate:{' '}
							<span className="font-semibold text-white/70">
								{activeOption?.label ?? 'No Gate'}
							</span>
						</p>

						<Button
							type="submit"
							data-testid="content-gate-submit"
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Submitting…' : 'Save Gate'}
						</Button>
					</div>
				</>
			)}
		</form>
	);
}

export default ContentGatePanel;
