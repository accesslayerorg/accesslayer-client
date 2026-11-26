import type { HolderAttestation } from '@/types/holderAttestation';

export function attestationShareUrl(attestation: Pick<HolderAttestation, 'id'>): string {
	return `${window.location.origin}/verify/holder/${encodeURIComponent(attestation.id)}`;
}

export function isAttestationCurrent(attestation: Pick<HolderAttestation, 'expiresAt'>, now = Date.now()): boolean {
	const expiresAt = Date.parse(attestation.expiresAt);
	return Number.isFinite(expiresAt) && expiresAt > now;
}
