/**
 * Auction configuration state + input validation for the creator dashboard
 * auction panel (#816).
 */

export type AuctionStatus = 'not_configured' | 'active' | 'completed';

export interface AuctionConfig {
	auctionPrice?: number | null;
	auctionSupply?: number | null;
	auctionSold?: number | null;
}

function positiveOrZero(value: number | null | undefined): number {
	if (value == null || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

export function getAuctionStatus(config: AuctionConfig): AuctionStatus {
	const price = positiveOrZero(config.auctionPrice);
	const supply = positiveOrZero(config.auctionSupply);

	if (price === 0 || supply === 0) return 'not_configured';

	const sold = positiveOrZero(config.auctionSold);
	return sold >= supply ? 'completed' : 'active';
}

/** Human-readable state label shown on the panel. */
export function describeAuctionState(config: AuctionConfig): string {
	switch (getAuctionStatus(config)) {
		case 'not_configured':
			return 'Not configured';
		case 'completed':
			return 'Completed';
		case 'active':
			return `Active (${positiveOrZero(config.auctionSold)} of ${positiveOrZero(
				config.auctionSupply
			)} sold)`;
	}
}

/**
 * The auction can be cancelled only once it is configured and while no keys
 * have been sold through it yet.
 */
export function canCancelAuction(config: AuctionConfig): boolean {
	return (
		getAuctionStatus(config) !== 'not_configured' &&
		positiveOrZero(config.auctionSold) === 0
	);
}

export interface AuctionInputValidation {
	priceError: string | null;
	supplyError: string | null;
	isValid: boolean;
}

/**
 * Validates the raw string values from the price / supply inputs. Price must
 * be a number greater than 0; supply must be a whole number greater than 0.
 */
export function validateAuctionInputs(
	priceRaw: string,
	supplyRaw: string
): AuctionInputValidation {
	const trimmedPrice = priceRaw.trim();
	const trimmedSupply = supplyRaw.trim();
	const price = Number(trimmedPrice);
	const supply = Number(trimmedSupply);

	const priceError =
		trimmedPrice === '' || !Number.isFinite(price) || price <= 0
			? 'Enter an auction price greater than 0'
			: null;

	const supplyError =
		trimmedSupply === '' || !Number.isInteger(supply) || supply <= 0
			? 'Enter a whole number of keys greater than 0'
			: null;

	return { priceError, supplyError, isValid: !priceError && !supplyError };
}
