import { describe, it, expect, beforeEach } from 'vitest';
import {
	creatorKeyService,
	validateKeyConfig,
	validateKeyMetadata,
	isConfigChangeSubjectToTimelock,
} from '../creatorKey.service';
import { useTimelockStore } from '@/hooks/useTimelockStore';

describe('CreatorKeyService (#965)', () => {
	beforeEach(() => {
		creatorKeyService.reset();
		useTimelockStore.getState().reset();
	});

	it('returns only keys deployed by the given creator wallet address', async () => {
		const creator1 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
		const keys1 = await creatorKeyService.getDeployedKeys(creator1);
		expect(keys1.length).toBe(2);
		expect(keys1.every(k => k.creatorAddress.toLowerCase() === creator1.toLowerCase())).toBe(true);

		const creator2 = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
		const keys2 = await creatorKeyService.getDeployedKeys(creator2);
		expect(keys2.length).toBe(1);
		expect(keys2[0].metadata.symbol).toBe('CHEN');

		// Unknown wallet
		const unknown = await creatorKeyService.getDeployedKeys('0x0000000000000000000000000000000000000000');
		expect(unknown.length).toBe(0);
	});

	it('validates key config parameters against allowed ranges', () => {
		// Valid config
		const valid = validateKeyConfig({
			spreadBps: 500,
			cooldownSeconds: 300,
			holdingCap: 50,
		});
		expect(valid.isValid).toBe(true);
		expect(Object.keys(valid.errors).length).toBe(0);

		// Spread out of range (< 10 bps or > 1500 bps)
		const invalidSpread = validateKeyConfig({
			spreadBps: 5,
			cooldownSeconds: 300,
			holdingCap: 50,
		});
		expect(invalidSpread.isValid).toBe(false);
		expect(invalidSpread.errors.spreadBps).toBeDefined();

		const invalidSpreadHigh = validateKeyConfig({
			spreadBps: 2000,
			cooldownSeconds: 300,
			holdingCap: 50,
		});
		expect(invalidSpreadHigh.isValid).toBe(false);

		// Cooldown out of range (< 0 or > 604800)
		const invalidCooldown = validateKeyConfig({
			spreadBps: 500,
			cooldownSeconds: -10,
			holdingCap: 50,
		});
		expect(invalidCooldown.isValid).toBe(false);
		expect(invalidCooldown.errors.cooldownSeconds).toBeDefined();

		// Holding cap out of range (< 1 or > 100,000)
		const invalidCap = validateKeyConfig({
			spreadBps: 500,
			cooldownSeconds: 300,
			holdingCap: 0,
		});
		expect(invalidCap.isValid).toBe(false);
		expect(invalidCap.errors.holdingCap).toBeDefined();
	});

	it('validates metadata fields correctly', () => {
		const validMeta = validateKeyMetadata({
			name: 'VIP Creator Key',
			symbol: 'VIPKEY',
			description: 'Exclusive access pass',
			imageUri: 'https://example.com/image.png',
		});
		expect(validMeta.isValid).toBe(true);

		// Empty name
		const emptyName = validateKeyMetadata({
			name: ' ',
			symbol: 'VIP',
		});
		expect(emptyName.isValid).toBe(false);
		expect(emptyName.errors.name).toBeDefined();

		// Invalid image URI protocol
		const badUri = validateKeyMetadata({
			name: 'VIP Creator Key',
			symbol: 'VIPKEY',
			imageUri: 'ftp://bad-uri.com',
		});
		expect(badUri.isValid).toBe(false);
		expect(badUri.errors.imageUri).toBeDefined();
	});

	it('detects config changes subject to timelock delay', () => {
		const baseConfig = {
			spreadBps: 300,
			cooldownSeconds: 300,
			holdingCap: 50,
		};

		// Minor spread change (+50 bps): not subject to timelock
		expect(
			isConfigChangeSubjectToTimelock(baseConfig, {
				...baseConfig,
				spreadBps: 350,
			})
		).toBe(false);

		// Large spread increase (+150 bps): subject to timelock
		expect(
			isConfigChangeSubjectToTimelock(baseConfig, {
				...baseConfig,
				spreadBps: 450,
			})
		).toBe(true);

		// Lowering holding cap: subject to timelock
		expect(
			isConfigChangeSubjectToTimelock(baseConfig, {
				...baseConfig,
				holdingCap: 20,
			})
		).toBe(true);

		// Large cooldown increase: subject to timelock
		expect(
			isConfigChangeSubjectToTimelock(baseConfig, {
				...baseConfig,
				cooldownSeconds: 7200,
			})
		).toBe(true);
	});

	it('submits metadata update and confirms on-chain', async () => {
		const updateResult = await creatorKeyService.updateKeyMetadata('key-dev-1', {
			name: 'Updated Rivers Key',
			symbol: 'RIVER',
			description: 'New description text',
			imageUri: 'https://example.com/new.png',
		});

		expect(updateResult.success).toBe(true);
		expect(updateResult.txHash).toMatch(/^0x[a-f0-9]{64}$/);

		const keys = await creatorKeyService.getDeployedKeys('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
		const updatedKey = keys.find(k => k.id === 'key-dev-1');
		expect(updatedKey?.metadata.name).toBe('Updated Rivers Key');
	});

	it('routes sensitive config updates through timelock governance', async () => {
		const initialTimelockCount = useTimelockStore.getState().actions.length;

		const result = await creatorKeyService.updateKeyConfig(
			'key-dev-1',
			{
				spreadBps: 800, // +300 bps increase -> triggers timelock
				cooldownSeconds: 300,
				holdingCap: 50,
			},
			'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
		);

		expect(result.success).toBe(true);
		expect(result.requiresTimelock).toBe(true);
		expect(result.timelockDelayHours).toBe(24);

		// Verify proposed into timelock store
		const timelockActions = useTimelockStore.getState().actions;
		expect(timelockActions.length).toBe(initialTimelockCount + 1);
		const proposed = timelockActions[0];
		expect(proposed.actionType).toBe('UPDATE_KEY_CONFIG');
		expect(proposed.status).toBe('pending');
	});
});
