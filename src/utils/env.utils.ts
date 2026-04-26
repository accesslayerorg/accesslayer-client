import { z } from 'zod';

const envSchema = z.object({
	VITE_BACKEND_URL: z.string().default('/api'),
	VITE_DEFAULT_CHAIN_ID: z.coerce.number().default(84532),
	VITE_ANVIL_RPC_URL: z.string().default('http://127.0.0.1:8545'),
	VITE_BASE_SEPOLIA_RPC_URL: z.string().default('https://sepolia.base.org'),
	VITE_SEPOLIA_RPC_URL: z.string().optional(),
	VITE_MAINNET_RPC_URL: z.string().optional(),
});

export const env = envSchema.parse({
	VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
	VITE_DEFAULT_CHAIN_ID: import.meta.env.VITE_DEFAULT_CHAIN_ID,
	VITE_ANVIL_RPC_URL: import.meta.env.VITE_ANVIL_RPC_URL,
	VITE_BASE_SEPOLIA_RPC_URL: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL,
	VITE_SEPOLIA_RPC_URL: import.meta.env.VITE_SEPOLIA_RPC_URL,
	VITE_MAINNET_RPC_URL: import.meta.env.VITE_MAINNET_RPC_URL,
});
