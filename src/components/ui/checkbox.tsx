import * as React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type'> {
	onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({ className, onCheckedChange, onChange, ...props }: CheckboxProps) {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange?.(e);
		onCheckedChange?.(e.target.checked);
	};

	return (
		<input
			type="checkbox"
			data-slot="checkbox"
			className={cn(
				'h-4 w-4 rounded border border-primary text-primary focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			onChange={handleChange}
			{...props}
		/>
	);
}

export { Checkbox };
