import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps extends React.ComponentProps<'div'> {
	value?: string;
	onValueChange?: (value: string) => void;
}

function RadioGroup({ className, ...props }: RadioGroupProps) {
	return (
		<div
			data-slot="radio-group"
			role="radiogroup"
			className={cn('grid gap-2', className)}
			{...props}
		/>
	);
}

interface RadioGroupItemProps extends Omit<React.ComponentProps<'input'>, 'type'> {
	value: string;
}

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
	return (
		<input
			type="radio"
			data-slot="radio-group-item"
			className={cn(
				'h-4 w-4 rounded-full border border-primary text-primary focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		/>
	);
}

export { RadioGroup, RadioGroupItem };
