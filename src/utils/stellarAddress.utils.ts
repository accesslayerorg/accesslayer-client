/**
 * Stellar / Soroban strkey validation utilities.
 *
 * Contract addresses are base32 (RFC 4648, uppercase) encoded strkeys that
 * start with the `C` version prefix. A `C`-prefixed value is 56 characters
 * long and decodes to exactly 35 bytes:
 *   - 1 version byte (`0x10` for contracts),
 *   - 32 contract id bytes,
 *   - 2 CRC16-XModem checksum bytes.
 *
 * The checksum is validated so that every accepted value is guaranteed to be
 * a well-formed, checksum-valid contract address rather than just one that
 * happens to look like the right shape.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CONTRACT_ADDRESS_LENGTH = 56;
const DECODED_BYTE_LENGTH = 35;

/** Mirrors the on-disk contract-address regex documented above. */
const CONTRACT_ADDRESS_PATTERN = /^C[A-Z2-7]{55}$/;

function crc16XModem(bytes: Uint8Array): number {
	let crc = 0x0000;

	for (const byte of bytes) {
		crc ^= byte << 8;
		for (let bit = 0; bit < 8; bit++) {
			crc =
				crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
		}
	}

	return crc & 0xffff;
}

function base32Decode(value: string): Uint8Array | null {
	const bytes: number[] = [];
	let buffer = 0;
	let bitsLeft = 0;

	for (const char of value) {
		const digit = BASE32_ALPHABET.indexOf(char);
		if (digit === -1) return null;

		buffer = (buffer << 5) | digit;
		bitsLeft += 5;

		if (bitsLeft >= 8) {
			bytes.push((buffer >>> (bitsLeft - 8)) & 0xff);
			bitsLeft -= 8;
		}
	}

	// A 56-character, unpadded strkey decodes to whole bytes (56 * 5 = 280
	// bits). Any remainder means the input was malformed.
	if (bitsLeft > 0) return null;

	return new Uint8Array(bytes);
}

/**
 * Normalises a raw input value to the canonical uppercase strkey form used
 * when submitting, while keeping any input the user may have pasted.
 */
export function normalizeStellarContractAddress(value: string): string {
	return value.trim().toUpperCase();
}

/**
 * Returns `true` when the value is a checksum-valid Stellar contract strkey
 * (56 characters, `C` prefix, valid base32 payload with a matching
 * CRC16-XModem checksum). Accepts lowercase input and normalises it.
 */
export function isValidStellarContractAddress(value: string): boolean {
	const normalized = normalizeStellarContractAddress(value);

	if (
		normalized.length !== CONTRACT_ADDRESS_LENGTH ||
		!CONTRACT_ADDRESS_PATTERN.test(normalized)
	) {
		return false;
	}

	const decoded = base32Decode(normalized);
	if (!decoded || decoded.length !== DECODED_BYTE_LENGTH) return false;

	const payload = decoded.slice(0, decoded.length - 2);
	const checksum =
		(decoded[decoded.length - 2] << 8) | decoded[decoded.length - 1];

	return crc16XModem(payload) === checksum;
}

/**
 * Returns a user-facing validation message for a contract address input, or
 * `null` when the value (after normalization) is a valid contract address.
 */
export function getStellarContractAddressError(value: string): string | null {
	if (!normalizeStellarContractAddress(value)) {
		return 'Enter a Stellar contract address';
	}

	if (!isValidStellarContractAddress(value)) {
		return 'Enter a valid Stellar contract address (56-character address starting with C)';
	}

	return null;
}
