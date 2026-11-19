import { BaseApiService, type APIResponse } from './api.service';
import { useTimelockStore } from '@/hooks/useTimelockStore';

export interface KeyMetadata {
	name: string;
	symbol: string;
	description: string;
	imageUri: string;
}

export interface KeyConfig {
	/** Spread in basis points (10 to 1500 bps = 0.1% to 15%) */
	spreadBps: number;
	/** Cooldown between trades per wallet in seconds (0 to 604,800s = 7 days) */
	cooldownSeconds: number;
	/** Maximum keys allowed per individual holder wallet (1 to 100,000) */
	holdingCap: number;
}

export interface KeyAnalytics {
	holderCount: number;
	volumeXlm: number;
	volumeUsd: number;
	tradeCount: number;
	currentPriceXlm: number;
	currentPriceUsd: number;
}

export interface DeployedCreatorKey {
	id: string;
	creatorAddress: string;
	contractAddress: string;
	metadata: KeyMetadata;
	config: KeyConfig;
	analytics: KeyAnalytics;
	deployedAt: number;
}

export interface ConfigValidationResult {
	isValid: boolean;
	errors: Partial<Record<keyof KeyConfig, string>>;
}

export interface MetadataValidationResult {
	isValid: boolean;
	errors: Partial<Record<keyof KeyMetadata, string>>;
}

export const CONFIG_BOUNDS = {
	spreadBps: { min: 10, max: 1500, label: 'Spread' },
	cooldownSeconds: { min: 0, max: 604800, label: 'Cooldown Duration' },
	holdingCap: { min: 1, max: 100000, label: 'Holding Cap' },
} as const;

