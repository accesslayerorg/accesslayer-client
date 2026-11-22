import { BaseApiService, type APIResponse } from './api.service';
import type { RentalListing } from '@/types/keyRental';
import { normalizeRentalListing } from '@/utils/keyRental.utils';

/**
 * Response envelope for the rental endpoints (#1360). The backend indexes the
 * rental contract's `rental_listed`, `rental_started` and `rental_ended`
 * events into listings.
 */
export interface RentalListingsResponse {
	rentals: unknown[];
}

function normalizeAll(response: RentalListingsResponse | undefined) {
	const rentals = Array.isArray(response?.rentals) ? response.rentals : [];
	return rentals
		.map(normalizeRentalListing)
		.filter((listing): listing is RentalListing => listing !== null);
}

class KeyRentalService extends BaseApiService {
	/** Listings available to rent, from `GET /rentals`. */
	async getAvailableRentals(): Promise<RentalListing[]> {
		try {
			const response = await this.api.get<
				APIResponse<RentalListingsResponse>
			>('/rentals', {
				params: { status: 'listed' },
			});
			return normalizeAll(response.data.data).filter(
				listing => listing.status === 'listed'
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Every rental the wallet takes part in, as owner or renter, from
	 * `GET /users/:wallet/rentals`.
	 */
	async getWalletRentals(wallet: string): Promise<RentalListing[]> {
		try {
			const response = await this.api.get<
				APIResponse<RentalListingsResponse>
			>(`/users/${encodeURIComponent(wallet)}/rentals`);
			return normalizeAll(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyRentalService = new KeyRentalService();

export function fetchAvailableRentals(): Promise<RentalListing[]> {
	return keyRentalService.getAvailableRentals();
}

export function fetchWalletRentals(wallet: string): Promise<RentalListing[]> {
	return keyRentalService.getWalletRentals(wallet);
}
