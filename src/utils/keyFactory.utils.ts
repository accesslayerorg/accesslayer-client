/**
 * Key factory deployment wizard helpers (#959).
 *
 * A whitelisted creator configures a new creator key through a step-by-step
 * wizard before it is deployed by the factory contract. This module holds the
 * draft shape, the per-step validation rules, the bulk whitelist parser, and
 * the bonding-curve preview builder, so the wizard components stay purely
 * presentational and every step's validity can be asserted in one place.
 */

import {
	DEFAULT_BONDING_CURVE_PARAMS,
	computeBondingCurvePriceXLM,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

/** How a new key becomes tradeable. */
export type KeyLaunchMode = 'direct' | 'auction';

/** Ordered wizard steps. The value doubles as the step index. */
export const KEY_FACTORY_STEPS = [
	{ value: 'details', label: 'Key details' },
	{ value: 'curve', label: 'Bonding curve' },
	{ value: 'launch', label: 'Launch' },
	{ value: 'whitelist', label: 'Whitelist' },
	{ value: 'review', label: 'Review & deploy' },
] as const;

export type KeyFactoryStep = (typeof KEY_FACTORY_STEPS)[number]['value'];

/** Everything the wizard collects before deployment. */
export interface KeyFactoryDraft {
	/** Display name of the key. */
	name: string;
	/** Short description shown on the key detail page. */
	description: string;
	/** Category slug the key is listed under. */
	category: string;
	/** Base price of the bonding curve, in XLM. */
	basePriceXlm: string;
	/** Per-key price growth factor, e.g. `1.01` for 1% growth per key. */
	growthFactor: string;
	/** Maximum number of keys that can ever be minted. */
	maxSupply: string;
	/** How the key becomes tradeable. */
	launchMode: KeyLaunchMode;
	/** Auction price in XLM; only used when `launchMode` is `auction`. */
	auctionPriceXlm: string;
	/** Newline-separated wallet addresses allowed to buy during the auction. */
	whitelistInput: string;
}

export const EMPTY_KEY_FACTORY_DRAFT: KeyFactoryDraft = {
	name: '',
	description: '',
	category: '',
	basePriceXlm: '',
	growthFactor: '',
	maxSupply: '',
	launchMode: 'direct',
	auctionPriceXlm: '',
	whitelistInput: '',
};

/** Validation result for a single wizard step. */
export interface KeyFactoryStepValidation {
	/** Whether the step can be left behind. */
	isValid: boolean;
	/** Field-keyed error messages, empty when the step is valid. */
	errors: Record<string, string>;
}

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 280;
const MAX_WHITELIST_ENTRIES = 500;

/** Field keys used by the wizard's inputs, so errors map 1:1 to inputs. */
export type KeyFactoryField =
	| 'name'
	| 'description'
	| 'category'
	| 'basePriceXlm'
	| 'growthFactor'
	| 'maxSupply'
	| 'auctionPriceXlm'
	| 'whitelistInput';

/**
 * Wallet address shapes accepted in the whitelist. Stellar addresses are
 * base32 (`G` + 55 chars) and are case-insensitive in practice, so pasted
 * lowercase addresses are accepted and de-duplicated case-insensitively.
 */
const VALID_ADDRESS_PATTERN = /^(G[A-Z2-7]{55}|(0x)?[0-9a-f]{40})$/i;

/** Resolves the bonding curve params from a draft, falling back to defaults. */
export function resolveDraftCurveParams(
	draft: KeyFactoryDraft
): BondingCurveParams {
	const basePriceXlm = Number(draft.basePriceXlm);
	const growthFactor = Number(draft.growthFactor);

	return {
		basePriceStroops:
			Number.isFinite(basePriceXlm) && basePriceXlm > 0
				? Math.round(basePriceXlm * STROOPS_PER_XLM)
				: DEFAULT_BONDING_CURVE_PARAMS.basePriceStroops,
		growthFactor:
			Number.isFinite(growthFactor) && growthFactor > 1
				? growthFactor
				: DEFAULT_BONDING_CURVE_PARAMS.growthFactor,
	};
}

function parseNumeric(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

export function parseWhitelistAddresses(input: string): string[] {
	return (input ?? '')
		.split(/[\n,;\s]+/)
		.map(address => address.trim())
		.filter(Boolean);
}

export interface WhitelistParseResult {
	/** Addresses that passed validation, de-duplicated, in input order. */
	addresses: string[];
	/** Values that looked like addresses but failed validation. */
	invalid: string[];
	/** Addresses listed more than once in the input. */
	duplicates: string[];
}

/**
 * Parses a bulk whitelist paste.
 *
 * Accepts newline-separated addresses (and tolerates commas, semicolons and
 * whitespace as separators), de-duplicates while preserving order, and reports
 * anything that fails the address shape check so the step can surface it.
 */
export function parseWhitelistInput(input: string): WhitelistParseResult {
	const entries = parseWhitelistAddresses(input);
	const seen = new Set<string>();
	const addresses: string[] = [];
	const duplicates: string[] = [];
	const invalid: string[] = [];

	for (const entry of entries) {
		if (!VALID_ADDRESS_PATTERN.test(entry)) {
			invalid.push(entry);
			continue;
		}
		const normalized = entry.toUpperCase();
		if (seen.has(normalized)) {
			duplicates.push(entry);
			continue;
		}
		seen.add(normalized);
		addresses.push(entry);
	}

	return { addresses, invalid, duplicates };
}

/** Step 1 — key details. */
export function validateKeyDetailsStep(
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	const errors: Record<string, string> = {};
	const name = draft.name.trim();
	const description = draft.description.trim();

	if (name.length < MIN_NAME_LENGTH) {
		errors.name = `Name must be at least ${MIN_NAME_LENGTH} characters.`;
	} else if (name.length > MAX_NAME_LENGTH) {
		errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
	}

	if (description.length > MAX_DESCRIPTION_LENGTH) {
		errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
	}

	if (!draft.category.trim()) {
		errors.category = 'Choose a category.';
	}

	return { isValid: Object.keys(errors).length === 0, errors };
}

/** Step 2 — bonding curve configuration. */
export function validateCurveStep(
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	const errors: Record<string, string> = {};

	const basePrice = parseNumeric(draft.basePriceXlm);
	if (basePrice == null) {
		errors.basePriceXlm = 'Enter the base price in XLM.';
	} else if (basePrice <= 0) {
		errors.basePriceXlm = 'Base price must be greater than zero.';
	}

	const growthFactor = parseNumeric(draft.growthFactor);
	if (growthFactor == null) {
		errors.growthFactor = 'Enter a growth factor, e.g. 1.01.';
	} else if (growthFactor <= 1) {
		errors.growthFactor = 'Growth factor must be greater than 1.';
	} else if (growthFactor > 10) {
		errors.growthFactor = 'Growth factor must be 10 or less.';
	}

	const maxSupply = parseNumeric(draft.maxSupply);
	if (maxSupply == null) {
		errors.maxSupply = 'Enter the maximum key supply.';
	} else if (!Number.isInteger(maxSupply) || maxSupply <= 0) {
		errors.maxSupply = 'Maximum supply must be a whole number above zero.';
	}

	return { isValid: Object.keys(errors).length === 0, errors };
}

/** Step 3 — launch mode (auction vs direct). */
export function validateLaunchStep(
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	const errors: Record<string, string> = {};

	if (draft.launchMode === 'auction') {
		const auctionPrice = parseNumeric(draft.auctionPriceXlm);
		if (auctionPrice == null) {
			errors.auctionPriceXlm = 'Enter the auction price in XLM.';
		} else if (auctionPrice <= 0) {
			errors.auctionPriceXlm = 'Auction price must be greater than zero.';
		}
	}

	return { isValid: Object.keys(errors).length === 0, errors };
}

/** Step 4 — whitelist upload. Optional: an empty list is valid. */
export function validateWhitelistStep(
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	const errors: Record<string, string> = {};
	const { addresses, invalid } = parseWhitelistInput(draft.whitelistInput);

	if (invalid.length > 0) {
		errors.whitelistInput = `${invalid.length} entr${
			invalid.length === 1 ? 'y is' : 'ies are'
		} not a valid wallet address.`;
	} else if (addresses.length > MAX_WHITELIST_ENTRIES) {
		errors.whitelistInput = `Whitelist is limited to ${MAX_WHITELIST_ENTRIES} addresses.`;
	}

	return { isValid: Object.keys(errors).length === 0, errors };
}

/** Runs the validation for a single wizard step. */
export function validateKeyFactoryStep(
	step: KeyFactoryStep,
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	switch (step) {
		case 'details':
			return validateKeyDetailsStep(draft);
		case 'curve':
			return validateCurveStep(draft);
		case 'launch':
			return validateLaunchStep(draft);
		case 'whitelist':
			return validateWhitelistStep(draft);
		case 'review':
		default:
			return validateKeyFactoryDraft(draft);
	}
}

/** Runs every step's validation — used to gate the deploy action. */
export function validateKeyFactoryDraft(
	draft: KeyFactoryDraft
): KeyFactoryStepValidation {
	// `review` is excluded deliberately: it validates the whole draft, so
	// including it here would recurse.
	const errors = KEY_FACTORY_STEPS.filter(step => step.value !== 'review').reduce<
		Record<string, string>
	>(
		(acc, step) => ({
			...acc,
			...validateKeyFactoryStep(step.value, draft).errors,
		}),
		{}
	);

	return { isValid: Object.keys(errors).length === 0, errors };
}

/** Whether a step may be navigated to (steps after the first invalid one). */
export function canAdvanceToStep(
	draft: KeyFactoryDraft,
	targetIndex: number
): boolean {
	if (targetIndex <= 0) return true;

	return KEY_FACTORY_STEPS.slice(0, targetIndex).every(
		step => validateKeyFactoryStep(step.value, draft).isValid
	);
}

export interface CurvePreviewPoint {
	supply: number;
	priceXLM: number;
}

/** Number of points sampled across the curve preview. */
export const CURVE_PREVIEW_POINTS = 24;

/**
 * Samples the draft's bonding curve for the pre-deployment preview.
 *
 * Samples across the configured max supply when it is a valid number, and
 * falls back to a sensible default range so the preview always renders a
 * recognisable curve shape rather than an empty chart.
 */
export function buildCurvePreviewPoints(
	draft: KeyFactoryDraft,
	pointCount = CURVE_PREVIEW_POINTS
): CurvePreviewPoint[] {
	const maxSupply = parseNumeric(draft.maxSupply);
	const upperBound =
		maxSupply != null && maxSupply > 0 ? maxSupply : 100;
	const params = resolveDraftCurveParams(draft);
	const points = Math.max(2, pointCount);

	return Array.from({ length: points }, (_, index) => {
		const supply = Math.round((upperBound / (points - 1)) * index);
		return {
			supply,
			priceXLM: computeBondingCurvePriceXLM(supply, params),
		};
	});
}

/** Price of the first key under the draft's curve, in XLM. */
export function getDraftInitialPriceXlm(draft: KeyFactoryDraft): number {
	return computeBondingCurvePriceXLM(0, resolveDraftCurveParams(draft));
}
