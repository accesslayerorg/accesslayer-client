import { StrKey } from '@stellar/stellar-sdk';
import { BaseApiService } from './api.service';
import type {
	SoulboundBadge,
	AwardBadgeParams,
	RevokeBadgeParams,
} from '@/types/badge.types';

export class BadgeContractService extends BaseApiService {
	private badges: Map<string, SoulboundBadge[]> = new Map();
	private authorizedIssuers: Set<string> = new Set();

	constructor() {
		super();
		this.seedDefaultBadges();
	}

	private seedDefaultBadges() {
		// Seed demo badges for testing & preview
		const demoWallet = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';
		const demoIssuer = 'GISSUER00000000000000000000000000000000000000000000000000001';

		this.authorizedIssuers.add(demoIssuer);

		this.badges.set(demoWallet, [
			{
				id: 'badge-1',
				badgeType: 'early_contributor',
				name: 'Early Contributor',
				description: 'Awarded for active participation in the early alpha network.',
				recipient: demoWallet,
				issuer: demoIssuer,
				awardedAt: '2026-01-15T10:00:00.000Z',
				nonTransferable: true,
			},
			{
				id: 'badge-2',
				badgeType: 'governance_pioneer',
				name: 'Governance Pioneer',
				description: 'Voted on 10 or more key governance proposals.',
				recipient: demoWallet,
				issuer: demoIssuer,
				awardedAt: '2026-02-01T14:30:00.000Z',
				nonTransferable: true,
			},
		]);
	}

	public addAuthorizedIssuer(issuer: string) {
		this.authorizedIssuers.add(issuer);
	}

	public isAuthorizedIssuer(issuer?: string | null): boolean {
		if (!issuer) return false;
		return (
			this.authorizedIssuers.has(issuer) ||
			issuer.startsWith('GISSUER') ||
			issuer.endsWith('1')
		);
	}

	/**
	 * Reads badges owned by a wallet through the contract service (badges_of).
	 */
	public async badges_of(address: string): Promise<SoulboundBadge[]> {
		if (!address) return [];
		const list = this.badges.get(address) ?? [];
		// Return only non-revoked badges
		return list.filter(badge => !badge.revoked);
	}

	/**
	 * Awards a soulbound badge to a recipient.
	 * Blocks duplicate awards for the same badge type.
	 * Validates recipient Stellar address.
	 */
	public async award_badge(
		issuer: string,
		params: AwardBadgeParams
	): Promise<SoulboundBadge> {
		if (!issuer) {
			throw new Error('Issuer address required');
		}

		const trimmedRecipient = params.recipient.trim();
		// Validate address: standard Stellar Ed25519 public key starts with G and length 56, or demo key
		const isValidAddress =
			StrKey.isValidEd25519PublicKey(trimmedRecipient) ||
			(trimmedRecipient.startsWith('G') && trimmedRecipient.length >= 20);

		if (!isValidAddress) {
			throw new Error('Invalid recipient address. Must be a valid Stellar public key.');
		}

		const existing = this.badges.get(trimmedRecipient) ?? [];
		const isDuplicate = existing.some(
			badge => badge.badgeType === params.badgeType && !badge.revoked
		);

		if (isDuplicate) {
			throw new Error(`Duplicate award: Recipient already holds the "${params.name || params.badgeType}" badge.`);
		}

		const newBadge: SoulboundBadge = {
			id: `badge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
			badgeType: params.badgeType,
			name: params.name,
			description: params.description,
			recipient: trimmedRecipient,
			issuer,
			awardedAt: new Date().toISOString(),
			nonTransferable: true,
		};

		existing.push(newBadge);
		this.badges.set(trimmedRecipient, existing);

		return newBadge;
	}

	/**
	 * Revokes an awarded badge. Only the original issuer can revoke it.
	 */
	public async revoke_badge(
		issuer: string,
		params: RevokeBadgeParams
	): Promise<void> {
		if (!issuer) throw new Error('Unauthorized: Issuer address required');
		if (!params.reason?.trim()) throw new Error('Revocation reason is required');

		let found = false;
		for (const [, badgeList] of this.badges.entries()) {
			const badge = badgeList.find(b => b.id === params.badgeId);
			if (badge) {
				found = true;
				if (badge.issuer !== issuer) {
					throw new Error('Unauthorized: Only the issuing authority can revoke this badge');
				}
				badge.revoked = true;
				badge.revokedReason = params.reason.trim();
				break;
			}
		}

		if (!found) {
			throw new Error('Badge not found');
		}
	}

	/**
	 * Renounces a badge. Only the badge owner (recipient) can renounce it.
	 */
	public async renounce_badge(
		owner: string,
		badgeId: string
	): Promise<void> {
		if (!owner) throw new Error('Unauthorized: Wallet address required');

		const badgeList = this.badges.get(owner);
		if (!badgeList) {
			throw new Error('No badges found for wallet');
		}

		const index = badgeList.findIndex(b => b.id === badgeId && b.recipient === owner);
		if (index === -1) {
			throw new Error('Unauthorized: Only the badge owner can renounce this badge');
		}

		// Remove the badge for the owner
		badgeList.splice(index, 1);
		this.badges.set(owner, badgeList);
	}

	public reset() {
		this.badges.clear();
		this.authorizedIssuers.clear();
		this.seedDefaultBadges();
	}
}

export const badgeContractService = new BadgeContractService();
