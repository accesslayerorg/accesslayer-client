import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	describeLpContractErrorCode,
	extractContractErrorCode,
	formatLockCountdown,
	formatLpAmount,
	formatPoolShare,
	formatProjectedPoolShare,
	parseLpLock,
	parseStroops,
	parseXlmInputToStroops,
	resolveLpLockState,
	stroopsToXlmInput,
	summarizeLpEarnings,
	validateLpAmountInput,
} from '../lpPositions.utils';

const XLM = 10_000_000n;

describe('parseStroops', () => {
	it('accepts bigint, integer strings, and safe integers', () => {
		expect(parseStroops(5n)).toBe(5n);
		expect(parseStroops('12500000')).toBe(12_500_000n);
		expect(parseStroops(' 42 ')).toBe(42n);
		expect(parseStroops(7)).toBe(7n);
	});

	it('keeps i128-sized values exact', () => {
		const huge = '170141183460469231731687303715884105727';
		expect(parseStroops(huge)).toBe(BigInt(huge));
	});

	it('rejects fractions, negatives, unsafe numbers, and garbage', () => {
		expect(parseStroops(1.5)).toBeNull();
		expect(parseStroops(-1)).toBeNull();
		expect(parseStroops('-1')).toBeNull();
		expect(parseStroops('1.5')).toBeNull();
		expect(parseStroops(2 ** 60)).toBeNull();
		expect(parseStroops('abc')).toBeNull();
		expect(parseStroops(null)).toBeNull();
		expect(parseStroops(undefined)).toBeNull();
	});
});

describe('parseLpLock', () => {
	it('treats a missing lock as no lock', () => {
		expect(parseLpLock(undefined)).toEqual({ kind: 'none' });
		expect(parseLpLock(null)).toEqual({ kind: 'none' });
		expect(parseLpLock('')).toEqual({ kind: 'none' });
	});

	it('reads epoch seconds, epoch milliseconds, and ISO strings', () => {
		const ms = Date.parse('2030-01-01T00:00:00Z');
		expect(parseLpLock(ms / 1000)).toEqual({
			kind: 'until',
			unlocksAtMs: ms,
		});
		expect(parseLpLock(ms)).toEqual({ kind: 'until', unlocksAtMs: ms });
		expect(parseLpLock(String(ms / 1000))).toEqual({
			kind: 'until',
			unlocksAtMs: ms,
		});
		expect(parseLpLock('2030-01-01T00:00:00Z')).toEqual({
			kind: 'until',
			unlocksAtMs: ms,
		});
	});

	it('flags unparseable values as invalid instead of guessing', () => {
		expect(parseLpLock('not-a-date')).toEqual({ kind: 'invalid' });
		expect(parseLpLock(-5)).toEqual({ kind: 'invalid' });
		expect(parseLpLock(Number.NaN)).toEqual({ kind: 'invalid' });
		expect(parseLpLock({})).toEqual({ kind: 'invalid' });
	});
});

describe('resolveLpLockState', () => {
	const unlocksAtMs = 1_000_000;

	it('blocks removal while locked and reports remaining seconds (rounded up)', () => {
		expect(
			resolveLpLockState({ kind: 'until', unlocksAtMs }, unlocksAtMs - 1_500)
		).toEqual({ status: 'locked', remainingSeconds: 2, canRemove: false });
	});

	it('allows removal exactly at and after expiry', () => {
		expect(
			resolveLpLockState({ kind: 'until', unlocksAtMs }, unlocksAtMs)
		).toEqual({ status: 'unlocked', remainingSeconds: 0, canRemove: true });
		expect(
			resolveLpLockState({ kind: 'until', unlocksAtMs }, unlocksAtMs + 1)
				.canRemove
		).toBe(true);
	});

	it('allows removal with no lock and fails closed on an invalid lock', () => {
		expect(resolveLpLockState({ kind: 'none' }, 0).canRemove).toBe(true);
		expect(resolveLpLockState({ kind: 'invalid' }, 0)).toEqual({
			status: 'invalid',
			remainingSeconds: 0,
			canRemove: false,
		});
	});
});

describe('formatLockCountdown', () => {
	it('formats days, hours, minutes, seconds', () => {
		expect(formatLockCountdown(2 * 86_400 + 14 * 3_600 + 32 * 60 + 9)).toBe(
			'2d 14h 32m'
		);
		expect(formatLockCountdown(14 * 3_600 + 32 * 60 + 9)).toBe('14h 32m 9s');
		expect(formatLockCountdown(32 * 60 + 9)).toBe('32m 9s');
		expect(formatLockCountdown(9)).toBe('9s');
	});

	it('never renders negative or NaN durations', () => {
		expect(formatLockCountdown(0)).toBe('0s');
		expect(formatLockCountdown(-10)).toBe('0s');
		expect(formatLockCountdown(Number.NaN)).toBe('0s');
	});
});

