import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { parseWhitelistInput } from '@/utils/keyFactory.utils';

export interface WhitelistUploadInputProps {
	/** Raw textarea value — newline-separated wallet addresses. */
	value: string;
	/** Updates the raw value on every change. */
	onChange: (value: string) => void;
	/** Validation message for the field, shown when provided. */
	error?: string;
	/** Whether the field is read-only (e.g. while deploying). */
	disabled?: boolean;
	className?: string;
}

const MAX_ROWS = 8;

/**
 * Bulk whitelist upload input for the key factory wizard (#959).
 *
 * Accepts wallet addresses pasted in bulk — one per line — and reports the
 * parsed count plus any invalid or duplicate entries live so the creator can
 * fix the list before deploying.
 */
export const WhitelistUploadInput: React.FC<WhitelistUploadInputProps> = ({
	value,
	onChange,
	error,
	disabled = false,
	className,
}) => {
	const { addresses, invalid, duplicates } = parseWhitelistInput(value);
	const hasInput = value.trim().length > 0;

	return (
		<div className={cn('space-y-2', className)} data-testid="whitelist-upload">
			<label
				htmlFor="key-factory-whitelist"
				className="block text-xs font-bold uppercase tracking-[0.18em] text-white/50"
			>
				Whitelist addresses
			</label>
			<Textarea
				id="key-factory-whitelist"
				rows={MAX_ROWS}
				value={value}
				disabled={disabled}
				onChange={event => onChange(event.target.value)}
				placeholder={'GABC…\nGDEF…\n0x1234…'}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby="key-factory-whitelist-summary"
				data-testid="whitelist-input"
				className="min-h-32 font-mono text-xs"
			/>

			<p
				id="key-factory-whitelist-summary"
				className="text-xs text-white/55"
				data-testid="whitelist-parsed-count"
			>
				{hasInput
					? `${addresses.length} address${addresses.length === 1 ? '' : 'es'} recognised`
					: 'Paste one wallet address per line. Leave empty to skip the whitelist.'}
			</p>

			{invalid.length > 0 && (
				<p
					role="alert"
					className="text-xs text-red-400"
					data-testid="whitelist-invalid-entries"
				>
					{invalid.length} entr{invalid.length === 1 ? 'y is' : 'ies are'} not
					a valid wallet address: {invalid.slice(0, 3).join(', ')}
					{invalid.length > 3 ? '…' : ''}
				</p>
			)}

			{duplicates.length > 0 && (
				<p
					role="status"
					className="text-xs text-amber-300"
					data-testid="whitelist-duplicate-entries"
				>
					{duplicates.length} duplicate address
					{duplicates.length === 1 ? '' : 'es'} ignored.
				</p>
			)}

			{error && (
				<p role="alert" className="text-xs text-red-400" data-testid="whitelist-error">
					{error}
				</p>
			)}
		</div>
	);
};

export default WhitelistUploadInput;
