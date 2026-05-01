import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AsyncButtonProps extends React.ComponentProps<typeof Button> {
	isPending?: boolean;
	pendingText?: string;
	spinnerClassName?: string;
}

export function AsyncButton({
	isPending = false,
	pendingText,
	disabled,
	className,
	children,
	spinnerClassName,
	...props
}: AsyncButtonProps) {
	return (
		<Button
			{...props}
			disabled={disabled || isPending}
			aria-busy={isPending || undefined}
			className={cn(className)}
		>
			{isPending && (
				<Loader2
					className={cn('mr-2 size-4 animate-spin', spinnerClassName)}
					aria-hidden="true"
				/>
			)}
			{isPending && pendingText ? pendingText : children}
		</Button>
	);
}