export function validateKeyConfig(config: Partial<KeyConfig>): ConfigValidationResult {
	const errors: Partial<Record<keyof KeyConfig, string>> = {};

	if (config.spreadBps === undefined || isNaN(config.spreadBps)) {
		errors.spreadBps = 'Spread is required.';
	} else if (config.spreadBps < CONFIG_BOUNDS.spreadBps.min || config.spreadBps > CONFIG_BOUNDS.spreadBps.max) {
		errors.spreadBps = `Spread must be between ${CONFIG_BOUNDS.spreadBps.min} bps (0.1%) and ${CONFIG_BOUNDS.spreadBps.max} bps (15.0%).`;
	}

	if (config.cooldownSeconds === undefined || isNaN(config.cooldownSeconds)) {
		errors.cooldownSeconds = 'Cooldown duration is required.';
	} else if (config.cooldownSeconds < CONFIG_BOUNDS.cooldownSeconds.min || config.cooldownSeconds > CONFIG_BOUNDS.cooldownSeconds.max) {
		errors.cooldownSeconds = `Cooldown must be between 0 and 604,800 seconds (7 days).`;
	}

	if (config.holdingCap === undefined || isNaN(config.holdingCap)) {
		errors.holdingCap = 'Holding cap is required.';
	} else if (config.holdingCap < CONFIG_BOUNDS.holdingCap.min || config.holdingCap > CONFIG_BOUNDS.holdingCap.max) {
		errors.holdingCap = `Holding cap must be between ${CONFIG_BOUNDS.holdingCap.min} and ${CONFIG_BOUNDS.holdingCap.max.toLocaleString()} keys.`;
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}

export function validateKeyMetadata(metadata: Partial<KeyMetadata>): MetadataValidationResult {
	const errors: Partial<Record<keyof KeyMetadata, string>> = {};

	if (!metadata.name || !metadata.name.trim()) {
		errors.name = 'Key name is required.';
	} else if (metadata.name.trim().length < 2) {
		errors.name = 'Key name must be at least 2 characters.';
	} else if (metadata.name.trim().length > 50) {
		errors.name = 'Key name cannot exceed 50 characters.';
	}

	if (!metadata.symbol || !metadata.symbol.trim()) {
		errors.symbol = 'Symbol is required.';
	} else if (metadata.symbol.trim().length < 2 || metadata.symbol.trim().length > 10) {
		errors.symbol = 'Symbol must be between 2 and 10 characters.';
	}

	if (metadata.description && metadata.description.length > 500) {
		errors.description = 'Description cannot exceed 500 characters.';
	}

	if (metadata.imageUri && metadata.imageUri.trim()) {
		const uri = metadata.imageUri.trim().toLowerCase();
		const isValidUri = uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('ipfs://');
		if (!isValidUri) {
			errors.imageUri = 'Image URI must start with https://, http://, or ipfs://';
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}

/**
 * Determines whether a config modification is sensitive enough to require timelock delay.
 * Changes that increase spread by >= 100 bps, set cooldown > 3600s, or reduce holding cap
 * are routed through timelock to protect traders from abrupt creator parameter changes.
 */
export function isConfigChangeSubjectToTimelock(current: KeyConfig, updated: KeyConfig): boolean {
	const spreadDiff = updated.spreadBps - current.spreadBps;
	if (spreadDiff >= 100) return true;
	if (updated.cooldownSeconds > 3600 && updated.cooldownSeconds > current.cooldownSeconds) return true;
	if (updated.holdingCap < current.holdingCap) return true;
	return false;
}

const DEFAULT_XLM_USD = 0.12;

const INITIAL_MOCK_KEYS: DeployedCreatorKey[] = [
	{
		id: 'key-dev-1',
		creatorAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
		contractAddress: '0xCC84b39F93f5451D4e3fC69F65E47c0a96a4B9B1',
		metadata: {
			name: 'Rivers Access Key',
			symbol: 'RIVER',
			description: 'Primary creator key providing gated community access and tiered token perks.',
			imageUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
		},
		config: {
			spreadBps: 500, // 5.0%
			cooldownSeconds: 300, // 5 minutes
			holdingCap: 50,
		},
		analytics: {
			holderCount: 142,
			volumeXlm: 48200,
			volumeUsd: Math.round(48200 * DEFAULT_XLM_USD * 100) / 100,
			tradeCount: 1240,
			currentPriceXlm: 12.5,
			currentPriceUsd: Math.round(12.5 * DEFAULT_XLM_USD * 100) / 100,
		},
		deployedAt: Date.now() - 30 * 24 * 3600 * 1000,
	},
	{
		id: 'key-dev-2',
		creatorAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
		contractAddress: '0x17A6349D6864fa91A803B5658e4D19Ac9e273397',
		metadata: {
			name: 'Rivers Alpha Pass',
			symbol: 'RALPHA',
			description: 'Exclusive key for research notes, strategy alpha, and governance participation.',
			imageUri: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=150',
		},
		config: {
			spreadBps: 300, // 3.0%
			cooldownSeconds: 600, // 10 minutes
			holdingCap: 20,
		},
		analytics: {
			holderCount: 89,
			volumeXlm: 27600,
			volumeUsd: Math.round(27600 * DEFAULT_XLM_USD * 100) / 100,
			tradeCount: 630,
			currentPriceXlm: 35.0,
			currentPriceUsd: Math.round(35.0 * DEFAULT_XLM_USD * 100) / 100,
		},
		deployedAt: Date.now() - 15 * 24 * 3600 * 1000,
	},
	{
		id: 'key-dev-3',
		creatorAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
		contractAddress: '0x88B13B566c5B537b0c79B2b6B8084aBca7d75D35',
		metadata: {
			name: 'Chen Dev Key',
			symbol: 'CHEN',
			description: 'Engineering ecosystem key granting access to SDK repos and tooling demos.',
			imageUri: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150',
		},
		config: {
			spreadBps: 400, // 4.0%
			cooldownSeconds: 120, // 2 minutes
			holdingCap: 100,
		},
		analytics: {
			holderCount: 320,
			volumeXlm: 94000,
			volumeUsd: Math.round(94000 * DEFAULT_XLM_USD * 100) / 100,
			tradeCount: 2890,
			currentPriceXlm: 18.0,
			currentPriceUsd: Math.round(18.0 * DEFAULT_XLM_USD * 100) / 100,
		},
		deployedAt: Date.now() - 45 * 24 * 3600 * 1000,
	},
];

export class CreatorKeyService extends BaseApiService {
	private mockKeys: DeployedCreatorKey[] = [...INITIAL_MOCK_KEYS];

	/**
	 * Fetches all keys deployed strictly by the connected creator wallet.
	 */
	async getDeployedKeys(creatorAddress?: string): Promise<DeployedCreatorKey[]> {
		if (!creatorAddress) return [];
		const normalized = creatorAddress.toLowerCase().trim();

		try {
			const res = await this.api.get<APIResponse<DeployedCreatorKey[]>>(
				`/creator/keys`,
				{ params: { creator: normalized } }
			);
			return res.data.data;
		} catch {
			// Fallback local memory dataset
			return this.mockKeys.filter(
				k => k.creatorAddress.toLowerCase().trim() === normalized
			);
		}
	}

	/**
	 * Updates key metadata (name, description, imageUri) and submits on-chain.
	 */
	async updateKeyMetadata(
		keyId: string,
		metadata: KeyMetadata
	): Promise<{ success: boolean; txHash: string }> {
		const validation = validateKeyMetadata(metadata);
		if (!validation.isValid) {
			const firstError = Object.values(validation.errors)[0] ?? 'Invalid metadata.';
			throw new Error(firstError);
		}

		// Simulate on-chain confirmation latency
		await new Promise<void>(resolve => setTimeout(resolve, 300));

		const existing = this.mockKeys.find(k => k.id === keyId);
		if (existing) {
			existing.metadata = { ...metadata };
		}

		return {
			success: true,
			txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
		};
	}

	/**
	 * Updates key configuration (spread, cooldown, holding cap).
	 * If subject to timelock delay, routes through timelock governance.
	 */
	async updateKeyConfig(
		keyId: string,
		newConfig: KeyConfig,
		creatorAddress: string
	): Promise<{
		success: boolean;
		requiresTimelock: boolean;
		timelockActionId?: string;
		timelockDelayHours?: number;
		txHash?: string;
	}> {
		const validation = validateKeyConfig(newConfig);
		if (!validation.isValid) {
			const firstError = Object.values(validation.errors)[0] ?? 'Invalid configuration.';
			throw new Error(firstError);
		}

		const existing = this.mockKeys.find(k => k.id === keyId);
		if (!existing) {
			throw new Error('Key not found.');
		}

		// Check timelock requirement
		const requiresTimelock = isConfigChangeSubjectToTimelock(existing.config, newConfig);

		if (requiresTimelock) {
			const delayHours = 24;
			const delayMs = delayHours * 3600 * 1000;
			const actionId = `tl-key-config-${Date.now()}`;

			// Propose into timelock store
			useTimelockStore.getState().proposeAction({
				actionType: 'UPDATE_KEY_CONFIG',
				title: `Update Config for ${existing.metadata.name} (${existing.metadata.symbol})`,
				description: `Adjust key parameters: spread ${existing.config.spreadBps}bps -> ${newConfig.spreadBps}bps, cooldown ${existing.config.cooldownSeconds}s -> ${newConfig.cooldownSeconds}s, cap ${existing.config.holdingCap} -> ${newConfig.holdingCap}.`,
				parameters: {
					keyId,
					spreadBps: newConfig.spreadBps,
					cooldownSeconds: newConfig.cooldownSeconds,
					holdingCap: newConfig.holdingCap,
				},
				proposedAt: Date.now(),
				earliestExecutionTime: Date.now() + delayMs,
				proposer: creatorAddress,
			});

			return {
				success: true,
				requiresTimelock: true,
				timelockActionId: actionId,
				timelockDelayHours: delayHours,
			};
		}

		// Direct instant update (within safe change thresholds)
		await new Promise<void>(resolve => setTimeout(resolve, 300));
		existing.config = { ...newConfig };

		return {
			success: true,
			requiresTimelock: false,
			txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
		};
	}

	reset(): void {
		this.mockKeys = JSON.parse(JSON.stringify(INITIAL_MOCK_KEYS));
	}
}

export const creatorKeyService = new CreatorKeyService();
