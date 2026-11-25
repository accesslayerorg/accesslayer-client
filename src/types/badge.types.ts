export interface SoulboundBadge {
	id: string;
	badgeType: string;
	name: string;
	description: string;
	recipient: string;
	issuer: string;
	awardedAt: string;
	nonTransferable: true;
	revoked?: boolean;
	revokedReason?: string;
}

export interface AwardBadgeParams {
	recipient: string;
	badgeType: string;
	name: string;
	description: string;
}

export interface RevokeBadgeParams {
	badgeId: string;
	reason: string;
}
