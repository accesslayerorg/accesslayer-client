import * as React from 'react';
import { Tooltip } from './tooltip';

interface Props {
	disabled?: boolean;
	reason?: string;
	children: React.ReactElement<{ disabled?: boolean; tabIndex?: number }>;
}

export function UnavailableAction({ disabled, reason, children }: Props) {
	if (!disabled) return children;

	return (
		<Tooltip content={reason || 'This action is unavailable'}>
			<span className="inline-flex cursor-not-allowed" aria-disabled="true">
				{React.cloneElement(children, {
					disabled: true,
					tabIndex: -1,
				})}
			</span>
		</Tooltip>
	);
}