describe('formatLpAmount', () => {
	it('renders full 7-decimal precision so tiny rewards are visible', () => {
		expect(formatLpAmount(12_500_000n)).toBe('1.2500000 XLM');
		expect(formatLpAmount(3n)).toBe('0.0000003 XLM');
		expect(formatLpAmount(0n)).toBe('0.0000000 XLM');
	});

	it('renders a dash for missing values', () => {
		expect(formatLpAmount(null)).toBe('—');
		expect(formatLpAmount(undefined)).toBe('—');
	});
});

describe('formatPoolShare', () => {
	const share = (
		contributionStroops: bigint,
		poolTotalLiquidityStroops: bigint | null,
		shareBps: number | null = null
	) =>
		formatPoolShare({
			contributionStroops,
			poolTotalLiquidityStroops,
			shareBps,
		});

	it('computes the exact ratio from contribution and pool total', () => {
		expect(share(25n * XLM, 100n * XLM)).toBe('25.00%');
		expect(share(1n, 3n)).toBe('33.33%');
		expect(share(1n, 8n)).toBe('12.50%');
	});

	it('floors instead of rounding up so near-100% never reads 100.00%', () => {
		expect(share(99_996n, 100_000n)).toBe('99.99%');
		expect(share(2n, 3n)).toBe('66.66%');
	});

	it('shows <0.01% for a tiny non-zero share rather than 0.00%', () => {
		expect(share(1n, 1_000_000n)).toBe('<0.01%');
	});

	it('handles the sole provider and zero contribution', () => {
		expect(share(50n, 50n)).toBe('100%');
		expect(share(0n, 50n)).toBe('0%');
	});

	it('falls back to the contract basis points when the pool total is missing', () => {
		expect(share(10n, null, 2_500)).toBe('25.00%');
		expect(share(10n, null, 1)).toBe('0.01%');
		expect(share(10n, null, 0)).toBe('<0.01%');
		expect(share(10n, null, 10_000)).toBe('100%');
		expect(share(10n, 0n, 1_234)).toBe('12.34%');
	});

	it('renders a dash when no source of truth is available', () => {
		expect(share(10n, null, null)).toBe('—');
		expect(share(10n, null, 1.5)).toBe('—');
	});

	it('property: never exceeds 100% and floors the true share', () => {
		fc.assert(
			fc.property(
				fc.bigInt({ min: 1n, max: 10n ** 30n }),
				fc.bigInt({ min: 0n, max: 10n ** 30n }),
				(contribution, others) => {
					const total = contribution + others;
					const text = share(contribution, total);
					if (text === '100%') return others === 0n;
					if (text === '<0.01%') return contribution * 10_000n < total;
					const hundredths = BigInt(text.replace(/[.%]/g, ''));
					// displayed <= true share < displayed + 0.01%
					return (
						hundredths * total <= contribution * 10_000n &&
						contribution * 10_000n < (hundredths + 1n) * total
					);
				}
			)
		);
	});
});

describe('formatProjectedPoolShare', () => {
	it('uses the contract formula amount / (total + amount)', () => {
		expect(formatProjectedPoolShare(100n * XLM, 300n * XLM)).toBe('25.00%');
		expect(formatProjectedPoolShare(5n, 0n)).toBe('100%');
	});

	it('renders a dash when the pool total is unknown', () => {
		expect(formatProjectedPoolShare(5n, null)).toBe('—');
	});
});

describe('parseXlmInputToStroops / stroopsToXlmInput', () => {
	it('converts decimal strings to exact stroops', () => {
		expect(parseXlmInputToStroops('1')).toBe(XLM);
		expect(parseXlmInputToStroops('12.5')).toBe(125_000_000n);
		expect(parseXlmInputToStroops('.5')).toBe(5_000_000n);
		expect(parseXlmInputToStroops('3.')).toBe(3n * XLM);
		expect(parseXlmInputToStroops('0.0000001')).toBe(1n);
	});

	it('flags too many decimals and rejects non-numeric input', () => {
		expect(parseXlmInputToStroops('0.00000001')).toBe('precision');
		expect(parseXlmInputToStroops('1e3')).toBeNull();
		expect(parseXlmInputToStroops('1,000')).toBeNull();
		expect(parseXlmInputToStroops('-1')).toBeNull();
		expect(parseXlmInputToStroops('abc')).toBeNull();
		expect(parseXlmInputToStroops('.')).toBeNull();
	});

	it('property: stroops -> input string -> stroops round-trips exactly', () => {
		fc.assert(
			fc.property(fc.bigInt({ min: 0n, max: 10n ** 25n }), stroops => {
				return (
					parseXlmInputToStroops(stroopsToXlmInput(stroops)) === stroops
				);
			})
		);
	});
});

