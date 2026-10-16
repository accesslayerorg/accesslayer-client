import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	'onChange'
> {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

/**
 * Accessible on/off switch. Renders a native button with `role="switch"`
 * so it is keyboard operable (Space/Enter) and announces its state.
 */
function Switch({
	checked,
	onCheckedChange,
	className,
	disabled,
	...props
}: SwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			data-slot="switch"
			data-state={checked ? 'checked' : 'unchecked'}
			disabled={disabled}
			onClick={() => onCheckedChange(!checked)}
			className={cn(
				'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				checked ? 'bg-primary' : 'bg-input',
				className
			)}
			{...props}
		>
			<span
				aria-hidden="true"
				className={cn(
					'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
					checked ? 'translate-x-4' : 'translate-x-0.5'
				)}
			/>
		</button>
	);
}

export { Switch };
