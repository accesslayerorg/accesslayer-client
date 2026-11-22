import {
	useForm,
	type FieldValues,
	type Path,
	type Resolver,
	type UseFormProps,
	type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';

/** React Hook Form resolver backed by a Zod schema (one message per field). */
export function zodResolver<T extends FieldValues>(schema: z.ZodType<T>): Resolver<T> {
	return async values => {
		const result = await schema.safeParseAsync(values);
		if (result.success) return { values: result.data, errors: {} };
		const errors: Record<string, { type: string; message: string }> = {};
		for (const issue of result.error.issues) {
			const name = issue.path.join('.');
			if (!errors[name]) errors[name] = { type: issue.code, message: issue.message };
		}
		return { values: {}, errors } as never;
	};
}

/** `useForm` pre-wired with a Zod schema; validates on blur, then on change. */
export function useZodForm<T extends FieldValues>(
	schema: z.ZodType<T>,
	props: Omit<UseFormProps<T>, 'resolver'> = {}
): UseFormReturn<T> {
	return useForm<T>({ mode: 'onTouched', ...props, resolver: zodResolver(schema) });
}

/** Shape of an API validation error: `{ fieldErrors: { field: message } }`. */
export interface ServerValidationError {
	fieldErrors?: Record<string, string | string[]>;
	message?: string;
}

/**
 * Map API validation errors onto the matching form fields. Errors for unknown
 * fields (or a bare message) land on `root.server`. Returns true if any were set.
 */
export function applyServerErrors<T extends FieldValues>(
	form: Pick<UseFormReturn<T>, 'setError' | 'getValues'>,
	error: unknown
): boolean {
	const { fieldErrors, message } = (error ?? {}) as ServerValidationError;
	const known = new Set(Object.keys(form.getValues()));
	let applied = false;
	for (const [field, value] of Object.entries(fieldErrors ?? {})) {
		const text = Array.isArray(value) ? value[0] : value;
		if (!text) continue;
		const target = known.has(field) ? (field as Path<T>) : ('root.server' as Path<T>);
		form.setError(target, { type: 'server', message: text });
		applied = true;
	}
	if (!applied && message) {
		form.setError('root.server' as Path<T>, { type: 'server', message });
		applied = true;
	}
	return applied;
}
