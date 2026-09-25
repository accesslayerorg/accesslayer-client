import { describe, it, expect, beforeEach } from 'vitest';
import { useCreatorKeyStore } from '../useCreatorKeyStore';
import { useTimelockStore } from '../useTimelockStore';

describe('useCreatorKeyStore (#965)', () => {
	beforeEach(() => {
		useCreatorKeyStore.getState().reset();
		useTimelockStore.getState().reset();
	});

	it('initializes with default state', () => {
		const state = useCreatorKeyStore.getState();
		expect(state.keys).toEqual([]);
		expect(state.selectedKeyId).toBeNull();
		expect(state.isLoading).toBe(false);
		expect(state.txStatus).toBe('idle');
	});

	it('fetches deployed keys for connected address and selects first key', async () => {
		await useCreatorKeyStore.getState().fetchKeys('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
		const state = useCreatorKeyStore.getState();

		expect(state.keys.length).toBe(2);
		expect(state.selectedKeyId).toBe('key-dev-1');
		expect(state.isLoading).toBe(false);
	});

	it('handles empty deployed keys for unknown wallet address', async () => {
		await useCreatorKeyStore.getState().fetchKeys('0x1111111111111111111111111111111111111111');
		const state = useCreatorKeyStore.getState();

		expect(state.keys).toEqual([]);
		expect(state.selectedKeyId).toBeNull();
	});

	it('allows selecting a specific deployed key', async () => {
		await useCreatorKeyStore.getState().fetchKeys('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
		useCreatorKeyStore.getState().selectKey('key-dev-2');

		expect(useCreatorKeyStore.getState().selectedKeyId).toBe('key-dev-2');
	});

	it('updates metadata and updates in-memory key state', async () => {
		await useCreatorKeyStore.getState().fetchKeys('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');

		const success = await useCreatorKeyStore.getState().updateMetadata('key-dev-1', {
			name: 'Rivers Premier Pass',
			symbol: 'RIVER',
			description: 'Premier tier description',
			imageUri: 'https://example.com/rivers.png',
		});

		expect(success).toBe(true);
		const state = useCreatorKeyStore.getState();
		expect(state.txStatus).toBe('success');
		const updatedKey = state.keys.find(k => k.id === 'key-dev-1');
		expect(updatedKey?.metadata.name).toBe('Rivers Premier Pass');
	});

	it('sets timelockNotice state when config change requires timelock delay', async () => {
		await useCreatorKeyStore.getState().fetchKeys('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');

		const success = await useCreatorKeyStore.getState().updateConfig(
			'key-dev-1',
			{
				spreadBps: 800, // Significant increase
				cooldownSeconds: 300,
				holdingCap: 50,
			},
			'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
		);

		expect(success).toBe(true);
		const state = useCreatorKeyStore.getState();
		expect(state.timelockNotice).not.toBeNull();
		expect(state.timelockNotice?.delayHours).toBe(24);
	});
});
