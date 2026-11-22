/**
 * Who performed a creator-key action (#1224): the primary creator or one of
 * the co-creators managed in the creator dashboard (#1202).
 */

export type CoCreatorActorRole = 'Admin' | 'Content' | 'Revenue';
export type ActionActorRole = 'creator' | CoCreatorActorRole;

export interface ActionAttribution {
	wallet: string;
	role: ActionActorRole;
}

/** Raw attribution fields as the API may send them, nested or flattened. */
export interface ActionAttributionDto {
	actor?: { wallet?: string | null; role?: string | null } | null;
	postedBy?: { wallet?: string | null; role?: string | null } | null;
	actorWallet?: string | null;
	actor_wallet?: string | null;
	actorRole?: string | null;
	actor_role?: string | null;
}

const CO_CREATOR_ROLES: readonly CoCreatorActorRole[] = [
	'Admin',
	'Content',
	'Revenue',
];

export const ACTOR_ROLE_BADGE_CLASSES: Record<CoCreatorActorRole, string> = {
	Admin: 'text-red-300 bg-red-400/10 border-red-400/20',
	Content: 'text-blue-300 bg-blue-400/10 border-blue-400/20',
	Revenue: 'text-green-300 bg-green-400/10 border-green-400/20',
};

/** Maps an API role string to a known actor role; unknown or empty → creator. */
export function normalizeActorRole(value: unknown): ActionActorRole {
	if (typeof value !== 'string') return 'creator';
	const trimmed = value.trim().toLowerCase();
	return (
		CO_CREATOR_ROLES.find(role => role.toLowerCase() === trimmed) ?? 'creator'
	);
}

export function isCoCreatorAction(attribution: ActionAttribution): boolean {
	return attribution.role !== 'creator';
}

/**
 * Reads attribution from an API record, or null when no acting wallet is
 * present (older records), so feeds can omit the label entirely.
 */
export function toActionAttribution(
	dto: ActionAttributionDto | null | undefined
): ActionAttribution | null {
	if (!dto) return null;
	const nested = dto.actor ?? dto.postedBy;
	const wallet = (
		nested?.wallet ??
		dto.actorWallet ??
		dto.actor_wallet ??
		''
	).trim();
	if (!wallet) return null;
	return {
		wallet,
		role: normalizeActorRole(nested?.role ?? dto.actorRole ?? dto.actor_role),
	};
}
