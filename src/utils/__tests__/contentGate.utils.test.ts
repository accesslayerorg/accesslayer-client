import { describe, expect, it } from 'vitest';
import {
	CONTENT_GATE_OPTIONS,
	getGateThresholdError,
	isContentGateType,
	parseGateThreshold,
	resolveContentGateType,
} from '../contentGate.utils';

describe('CONTENT_GATE_OPTIONS (#1221)', () => {
	it('offers the four gate types', () => {
		expect(CONTENT_GATE_OPTIONS.map(option => option.id)).toEqual([
			'none',
			'holder',
			'subscriber',
			'threshold',
		]);
	});

	it('labels every option', () => {
		expect(CONTENT_GATE_OPTIONS.map(option => option.label)).toEqual([
			'No Gate',
			'Holder Required',
			'Subscriber Required',
			'Threshold (token amount)',
		]);
	});
});

describe('isContentGateType (#1221)', () => {
	it('accepts the known gate types and their aliases', () => {
		expect(isContentGateType('none')).toBe(true);
		expect(isContentGateType('holder')).toBe(true);
		expect(isContentGateType('subscriber')).toBe(true);
		expect(isContentGateType('threshold')).toBe(true);
		expect(isContentGateType('holder_required')).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isContentGateType('mystery')).toBe(false);
		expect(isContentGateType(3)).toBe(false);
		expect(isContentGateType(null)).toBe(false);
	});
});

describe('resolveContentGateType (#1221)', () => {
	it('maps an alias to its gate type', () => {
		expect(resolveContentGateType('SUBSCRIBER_REQUIRED')).toBe('subscriber');
		expect(resolveContentGateType('no_gate')).toBe('none');
	});

	it('returns null for an unknown type', () => {
		expect(resolveContentGateType('mystery')).toBeNull();
	});
});

describe('parseGateThreshold (#1221)', () => {
	it('parses a whole number of tokens', () => {
		expect(parseGateThreshold('250')).toBe(250);
		expect(parseGateThreshold(' 12 ')).toBe(12);
	});

	it('rejects blank, fractional and out-of-range input', () => {
		expect(parseGateThreshold('')).toBeNull();
		expect(parseGateThreshold('   ')).toBeNull();
		expect(parseGateThreshold('1.5')).toBeNull();
		expect(parseGateThreshold('0')).toBeNull();
		expect(parseGateThreshold('-5')).toBeNull();
		expect(parseGateThreshold('abc')).toBeNull();
	});
});

describe('getGateThresholdError (#1221)', () => {
	it('returns null for a valid amount', () => {
		expect(getGateThresholdError('250')).toBeNull();
	});

	it('explains why the input is unusable', () => {
		expect(getGateThresholdError('')).toBe('Enter a threshold amount');
		expect(getGateThresholdError('abc')).toBe('Enter a valid number');
		expect(getGateThresholdError('1.5')).toBe('Enter a whole number of tokens');
		expect(getGateThresholdError('0')).toBe('Minimum threshold is 1 token');
	});
});
