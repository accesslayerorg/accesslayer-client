import { anvil, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { env } from '@/utils/env.utils';

export const supportedChains = [anvil, baseSepolia, sepolia, mainnet] as const;

export const defaultChain =
	supportedChains.find(chain => chain.id === env.VITE_DEFAULT_CHAIN_ID) ??
	baseSepolia;
