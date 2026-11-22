import type { ContentGateType } from '@/types/contentGate';

/**
 * The gate types a creator can pick, with the copy shown in the panel (#1221).
 */
export const CONTENT_GATE_OPTIONS: Array<{
	id: ContentGateType;
	label: string;
	description: string;
}> = [
	{
		id: 'none',
		label: 'No Gate',
		description: 'Everyone can view the content.',
	},
	{
		id: 'holder',
		label: 'Holder Required',
		description: 'Only wallets holding at least one key can view it.',
	},
	{
		id: 'subscriber',
		label: 'Subscriber Required',
		description: 'Only active subscribers can view it.',
	},
	{
		id: 'threshold',
		label: 'Threshold (token amount)',
		description: 'Holders must hold at least the threshold amount of tokens.',
	},
];

/** Smallest threshold a creator can require, in tokens. */
export const MIN_GATE_THRESHOLD = 1;

/** Aliases the API has used for the gate types. */
const GATE_TYPE_ALIASES: Record<string, ContentGateType> = {
	none: 'none',
	no_gate: 'none',
	nogate: 'none',
	off: 'none',
	disabled: 'none',
	open: 'none',
	holder: 'holder',
	holder_required: 'holder',
	key_holder: 'holder',
	subscriber: 'subscriber',
	subscriber_required: 'subscriber',
	subscription: 'subscriber',
	threshold: 'threshold',
	token_threshold: 'threshold',
	amount: 'threshold',
};

/**
 * Narrows an unknown value to a gate type, accepting the aliases the API has
 * used. Returns null for anything else.
 */
export function isContentGateType(value: unknown): value is ContentGateType {
	if (typeof value !== 'string') return false;
	return GATE_TYPE_ALIASES[value.trim().toLowerCase()] !== undefined;
}

/**
 * Resolves an unknown value to a gate type, or null when it is not one.
 */
export function resolveContentGateType(value: unknown): ContentGateType | null {
	if (!isContentGateType(value)) return null;
	return GATE_TYPE_ALIASES[value.trim().toLowerCase()];
}

/**
 * Parses a raw threshold input. Returns the number, or null when the input is
 * blank or not a usable amount.
 */
export function parseGateThreshold(input: string): number | null {
	const trimmed = input.trim();
	if (trimmed === '') return null;

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) return null;
	if (!Number.isInteger(parsed) || parsed < MIN_GATE_THRESHOLD) return null;

	return parsed;
}

/**
 * Validates a raw threshold input, returning an inline error message or null
 * when the input is valid.
 */
export function getGateThresholdError(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed === '') return 'Enter a threshold amount';

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) return 'Enter a valid number';
	if (!Number.isInteger(parsed)) return 'Enter a whole number of tokens';
	if (parsed < MIN_GATE_THRESHOLD) {
		return `Minimum threshold is ${MIN_GATE_THRESHOLD} token`;
	}

	return null;
}
