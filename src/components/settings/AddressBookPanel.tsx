import { useState } from 'react';
import { BookUser, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
	MAX_LABEL_LENGTH,
	useAddressBook,
	type AddressBookError,
} from '@/hooks/useAddressBook';
import { truncateWalletAddress } from '@/utils/referral.utils';

export interface AddressBookPanelProps {
	className?: string;
}

/**
 * Account settings panel for managing saved key-transfer recipients (#1296).
 * Supports adding, editing and deleting labeled Stellar addresses.
 */
export default function AddressBookPanel({ className }: AddressBookPanelProps) {
	const entries = useAddressBook(state => state.entries);
	const add = useAddressBook(state => state.add);
	const update = useAddressBook(state => state.update);
	const remove = useAddressBook(state => state.remove);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [label, setLabel] = useState('');
	const [address, setAddress] = useState('');
	const [error, setError] = useState<AddressBookError | null>(null);

	const resetForm = () => {
		setEditingId(null);
		setLabel('');
		setAddress('');
		setError(null);
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const input = { label, address };
		const result = editingId ? update(editingId, input) : add(input);
		if (!result.ok) {
			setError(result.error);
			return;
		}
		resetForm();
	};

	const startEdit = (id: string) => {
		const entry = entries.find(item => item.id === id);
		if (!entry) return;
		setEditingId(id);
		setLabel(entry.label);
		setAddress(entry.address);
		setError(null);
	};

	const handleDelete = (id: string) => {
		remove(id);
		if (editingId === id) resetForm();
	};

	const labelError = error?.field === 'label' ? error.message : null;
	const addressError = error?.field === 'address' ? error.message : null;

	return (
		<section
			aria-labelledby="address-book-heading"
			className={cn('rounded-xl border border-border p-6', className)}
		>
			<div className="mb-4 flex items-center gap-3">
				<BookUser className="size-5 text-foreground" aria-hidden="true" />
				<div>
					<h2
						id="address-book-heading"
						className="font-jakarta text-lg font-semibold"
					>
						Address book
					</h2>
					<p className="text-xs text-muted-foreground">
						Saved recipients for key transfers. Stored only in this browser.
					</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-3" noValidate>
				<div>
					<Label htmlFor="address-book-label">Label</Label>
					<Input
						id="address-book-label"
						value={label}
						onChange={e => setLabel(e.target.value)}
						aria-invalid={Boolean(labelError)}
						aria-describedby={
							labelError ? 'address-book-label-error' : undefined
						}
						className="mt-1"
						placeholder="e.g. Alice"
					/>
					{labelError && (
						<p
							id="address-book-label-error"
							role="alert"
							className="mt-1 text-xs text-destructive"
						>
							{labelError}
						</p>
					)}
				</div>
				<div>
					<Label htmlFor="address-book-address">Stellar address</Label>
					<Input
						id="address-book-address"
						value={address}
						onChange={e => setAddress(e.target.value)}
						aria-invalid={Boolean(addressError)}
						aria-describedby={
							addressError ? 'address-book-address-error' : undefined
						}
						className="mt-1 font-mono text-sm"
						placeholder="G..."
						spellCheck={false}
						autoComplete="off"
					/>
					{addressError && (
						<p
							id="address-book-address-error"
							role="alert"
							className="mt-1 text-xs text-destructive"
						>
							{addressError}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<Button type="submit">
						{editingId ? 'Save changes' : 'Add recipient'}
					</Button>
					{editingId && (
						<Button type="button" variant="outline" onClick={resetForm}>
							Cancel
						</Button>
					)}
				</div>
			</form>

			{entries.length === 0 ? (
				<p className="mt-6 text-sm text-muted-foreground">
					No saved recipients yet. Max label length is {MAX_LABEL_LENGTH}.
				</p>
			) : (
				<ul
					className="mt-6 divide-y divide-border"
					aria-label="Saved recipients"
				>
					{entries.map(entry => (
						<li
							key={entry.id}
							className="flex items-center justify-between gap-3 py-3"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">{entry.label}</p>
								<p
									className="font-mono text-xs text-muted-foreground"
									title={entry.address}
								>
									{truncateWalletAddress(entry.address)}
								</p>
							</div>
							<div className="flex shrink-0 gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Edit ${entry.label}`}
									onClick={() => startEdit(entry.id)}
								>
									<Pencil className="size-4" aria-hidden="true" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Delete ${entry.label}`}
									onClick={() => handleDelete(entry.id)}
								>
									<Trash2 className="size-4" aria-hidden="true" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
