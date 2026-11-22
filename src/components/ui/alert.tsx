import * as React from 'react';
import { cn } from '@/lib/utils';

function Alert({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(
				'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
				className
			)}
			{...props}
		/>
	);
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-description"
			className={cn('text-sm [&_p]:leading-relaxed', className)}
			{...props}
		/>
	);
}

export { Alert, AlertDescription };
