/**
 * Validation and diffing for the creator metadata edit form (#818).
 *
 * The client submits an `update_metadata` contract call carrying only the
 * fields the creator actually changed, so this module both enforces the
 * on-chain length limits and computes the minimal change set.
 */

export const CREATOR_NAME_MAX_LENGTH = 64;
export const CREATOR_BIO_MAX_LENGTH = 256;

export interface CreatorMetadataDraft {
	name: string;
	bio: string;
	avatarUri: string;
}

export type CreatorMetadataChange = Partial<CreatorMetadataDraft>;

export interface CreatorMetadataValidation {
	nameError: string | null;
	bioError: string | null;
	isValid: boolean;
}

export function validateCreatorMetadata(
	draft: CreatorMetadataDraft
): CreatorMetadataValidation {
	const nameError =
		draft.name.length > CREATOR_NAME_MAX_LENGTH
			? `Name must be ${CREATOR_NAME_MAX_LENGTH} characters or fewer`
			: null;
	const bioError =
		draft.bio.length > CREATOR_BIO_MAX_LENGTH
			? `Bio must be ${CREATOR_BIO_MAX_LENGTH} characters or fewer`
			: null;

	return { nameError, bioError, isValid: !nameError && !bioError };
}

/**
 * Returns only the fields whose value differs from `initial`. An unchanged
 * draft yields an empty object, which callers treat as "nothing to submit".
 */
export function diffCreatorMetadata(
	initial: CreatorMetadataDraft,
	draft: CreatorMetadataDraft
): CreatorMetadataChange {
	const change: CreatorMetadataChange = {};
	(Object.keys(draft) as Array<keyof CreatorMetadataDraft>).forEach(key => {
		if (draft[key] !== initial[key]) {
			change[key] = draft[key];
		}
	});
	return change;
}

export function hasCreatorMetadataChange(
	initial: CreatorMetadataDraft,
	draft: CreatorMetadataDraft
): boolean {
	return Object.keys(diffCreatorMetadata(initial, draft)).length > 0;
}
