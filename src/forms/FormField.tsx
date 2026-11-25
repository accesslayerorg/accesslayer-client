import React from 'react';
import { Label } from '@/components/ui/label';

export interface FormErrorProps {
	id: string;
	message?: string;
}

/** Field error, announced to screen readers when it appears. */
export const FormError: React.FC<FormErrorProps> = ({ id, message }) =>
	message ? (
		<p id={id} role="alert" aria-live="polite" className="text-sm text-red-400">
			{message}
		</p>
	) : null;

export interface FormFieldProps {
	name: string;
	label: string;
	error?: string;
	/** Renders the control, receiving the a11y props to spread onto it. */
	children: (aria: {
		id: string;
		'aria-invalid': boolean;
		'aria-describedby'?: string;
	}) => React.ReactNode;
}

/** Label + control + error, with the error linked via aria-describedby. */
export const FormField: React.FC<FormFieldProps> = ({ name, label, error, children }) => {
	const id = `field-${name}`;
	const errorId = `${id}-error`;
	return (
		<div className="space-y-1">
			<Label htmlFor={id}>{label}</Label>
			{children({
				id,
				'aria-invalid': Boolean(error),
				...(error ? { 'aria-describedby': errorId } : {}),
			})}
			<FormError id={errorId} message={error} />
		</div>
	);
};
