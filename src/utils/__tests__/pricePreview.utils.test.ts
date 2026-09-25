/**
 * Unit tests for price preview calculation utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	calculateFeeBreakdown,
	type PricePreviewRequest,
} from '../pricePreview.utils';

describe('pricePreview.utils', () => {
	describe('calculateFeeBreakdown', () => {
		const baseRequest: PricePreviewRequest = {
			quantity: 10,
			keyPriceStroops: 1_000_000, // 0.1 XLM per key
			currentSupply: 100,
			protocolFeeBps: 250, // 2.5%
			creatorFeeBps: 250, // 2.5%
		};

		it('calculates correct gross cost', () => {
			const breakdown = calculateFeeBreakdown(baseRequest);
			// 1_000_000 stroops/key × 10 keys = 10_000_000 stroops
			expect(breakdown.grossCostStroops).toBe(10_000_000);
		});

		it('calculates correct protocol fee', () => {
			const breakdown = calculateFeeBreakdown(baseRequest);
			// 10_000_000 × 250 bps / 10_000 = 250_000 stroops (2.5%)
			expect(breakdown.protocolFeeStroops).toBe(250_000);
			expect(breakdown.protocolFeeBps).toBe(250);
		});

		it('calculates correct creator fee', () => {
			const breakdown = calculateFeeBreakdown(baseRequest);
			// 10_000_000 × 250 bps / 10_000 = 250_000 stroops (2.5%)
			expect(breakdown.creatorFeeStroops).toBe(250_000);
			expect(breakdown.creatorFeeBps).toBe(250);
		});

		it('calculates correct total cost', () => {
			const breakdown = calculateFeeBreakdown(baseRequest);
			// 10_000_000 + 250_000 + 250_000 = 10_500_000
			expect(breakdown.totalCostStroops).toBe(10_500_000);
		});

		it('handles zero fees correctly', () => {
			const request: PricePreviewRequest = {
				...baseRequest,
				protocolFeeBps: 0,
				creatorFeeBps: 0,
			};
			const breakdown = calculateFeeBreakdown(request);

			expect(breakdown.grossCostStroops).toBe(10_000_000);
			expect(breakdown.protocolFeeStroops).toBe(0);
			expect(breakdown.creatorFeeStroops).toBe(0);
			expect(breakdown.totalCostStroops).toBe(10_000_000);
		});

		it('handles asymmetric fees correctly', () => {
			const request: PricePreviewRequest = {
				...baseRequest,
				protocolFeeBps: 100, // 1%
				creatorFeeBps: 500, // 5%
			};
			const breakdown = calculateFeeBreakdown(request);

			// Gross: 10_000_000
			// Protocol: 10_000_000 × 100 / 10_000 = 100_000
			// Creator: 10_000_000 × 500 / 10_000 = 500_000
			// Total: 10_600_000
			expect(breakdown.grossCostStroops).toBe(10_000_000);
			expect(breakdown.protocolFeeStroops).toBe(100_000);
			expect(breakdown.creatorFeeStroops).toBe(500_000);
			expect(breakdown.totalCostStroops).toBe(10_600_000);
		});

		it('handles large quantities', () => {
			const request: PricePreviewRequest = {
				quantity: 100,
				keyPriceStroops: 10_000_000, // 1 XLM per key
				currentSupply: 0,
				protocolFeeBps: 250,
				creatorFeeBps: 250,
			};
			const breakdown = calculateFeeBreakdown(request);

			// Gross: 100_000_000
			expect(breakdown.grossCostStroops).toBe(1_000_000_000);
			// Fees are 2.5% each
			expect(breakdown.protocolFeeStroops).toBe(25_000_000);
			expect(breakdown.creatorFeeStroops).toBe(25_000_000);
			expect(breakdown.totalCostStroops).toBe(1_050_000_000);
		});

		it('rounds fees correctly', () => {
			const request: PricePreviewRequest = {
				quantity: 3,
				keyPriceStroops: 1_000_001, // Odd amount to test rounding
				currentSupply: 0,
				protocolFeeBps: 150, // 1.5%
				creatorFeeBps: 150, // 1.5%
			};
			const breakdown = calculateFeeBreakdown(request);

			const grossCost = 1_000_001 * 3; // 3_000_003
			const expectedProtocolFee = Math.round((grossCost * 150) / 10_000);
			const expectedCreatorFee = Math.round((grossCost * 150) / 10_000);

			expect(breakdown.grossCostStroops).toBe(grossCost);
			expect(breakdown.protocolFeeStroops).toBe(expectedProtocolFee);
			expect(breakdown.creatorFeeStroops).toBe(expectedCreatorFee);
		});

		it('defaults fee BPS to 0 when not provided', () => {
			const request: PricePreviewRequest = {
				quantity: 10,
				keyPriceStroops: 1_000_000,
				currentSupply: 100,
				// No protocolFeeBps or creatorFeeBps
			};
			const breakdown = calculateFeeBreakdown(request);

			expect(breakdown.protocolFeeBps).toBe(0);
			expect(breakdown.creatorFeeBps).toBe(0);
			expect(breakdown.protocolFeeStroops).toBe(0);
			expect(breakdown.creatorFeeStroops).toBe(0);
			expect(breakdown.totalCostStroops).toBe(breakdown.grossCostStroops);
		});
	});
});
