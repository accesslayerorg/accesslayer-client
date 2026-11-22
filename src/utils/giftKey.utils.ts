/**
 * Validation helpers for gifting creator keys to another wallet.
 */

import {
	isValidStellarWalletAddress,
	normalizeWalletAddress,
} from '@/utils/batchTransfer.utils';

/** Maximum length of the optional note attached to a gift. */
export const MAX_GIFT_MESSAGE_LENGTH = 140;

/** A key gift as seen by the recipient's portfolio inbox. */
export interface ReceivedGift {
	id: string;
	keyId: string;
	keyName?: string;
	quantity: number;
	/** Sender wallet address. */
	from: string;
	/** Sender display name when known. */
	fromName?: string;
	message?: string;
	/** Epoch ms the gift was received. */
	receivedAt: number;
}

export interface GiftKeyInput {
	quantity: number | string;
	recipient: string;
	message?: string;
	/** Keys the sender currently has available to gift. */
	availableBalance: number;
}

export interface GiftKeyErrors {
	quantity?: string;
	recipient?: string;
	message?: string;
}

export interface GiftKeyValidationResult {
	isValid: boolean;
	quantity: number;
	/** Normalised (trimmed, upper-cased) recipient address. */
	recipient: string;
	errors: GiftKeyErrors;
}

/**
 * Validates a gift: the quantity must be a whole number within the sender's
 * balance, the recipient must be a Stellar address, and the message must fit
 * within {@link MAX_GIFT_MESSAGE_LENGTH}.
 */
export function validateGiftKey(input: GiftKeyInput): GiftKeyValidationResult {
	const errors: GiftKeyErrors = {};

	const quantityStr = String(input.quantity ?? '').trim();
	const quantity = Number(quantityStr);
	const recipient = normalizeWalletAddress(input.recipient ?? '');
	const message = input.message ?? '';

	if (!quantityStr) {
		errors.quantity = 'Quantity is required';
	} else if (!Number.isFinite(quantity) || quantity <= 0) {
		errors.quantity = 'Quantity must be at least 1';
	} else if (!Number.isInteger(quantity)) {
		errors.quantity = 'Quantity must be a whole number';
	} else if (quantity > input.availableBalance) {
		errors.quantity = `Quantity exceeds your balance of ${input.availableBalance} key${
			input.availableBalance === 1 ? '' : 's'
		}`;
	}

	if (!recipient) {
		errors.recipient = 'Recipient address is required';
	} else if (!isValidStellarWalletAddress(recipient)) {
		errors.recipient =
			'Invalid Stellar address (must start with G and be 56 characters)';
	}

	if (message.length > MAX_GIFT_MESSAGE_LENGTH) {
		errors.message = `Message cannot exceed ${MAX_GIFT_MESSAGE_LENGTH} characters`;
	}

	return {
		isValid: Object.keys(errors).length === 0,
		quantity,
		recipient,
		errors,
	};
}
