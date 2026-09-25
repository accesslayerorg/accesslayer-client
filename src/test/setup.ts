import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('wagmi', async importOriginal => {
	const actual = await importOriginal<typeof import('wagmi')>();
	return {
		...actual,
		useAccount: vi.fn(() => ({
			address: undefined,
			isConnected: false,
		})),
	};
});
