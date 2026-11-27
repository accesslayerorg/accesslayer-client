import React, { useEffect } from 'react';
import { useResolvedAddress } from '@/hooks/useResolvedAddress';
import { truncateAddress } from '@/utils/whitelist.utils';
import { cn } from '@/lib/utils';

export interface AddressInputProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'onChange'
> {
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onValueChange?: (value: string) => void;
	onResolved?: (resolvedAddress: string | null) => void;
	error?: string;
}

export const AddressInput = React.forwardRef<
	HTMLInputElement,
	AddressInputProps
>(
	(
		{
			value = '',
			onChange,
			onValueChange,
			onResolved,
			error: externalError,
			className,
			disabled,
			'aria-invalid': ariaInvalid,
			...props
		},
		ref
	) => {
		const stringValue = typeof value === 'string' ? value : '';
		const {
			resolvedAddress,
			isResolving,
			error: resolutionError,
			isFederation,
		} = useResolvedAddress(stringValue);

		useEffect(() => {
			onResolved?.(resolvedAddress);
		}, [resolvedAddress, onResolved]);

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			onChange?.(e);
			onValueChange?.(e.target.value);
		};

		const displayedError = resolutionError || externalError;

		return (
			<div className="w-full">
				<input
					ref={ref}
					type="text"
					value={value}
					onChange={handleChange}
					disabled={disabled}
					aria-invalid={!!displayedError || ariaInvalid}
					className={cn(
						'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15 font-mono',
						displayedError &&
							'border-red-500/50 focus:border-red-500 focus:ring-red-500/15',
						className
					)}
					{...props}
				/>
				{isResolving && (
					<p
						className="mt-1 text-[11px] text-white/50 animate-pulse"
						data-testid="address-resolving"
					>
						Resolving federation address…
					</p>
				)}
				{isFederation && resolvedAddress && !isResolving && (
					<p
						className="mt-1 font-mono text-[11px] text-amber-400"
						data-testid="address-resolved"
						title={resolvedAddress}
					>
						Resolved: {truncateAddress(resolvedAddress)}
					</p>
				)}
				{displayedError && !isResolving && (
					<p
						className="mt-1 text-[11px] text-red-400"
						role="alert"
						data-testid="address-error"
					>
						{displayedError}
					</p>
				)}
			</div>
		);
	}
);

AddressInput.displayName = 'AddressInput';

export default AddressInput;
