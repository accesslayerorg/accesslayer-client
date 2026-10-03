import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import { cn } from '@/lib/utils';
import { formatXlmPrice, formatPercent } from '@/utils/numberFormat.utils';
import type { BundleLineItem, CreateBundleRequest } from '@/services/bundle.service';
import {
	BUNDLE_DEFAULT_EXPIRY_DAYS,
	computeBundleListPriceXlm,
	getBundleDiscountBps,
	getBundlePriceFloorXlm,
	resolveBundleExpiryIso,
	validateBundleDraft,
	type BundleKeyOption,
} from '@/utils/bundle.utils';

export interface BundleCreateFormProps {
	/** Creator keys available to include in a bundle. */
	availableKeys: BundleKeyOption[];
	/** Submits `create_bundle`. */
	onSubmit: (request: CreateBundleRequest) => void;
	/** Resets the form after a successful submission. */
	resetSignal?: number;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

const labelClass = 'text-xs font-bold uppercase tracking-[0.18em] text-white/50';

/**
 * Create-bundle form for the creator bundle management page.
 *
 * Lets a creator pick keys and quantities, then set a discounted bundle price
 * and an expiry window. The undiscounted list price and the minimum allowed
 * bundle price (the price floor) are shown live so the discount is always
 * evaluated against them before the form can be submitted.
 */
const BundleCreateForm: React.FC<BundleCreateFormProps> = ({
	availableKeys,
	onSubmit,
	resetSignal = 0,
	isSubmitting = false,
}) => {
	const [lines, setLines] = useState<BundleLineItem[]>([]);
	const [pendingKeyId, setPendingKeyId] = useState('');
	const [priceInput, setPriceInput] = useState('');
	const [expiryInput, setExpiryInput] = useState(
		String(BUNDLE_DEFAULT_EXPIRY_DAYS)
	);
	const [showErrors, setShowErrors] = useState(false);

	// Clear the draft once the parent signals a successful creation.
	useEffect(() => {
		setLines([]);
		setPendingKeyId('');
		setPriceInput('');
		setExpiryInput(String(BUNDLE_DEFAULT_EXPIRY_DAYS));
		setShowErrors(false);
	}, [resetSignal]);

	const priceByKeyIdXlm = useMemo(() => {
		const map: Record<string, number> = {};
		for (const key of availableKeys) map[key.id] = key.priceXlm;
		return map;
	}, [availableKeys]);

	const listPriceXlm = useMemo(
		() => computeBundleListPriceXlm(lines, priceByKeyIdXlm),
		[lines, priceByKeyIdXlm]
	);
	const floorXlm = getBundlePriceFloorXlm(listPriceXlm);
	const discountBps = getBundleDiscountBps(listPriceXlm, Number(priceInput));

	const { itemsError, priceError, expiryError, isValid } = validateBundleDraft(
		lines,
		priceInput,
		expiryInput,
		listPriceXlm
	);

	const keyTitleById = useMemo(() => {
		const map: Record<string, string> = {};
		for (const key of availableKeys) map[key.id] = key.title;
		return map;
	}, [availableKeys]);

	const availableToAdd = availableKeys.filter(
		key => !lines.some(line => line.keyId === key.id)
	);

	const addLine = () => {
		if (!pendingKeyId) return;
		if (lines.some(line => line.keyId === pendingKeyId)) return;
		setLines(current => [...current, { keyId: pendingKeyId, quantity: 1 }]);
		setPendingKeyId('');
	};

	const updateQuantity = (keyId: string, quantity: string) => {
		setLines(current =>
			current.map(line =>
				line.keyId === keyId
					? { ...line, quantity: Number(quantity) }
					: line
			)
		);
	};

	const removeLine = (keyId: string) => {
		setLines(current => current.filter(line => line.keyId !== keyId));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!isValid) {
			setShowErrors(true);
			return;
		}

		onSubmit({
			items: lines,
			discountPriceXlm: Number(priceInput.trim()),
			expiresAt: resolveBundleExpiryIso(Number(expiryInput.trim()), Date.now()),
		});
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-6"
			noValidate
			data-testid="bundle-create-form"
		>
			<div className="space-y-3">
				<label htmlFor="bundle-key-select" className={labelClass}>
					Bundle contents
				</label>

				<div className="flex flex-wrap gap-3">
					<select
						id="bundle-key-select"
						data-testid="bundle-key-select"
						className={cn(fieldClass, 'flex-1 min-w-[12rem]')}
						value={pendingKeyId}
						onChange={e => setPendingKeyId(e.target.value)}
						disabled={isSubmitting || availableToAdd.length === 0}
					>
						<option value="">
							{availableToAdd.length === 0
								? 'All keys added'
								: 'Select a key…'}
						</option>
						{availableToAdd.map(key => (
							<option key={key.id} value={key.id}>
								{key.title}
							</option>
						))}
					</select>

					<Button
						type="button"
						variant="outline"
						onClick={addLine}
						disabled={isSubmitting || !pendingKeyId}
						data-testid="bundle-add-key"
					>
						Add key
					</Button>
				</div>

				{lines.length > 0 && (
					<ul className="space-y-2">
						{lines.map(line => (
							<li
								key={line.keyId}
								className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
								data-testid={`bundle-line-${line.keyId}`}
							>
								<span
									className="min-w-0 flex-1 truncate text-sm text-white/80"
									data-testid="bundle-line-title"
								>
									{keyTitleById[line.keyId] ?? line.keyId}
								</span>

								<label
									htmlFor={`bundle-quantity-${line.keyId}`}
									className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
								>
									Qty
								</label>
								<input
									id={`bundle-quantity-${line.keyId}`}
									data-testid={`bundle-line-quantity-${line.keyId}`}
									inputMode="numeric"
									className={cn(fieldClass, 'w-24')}
									value={String(line.quantity)}
									onChange={e =>
										updateQuantity(line.keyId, e.target.value)
									}
									disabled={isSubmitting}
								/>

								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeLine(line.keyId)}
									disabled={isSubmitting}
									aria-label={`Remove ${keyTitleById[line.keyId] ?? line.keyId} from bundle`}
									data-testid={`bundle-line-remove-${line.keyId}`}
								>
									<X aria-hidden="true" />
								</Button>
							</li>
						))}
					</ul>
				)}