describe('validateLpAmountInput', () => {
	const available = 10n * XLM;

	it('accepts an amount within the balance', () => {
		expect(
			validateLpAmountInput('2.5', { availableStroops: available })
		).toEqual({
			ok: true,
			stroops: 25_000_000n,
		});
	});

	it('accepts exactly the full available balance', () => {
		expect(
			validateLpAmountInput('10', { availableStroops: available }).ok
		).toBe(true);
	});

	it.each([
		['', 'required'],
		['   ', 'required'],
		['abc', 'invalid'],
		['1e2', 'invalid'],
		['0', 'non_positive'],
		['0.0000000', 'non_positive'],
		['1.12345678', 'precision'],
		['10.0000001', 'exceeds_balance'],
		['11', 'exceeds_balance'],
	])('rejects %j with reason %s', (input, reason) => {
		const result = validateLpAmountInput(input, {
			availableStroops: available,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe(reason);
	});

	it('refuses to validate when the balance is unknown', () => {
		const result = validateLpAmountInput('1', { availableStroops: null });
		expect(result).toMatchObject({
			ok: false,
			reason: 'balance_unavailable',
		});
	});

	it('enforces a protocol minimum when one is supplied', () => {
		const result = validateLpAmountInput('0.5', {
			availableStroops: available,
			minimumStroops: XLM,
		});
		expect(result).toMatchObject({ ok: false, reason: 'below_minimum' });
	});
});

describe('summarizeLpEarnings', () => {
	it('sums unclaimed and claimed rewards across positions', () => {
		expect(
			summarizeLpEarnings([
				{
					lpId: '1',
					pendingRewardsStroops: 100n,
					claimedRewardsStroops: 10n,
				},
				{
					lpId: '2',
					pendingRewardsStroops: 250n,
					claimedRewardsStroops: null,
				},
				{ lpId: '3', pendingRewardsStroops: 0n, claimedRewardsStroops: 5n },
			])
		).toEqual({
			positionCount: 3,
			unclaimedStroops: 350n,
			claimedStroops: 15n,
			totalStroops: 365n,
			unavailableCount: 0,
		});
	});

	it('never double-counts a repeated position', () => {
		const summary = summarizeLpEarnings([
			{ lpId: '1', pendingRewardsStroops: 100n, claimedRewardsStroops: 0n },
			{ lpId: '1', pendingRewardsStroops: 100n, claimedRewardsStroops: 0n },
		]);
		expect(summary.positionCount).toBe(1);
		expect(summary.totalStroops).toBe(100n);
	});

	it('withholds the total when any position rewards are unknown', () => {
		const summary = summarizeLpEarnings([
			{ lpId: '1', pendingRewardsStroops: 100n, claimedRewardsStroops: 0n },
			{ lpId: '2', pendingRewardsStroops: null, claimedRewardsStroops: 0n },
		]);
		expect(summary.unclaimedStroops).toBeNull();
		expect(summary.totalStroops).toBeNull();
		expect(summary.unavailableCount).toBe(1);
	});

	it('returns a zero total for no positions', () => {
		expect(summarizeLpEarnings([])).toEqual({
			positionCount: 0,
			unclaimedStroops: 0n,
			claimedStroops: 0n,
			totalStroops: 0n,
			unavailableCount: 0,
		});
	});

	it('property: total equals the sum over distinct positions', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						lpId: fc.integer({ min: 1, max: 20 }).map(String),
						pendingRewardsStroops: fc.bigInt({
							min: 0n,
							max: 10n ** 20n,
						}),
						claimedRewardsStroops: fc.bigInt({
							min: 0n,
							max: 10n ** 20n,
						}),
					})
				),
				positions => {
					const firstById = new Map<string, (typeof positions)[number]>();
					for (const p of positions) {
						if (!firstById.has(p.lpId)) firstById.set(p.lpId, p);
					}
					let expected = 0n;
					for (const p of firstById.values()) {
						expected += p.pendingRewardsStroops + p.claimedRewardsStroops;
					}
					const summary = summarizeLpEarnings(positions);
					return (
						summary.totalStroops === expected &&
						summary.positionCount === firstById.size
					);
				}
			)
		);
	});
});

describe('contract error helpers', () => {
	it('extracts the Soroban contract error code', () => {
		expect(
			extractContractErrorCode(
				'HostError: Error(Contract, #4)\n\nEvent log (newest first): ...'
			)
		).toBe(4);
		expect(extractContractErrorCode('network timeout')).toBeNull();
	});

	it('maps every LpRewardError code and falls back for unknown codes', () => {
		expect(describeLpContractErrorCode(2)).toMatch(/no longer exists/);
		expect(describeLpContractErrorCode(6)).toMatch(/already been closed/);
		expect(describeLpContractErrorCode(99)).toBe(
			'The liquidity contract rejected this transaction (error #99).'
		);
	});
});
