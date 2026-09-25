import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SIGNER_PREFERENCE_KEY, useSigner } from '../useSigner';
import type { Signer } from '@/lib/signing';

const software: Signer = {
	type: 'software',
	sign: vi.fn(),
	getPublicKey: vi.fn(),
};
const hardware: Signer = {
	type: 'hardware',
	sign: vi.fn(),
	getPublicKey: vi.fn(),
};

describe('useSigner', () => {
	it('honors the stored hardware preference when both signers are available', async () => {
		window.localStorage.setItem(SIGNER_PREFERENCE_KEY, 'hardware');
		const dependencies = {
			detectSoftware: vi.fn().mockResolvedValue(true),
			detectHardware: vi.fn().mockResolvedValue(true),
			createSoftware: () => software,
			createHardware: () => hardware,
		};
		const { result } = renderHook(() =>
			useSigner('test network', dependencies)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.preference).toBe('hardware');
		expect(result.current.activeSigner).toBe(hardware);
	});

	it('falls back to an available signer and persists preference changes', async () => {
		window.localStorage.setItem(SIGNER_PREFERENCE_KEY, 'hardware');
		const dependencies = {
			detectSoftware: vi.fn().mockResolvedValue(true),
			detectHardware: vi.fn().mockResolvedValue(false),
			createSoftware: () => software,
			createHardware: () => hardware,
		};
		const { result } = renderHook(() =>
			useSigner('test network', dependencies)
		);

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.activeSigner).toBe(software);
		result.current.setPreference('software');
		expect(window.localStorage.getItem(SIGNER_PREFERENCE_KEY)).toBe(
			'software'
		);
	});
});
