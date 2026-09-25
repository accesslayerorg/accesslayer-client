import { z } from 'zod';

const envSchema = z.object({
	VITE_BACKEND_URL: z.string().default('/api'),
	VITE_DEFAULT_CHAIN_ID: z.coerce.number().default(84532),
	VITE_ANVIL_RPC_URL: z.string().default('http://127.0.0.1:8545'),
	VITE_BASE_SEPOLIA_RPC_URL: z.string().default('https://sepolia.base.org'),
	VITE_SEPOLIA_RPC_URL: z.string().optional(),
	VITE_MAINNET_RPC_URL: z.string().optional(),
	VITE_STELLAR_NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
	// Comma-separated wallet addresses that may access the admin safety panel.
	// Leaving this unset fails closed and hides the panel.
	VITE_ADMIN_WALLETS: z.string().optional(),
	// UTM configuration for share links. Optional — when not provided, share URLs remain unchanged.
	VITE_UTM_SOURCE: z.string().optional(),
	VITE_UTM_MEDIUM: z.string().optional(),
	VITE_UTM_CAMPAIGN: z.string().optional(),
	VITE_UTM_TERM: z.string().optional(),
	VITE_UTM_CONTENT: z.string().optional(),
});

export const env = envSchema.parse({
	VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
	VITE_DEFAULT_CHAIN_ID: import.meta.env.VITE_DEFAULT_CHAIN_ID,
	VITE_ANVIL_RPC_URL: import.meta.env.VITE_ANVIL_RPC_URL,
	VITE_BASE_SEPOLIA_RPC_URL: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL,
	VITE_SEPOLIA_RPC_URL: import.meta.env.VITE_SEPOLIA_RPC_URL,
	VITE_MAINNET_RPC_URL: import.meta.env.VITE_MAINNET_RPC_URL,
	VITE_STELLAR_NETWORK: import.meta.env.VITE_STELLAR_NETWORK,
	VITE_ADMIN_WALLETS: import.meta.env.VITE_ADMIN_WALLETS,
	VITE_UTM_SOURCE: import.meta.env.VITE_UTM_SOURCE,
	VITE_UTM_MEDIUM: import.meta.env.VITE_UTM_MEDIUM,
	VITE_UTM_CAMPAIGN: import.meta.env.VITE_UTM_CAMPAIGN,
	VITE_UTM_TERM: import.meta.env.VITE_UTM_TERM,
	VITE_UTM_CONTENT: import.meta.env.VITE_UTM_CONTENT,
});
