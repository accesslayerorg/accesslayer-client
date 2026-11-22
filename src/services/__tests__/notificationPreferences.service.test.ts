import { Address } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import {
	NotificationPreferencesService,
	type NotificationPreferences,
	type NotificationPreferencesClientFactory,
	type NotificationPreferencesContractClient,
} from '@/services/notificationPreferences.service';
import type { Signer } from '@/lib/signing/types';

const wallet = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const preferences: NotificationPreferences = {
	settlement: true,
	kyc_expiry: false,
	watchlist_change: true,
	auto_invest: false,
	maturity_approaching: true,
};

function createService() {
	const transaction = {
		signAndSend: vi.fn().mockResolvedValue({
			sendTransactionResponse: { hash: 'transaction-hash' },
			getTransactionResponse: { status: 'SUCCESS' },
		}),
	};
	const client: NotificationPreferencesContractClient = {
		get_alert_preferences: vi.fn().mockResolvedValue({ result: preferences }),
		set_alert_preferences: vi.fn().mockResolvedValue(transaction),
	};
	const clientFactory: NotificationPreferencesClientFactory = vi
		.fn()
		.mockResolvedValue(client);

	return {
		service: new NotificationPreferencesService(clientFactory),
		client,
		clientFactory,
		transaction,
	};
}

describe('NotificationPreferencesService', () => {
	it('reads alert preferences for the connected Stellar wallet', async () => {
		const { service, client } = createService();

		await expect(service.getPreferences(wallet)).resolves.toEqual(
			preferences
		);
		expect(client.get_alert_preferences).toHaveBeenCalledWith({
			user: Address.fromString(wallet),
		});
	});

	it('sends every toggle and waits for on-chain confirmation', async () => {
		const { service, client, clientFactory, transaction } = createService();
		const signer: Signer = {
			type: 'software',
			sign: vi.fn(),
			getPublicKey: vi.fn(),
		};

		await expect(
			service.updatePreferences(wallet, preferences, signer)
		).resolves.toBeUndefined();
		expect(clientFactory).toHaveBeenCalledWith(wallet, signer);
		expect(client.set_alert_preferences).toHaveBeenCalledWith({
			user: Address.fromString(wallet),
			...preferences,
		});
		expect(transaction.signAndSend).toHaveBeenCalledOnce();
	});
});
