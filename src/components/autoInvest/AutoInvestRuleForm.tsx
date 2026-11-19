import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
	useCreateAutoInvestRule,
	useUpdateAutoInvestRule,
} from '@/hooks/useAutoInvest';
import type { AutoInvestRule } from '@/types/autoInvest';

interface Props {
	editingRule?: AutoInvestRule;
	onClose: () => void;
}

const CATEGORIES = [
	'Art',
	'Music',
	'Tech',
	'Finance',
	'Fashion',
	'Design',
	'Writing',
	'Photography',
];

export default function AutoInvestRuleForm({ editingRule, onClose }: Props) {
	const [name, setName] = useState('');
	const [category, setCategory] = useState('');
	const [minRating, setMinRating] = useState<number | ''>('');
	const [maxPrice, setMaxPrice] = useState<number | ''>('');
	const [minUniqueTradersVolumeXlm, setMinUniqueTradersVolumeXlm] = useState<
		number | ''
	>('');
	const [maxPerKey, setMaxPerKey] = useState<number | ''>('');
	const [errors, setErrors] = useState<Record<string, string>>({});

	const createRule = useCreateAutoInvestRule();
	const updateRule = useUpdateAutoInvestRule();

	useEffect(() => {
		if (editingRule) {
			setName(editingRule.name);
			setCategory(editingRule.category || '');
			setMinRating(editingRule.minRating ?? '');
			setMaxPrice(editingRule.maxPrice);
			setMinUniqueTradersVolumeXlm(
				editingRule.minUniqueTradersVolumeXlm ?? ''
			);
			setMaxPerKey(editingRule.maxPerKey);
		}
	}, [editingRule]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) newErrors.name = 'Rule name is required';
		if (maxPrice === '' || maxPrice <= 0)
			newErrors.maxPrice = 'Max price must be greater than 0';
		if (maxPerKey === '' || maxPerKey <= 0)
			newErrors.maxPerKey = 'Max per key must be greater than 0';

		if (minRating !== '' && (minRating < 1 || minRating > 5)) {
			newErrors.minRating = 'Rating must be between 1 and 5';
		}

		if (minUniqueTradersVolumeXlm !== '' && minUniqueTradersVolumeXlm < 0) {
			newErrors.minUniqueTradersVolumeXlm = 'Volume must be non-negative';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		const ruleData = {
			name: name.trim(),
			category: category || undefined,
			minRating: minRating === '' ? undefined : minRating,
			maxPrice: maxPrice as number,
			minUniqueTradersVolumeXlm:
				minUniqueTradersVolumeXlm === ''
					? undefined
					: minUniqueTradersVolumeXlm,
			maxPerKey: maxPerKey as number,
			enabled: true,
		};

		if (editingRule) {
			updateRule.mutate(
				{ ruleId: editingRule.id, updates: ruleData },
				{ onSuccess: onClose }
			);
		} else {
			createRule.mutate(
				ruleData as Omit<
					AutoInvestRule,
					'id' | 'createdAt' | 'updatedAt'
				> & { enabled: true },
				{ onSuccess: onClose }
			);
		}
	};

	const isSubmitting = createRule.isPending || updateRule.isPending;

	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-bold text-white">
					{editingRule ? 'Edit Rule' : 'Create New Rule'}
				</h3>
				<button
					onClick={onClose}
					className="p-1 rounded hover:bg-white/10"
					aria-label="Close form"
				>
					<X className="size-4" />
				</button>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Rule Name */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Rule Name *
					</label>
					<input
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g., Budget Keys"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
					/>
					{errors.name && (
						<p className="mt-1 text-xs text-red-400">{errors.name}</p>
					)}
				</div>

				{/* Category */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Category (optional)
					</label>
					<select
						value={category}
						onChange={e => setCategory(e.target.value)}
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
					>
						<option value="">Any category</option>
						{CATEGORIES.map(cat => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>

				{/* Min Rating */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Min Rating (optional, 1-5)
					</label>
					<input
						type="number"
						step="0.1"
						min="1"
						max="5"
						value={minRating}
						onChange={e =>
							setMinRating(
								e.target.value === '' ? '' : parseFloat(e.target.value)
							)
						}
						placeholder="e.g., 4.0"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
					/>
					{errors.minRating && (
						<p className="mt-1 text-xs text-red-400">
							{errors.minRating}
						</p>
					)}
				</div>

				{/* Max Price */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Max Price (XLM) *
					</label>
					<input
						type="number"
						step="0.01"
						min="0"
						value={maxPrice}
						onChange={e =>
							setMaxPrice(
								e.target.value === '' ? '' : parseFloat(e.target.value)
							)
						}
						placeholder="e.g., 10.00"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
					/>
					{errors.maxPrice && (
						<p className="mt-1 text-xs text-red-400">{errors.maxPrice}</p>
					)}
				</div>

				{/* Min Unique Traders Volume */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Min Volume (XLM) (optional)
					</label>
					<input
						type="number"
						step="0.01"
						min="0"
						value={minUniqueTradersVolumeXlm}
						onChange={e =>
							setMinUniqueTradersVolumeXlm(
								e.target.value === '' ? '' : parseFloat(e.target.value)
							)
						}
						placeholder="e.g., 100.00"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
					/>
					{errors.minUniqueTradersVolumeXlm && (
						<p className="mt-1 text-xs text-red-400">
							{errors.minUniqueTradersVolumeXlm}
						</p>
					)}
				</div>

				{/* Max Per Key */}
				<div>
					<label className="block text-xs font-semibold uppercase tracking-[0.1em] text-white/70 mb-2">
						Max Per Key (XLM) *
					</label>
					<input
						type="number"
						step="0.01"
						min="0"
						value={maxPerKey}
						onChange={e =>
							setMaxPerKey(
								e.target.value === '' ? '' : parseFloat(e.target.value)
							)
						}
						placeholder="e.g., 5.00"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-amber-400/60"
					/>
					{errors.maxPerKey && (
						<p className="mt-1 text-xs text-red-400">
							{errors.maxPerKey}
						</p>
					)}
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<button
						type="submit"
						disabled={isSubmitting}
						className="flex-1 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-amber-300 disabled:opacity-50"
					>
						{isSubmitting
							? 'Saving...'
							: editingRule
								? 'Update Rule'
								: 'Create Rule'}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/10"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}