				{showErrors && itemsError && (
					<p
						role="alert"
						data-testid="bundle-items-error"
						className="text-xs text-red-400"
					>
						{itemsError}
					</p>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<span className={labelClass}>List price</span>
					<p
						className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white/70"
						data-testid="bundle-list-price"
					>
						{formatXlmPrice(listPriceXlm)}
					</p>
					<p
						className="text-xs text-white/45"
						data-testid="bundle-price-floor"
					>
						Minimum bundle price {formatXlmPrice(floorXlm)}
					</p>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="bundle-price" className={labelClass}>
						Bundle price (XLM)
					</label>
					<input
						id="bundle-price"
						data-testid="bundle-price-input"
						inputMode="decimal"
						className={fieldClass}
						value={priceInput}
						onChange={e => setPriceInput(e.target.value)}
						disabled={isSubmitting}
						placeholder="0.00"
						aria-invalid={showErrors && priceError ? 'true' : undefined}
					/>
					{showErrors && priceError && (
						<p
							role="alert"
							data-testid="bundle-price-error"
							className="text-xs text-red-400"
						>
							{priceError}
						</p>
					)}
				</div>

				<div className="space-y-1.5">
					<label htmlFor="bundle-expiry" className={labelClass}>
						Expires in (days)
					</label>
					<input
						id="bundle-expiry"
						data-testid="bundle-expiry-input"
						inputMode="numeric"
						className={fieldClass}
						value={expiryInput}
						onChange={e => setExpiryInput(e.target.value)}
						disabled={isSubmitting}
						placeholder="14"
						aria-invalid={showErrors && expiryError ? 'true' : undefined}
					/>
					{showErrors && expiryError && (
						<p
							role="alert"
							data-testid="bundle-expiry-error"
							className="text-xs text-red-400"
						>
							{expiryError}
						</p>
					)}
				</div>

				<div className="space-y-1.5">
					<span className={labelClass}>Buyer savings</span>
					<p
						className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-emerald-400"
						data-testid="bundle-savings"
					>
						{discountBps > 0
							? `${formatPercent(discountBps / 100)} (${formatXlmPrice(
									listPriceXlm - Number(priceInput)
								)})`
							: '—'}
					</p>
				</div>
			</div>

			<AsyncButton
				type="submit"
				isPending={isSubmitting}
				pendingText="Creating bundle…"
				data-testid="bundle-submit"
			>
				Create bundle
			</AsyncButton>
		</form>
	);
};

export default BundleCreateForm;
