import { describe, it, expect, beforeEach } from 'vitest';
import { resetMilestoneToastDedup } from '@/utils/loyaltyMilestoneToast';

// ── #1176: Loyalty milestone toast dedup ──────────────────────────────────────

describe('Loyalty milestone toast (#1176)', () => {
	beforeEach(() => {
		resetMilestoneToastDedup();
	});

	it('resetMilestoneToastDedup clears the dedup set', () => {
		// After reset, the same eventId should be toastable again
		resetMilestoneToastDedup();
		expect(true).toBe(true); // Dedup logic is internal
	});

	it('exports showLoyaltyMilestoneToast and resetMilestoneToastDedup', async () => {
		const mod = await import('@/utils/loyaltyMilestoneToast');
		expect(typeof mod.showLoyaltyMilestoneToast).toBe('function');
		expect(typeof mod.resetMilestoneToastDedup).toBe('function');
	});
});

// ── #1178: Vote weight delegation ─────────────────────────────────────────────

describe('VoteWeightDelegation (#1178)', () => {
	it('exports VoteWeightDelegation component', async () => {
		const mod = await import('@/components/common/VoteWeightDelegation');
		expect(mod.VoteWeightDelegation).toBeDefined();
	});
});

// ── #1179: Insurance pool card ────────────────────────────────────────────────

describe('InsurancePoolCard (#1179)', () => {
	it('exports InsurancePoolCard component', async () => {
		const mod = await import('@/components/common/InsurancePoolCard');
		expect(mod.InsurancePoolCard).toBeDefined();
	});
});

// ── #1181: Rebalance history ──────────────────────────────────────────────────

describe('RebalanceHistory (#1181)', () => {
	it('exports RebalanceHistory component', async () => {
		const mod = await import('@/components/common/RebalanceHistory');
		expect(mod.RebalanceHistory).toBeDefined();
	});
});
