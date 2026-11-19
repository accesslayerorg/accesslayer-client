import { describe, expect, it } from 'vitest';
import {
	DEFAULT_CIRCUIT_BREAKER_THRESHOLD_PERCENT,
	DEFAULT_CIRCUIT_BREAKER_PROXIMITY_RATIO,
	CIRCUIT_BREAKER_TOOLTIP_EXPLANATION,
	resolveCircuitBreakerThreshold,
	evaluateCircuitBreakerStatus,
} from '../circuitBreaker.utils';

describe('circuitBreaker.utils (#1034)', () => {
	describe('resolveCircuitBreakerThreshold', () => {
		it('returns default threshold of 15% and proximity ratio of 0.8 when options are empty', () => {
			expect(DEFAULT_CIRCUIT_BREAKER_PROXIMITY_RATIO).toBe(0.8);
			expect(resolveCircuitBreakerThreshold()).toBe(
				DEFAULT_CIRCUIT_BREAKER_THRESHOLD_PERCENT
			);
			expect(resolveCircuitBreakerThreshold({})).toBe(15);
		});

		it('uses thresholdPercent when provided', () => {
			expect(resolveCircuitBreakerThreshold({ thresholdPercent: 10 })).toBe(10);
			expect(resolveCircuitBreakerThreshold({ thresholdPercent: 25.5 })).toBe(
				25.5
			);
		});

		it('converts thresholdBps to percentage when thresholdPercent is omitted', () => {
			expect(resolveCircuitBreakerThreshold({ thresholdBps: 2000 })).toBe(20);
			expect(resolveCircuitBreakerThreshold({ thresholdBps: 1250 })).toBe(
				12.5
			);
		});

		it('prefers thresholdPercent over thresholdBps if both are given', () => {
			expect(
				resolveCircuitBreakerThreshold({
					thresholdPercent: 12,
					thresholdBps: 2000,
				})
			).toBe(12);
		});

		it('falls back to default if provided values are non-positive or invalid', () => {
			expect(resolveCircuitBreakerThreshold({ thresholdPercent: 0 })).toBe(15);
			expect(resolveCircuitBreakerThreshold({ thresholdPercent: -5 })).toBe(15);
			expect(resolveCircuitBreakerThreshold({ thresholdBps: 0 })).toBe(15);
			expect(
				resolveCircuitBreakerThreshold({ thresholdPercent: NaN, thresholdBps: null })
			).toBe(15);
		});
	});

	describe('evaluateCircuitBreakerStatus', () => {
		it('returns normal status when impact is well below proximity threshold', () => {
			const status = evaluateCircuitBreakerStatus({
				impactPercent: 5,
				thresholdPercent: 15,
			});

			expect(status.level).toBe('normal');
			expect(status.isBreached).toBe(false);
			expect(status.isApproaching).toBe(false);
			expect(status.thresholdPercent).toBe(15);
			expect(status.approachingThresholdPercent).toBe(12);
		});

		it('returns approaching status when impact reaches 80% proximity threshold', () => {
			// 12% is exactly 80% of 15%
			const status = evaluateCircuitBreakerStatus({
				impactPercent: 12,
				thresholdPercent: 15,
			});

			expect(status.level).toBe('approaching');
			expect(status.isBreached).toBe(false);
			expect(status.isApproaching).toBe(true);
			expect(status.message).toContain('approaching the key\'s circuit breaker limit');
		});

		it('returns approaching status when impact is between proximity and full threshold', () => {
			const status = evaluateCircuitBreakerStatus({
				impactPercent: 14.5,
				thresholdPercent: 15,
			});

			expect(status.level).toBe('approaching');
			expect(status.isBreached).toBe(false);
			expect(status.isApproaching).toBe(true);
		});

		it('returns breached status when impact equals the threshold', () => {
			const status = evaluateCircuitBreakerStatus({
				impactPercent: 15,
				thresholdPercent: 15,
			});

			expect(status.level).toBe('breached');
			expect(status.isBreached).toBe(true);
			expect(status.isApproaching).toBe(false);
			expect(status.message).toContain('Circuit breaker triggered');
		});

		it('returns breached status when impact exceeds the threshold', () => {
			const status = evaluateCircuitBreakerStatus({
				impactPercent: 22.4,
				thresholdPercent: 15,
			});

			expect(status.level).toBe('breached');
			expect(status.isBreached).toBe(true);
			expect(status.isApproaching).toBe(false);
		});

		it('respects custom proximityRatio', () => {
			// Proximity ratio 0.9 on 10% threshold -> warning at 9%
			const statusBelow = evaluateCircuitBreakerStatus({
				impactPercent: 8.5,
				thresholdPercent: 10,
				proximityRatio: 0.9,
			});
			expect(statusBelow.level).toBe('normal');

			const statusApproaching = evaluateCircuitBreakerStatus({
				impactPercent: 9.1,
				thresholdPercent: 10,
				proximityRatio: 0.9,
			});
			expect(statusApproaching.level).toBe('approaching');
		});

		it('handles null, undefined, or NaN impact gracefully', () => {
			const statusNull = evaluateCircuitBreakerStatus({ impactPercent: null });
			expect(statusNull.level).toBe('normal');
			expect(statusNull.impactPercent).toBe(0);

			const statusUndefined = evaluateCircuitBreakerStatus({
				impactPercent: undefined,
			});
			expect(statusUndefined.level).toBe('normal');

			const statusNaN = evaluateCircuitBreakerStatus({ impactPercent: NaN });
			expect(statusNaN.level).toBe('normal');
		});

		it('provides clear tooltip explanation constant', () => {
			expect(CIRCUIT_BREAKER_TOOLTIP_EXPLANATION).toMatch(
				/circuit breaker protection/i
			);
			expect(CIRCUIT_BREAKER_TOOLTIP_EXPLANATION).toMatch(/slippage/i);
		});
	});
});
