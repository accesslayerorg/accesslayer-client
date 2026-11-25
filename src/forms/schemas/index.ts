import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';

// ── Shared validators ──────────────────────────────────────────────────────

/** Stellar account (G…) with a valid checksum. */
export const stellarAddress = () =>
	z
		.string()
		.trim()
		.min(1, 'Recipient address is required')
		.refine(v => StrKey.isValidEd25519PublicKey(v), 'Please enter a valid recipient address');

/** Whole-key quantity: a positive integer, optionally capped by a balance. */
export const keyAmount = (max?: number) => {
	const base = z.coerce
		.number({ error: 'Enter an amount' })
		.int('Amount must be a whole number of keys')
		.positive('Amount must be greater than zero');
	return max === undefined
		? base
		: base.max(max, `Amount exceeds your available balance of ${max}`);
};

/** Slippage tolerance in percent (0.01 – 50). */
export const slippage = () =>
	z.coerce
		.number({ error: 'Enter a slippage tolerance' })
		.min(0.01, 'Slippage must be at least 0.01%')
		.max(50, 'Slippage cannot exceed 50%');

// ── Schemas ────────────────────────────────────────────────────────────────

export const swapSchema = (balance?: number) =>
	z.object({
		side: z.enum(['buy', 'sell']),
		amount: keyAmount(balance),
		slippage: slippage(),
	});
export type SwapFormValues = z.infer<ReturnType<typeof swapSchema>>;

export const transferSchema = (heldKeys?: number) =>
	z
		.object({
			recipient: stellarAddress(),
			amount: keyAmount(heldKeys),
			saveRecipient: z.boolean().default(false),
			label: z.string().trim().max(40, 'Label must be 40 characters or fewer').optional(),
		})
		.refine(v => !v.saveRecipient || Boolean(v.label), {
			path: ['label'],
			message: 'Please enter a label for the recipient',
		});
export type TransferFormValues = z.infer<ReturnType<typeof transferSchema>>;
