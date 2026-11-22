import { useId, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAddressBook } from '@/hooks/useAddressBook';
import { truncateWalletAddress } from '@/utils/referral.utils';

export interface RecipientPickerProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

/**
 * Combobox for choosing a saved recipient or typing an address (#1296).
 * Filters saved entries by label and address as the user types; the input
 * value is always the raw address so unsaved recipients still work.
 */
export default function RecipientPicker({
	id,
	value,
	onChange,
	placeholder = 'G...',
	disabled,
	className,
}: RecipientPickerProps) {
	const entries = useAddressBook(state => state.entries);
	const listId = useId();
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const matches = useMemo(() => {
		const query = value.trim().toLowerCase();
		if (!query) return entries;
		return entries.filter(
			entry =>
				entry.label.toLowerCase().includes(query) ||
				entry.address.toLowerCase().includes(query)
		);
	}, [entries, value]);

	const expanded = open && matches.length > 0;
	const safeIndex = Math.min(activeIndex, Math.max(matches.length - 1, 0));

	const select = (address: string) => {
		onChange(address);
		setOpen(false);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setOpen(true);
			setActiveIndex(Math.min(safeIndex + 1, matches.length - 1));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(Math.max(safeIndex - 1, 0));
		} else if (event.key === 'Enter' && expanded) {
			event.preventDefault();
			select(matches[safeIndex].address);
		} else if (event.key === 'Escape') {
			setOpen(false);
		}
	};

	return (
		<div className="relative">
			<Input
				id={id}
				role="combobox"
				aria-expanded={expanded}
				aria-controls={listId}
				aria-autocomplete="list"
				aria-activedescendant={
					expanded ? `${listId}-option-${safeIndex}` : undefined
				}
				value={value}
				disabled={disabled}
				placeholder={placeholder}
				autoComplete="off"
				spellCheck={false}
				className={cn('font-mono text-sm', className)}
				onChange={e => {
					onChange(e.target.value);
					setActiveIndex(0);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onBlur={() => setOpen(false)}
				onKeyDown={handleKeyDown}
			/>
			{expanded && (
				<ul
					id={listId}
					role="listbox"
					className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
				>
					{matches.map((entry, index) => (
						<li
							key={entry.id}
							id={`${listId}-option-${index}`}
							role="option"
							aria-selected={index === safeIndex}
							className={cn(
								'flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm',
								index === safeIndex && 'bg-accent text-accent-foreground'
							)}
							// mousedown fires before the input blur closes the list
							onMouseDown={e => {
								e.preventDefault();
								select(entry.address);
							}}
						>
							<span className="truncate font-medium">{entry.label}</span>
							<span className="font-mono text-xs text-muted-foreground">
								{truncateWalletAddress(entry.address)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
