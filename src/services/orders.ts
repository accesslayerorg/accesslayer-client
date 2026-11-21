import { BaseApiService, type APIResponse } from './api.service';

export type LimitOrderSide = 'buy' | 'sell';
export type LimitOrderExpiry = '1h' | '24h' | '7d';

export interface LimitOrder {
	id: string;
	creatorId: string;
	walletAddress: string;
	side: LimitOrderSide;
	targetPrice: number;
	quantity: number;
	expiresAt: string;
	status?: 'open' | 'cancelled' | 'filled' | 'expired';
}

export interface CreateLimitOrderInput {
	creatorId: string;
	walletAddress: string;
	side: LimitOrderSide;
	targetPrice: number;
	quantity: number;
	expiresIn: LimitOrderExpiry;
}

class OrdersService extends BaseApiService {
	async createLimitOrder(input: CreateLimitOrderInput): Promise<LimitOrder> {
		try {
			const response = await this.api.post<APIResponse<LimitOrder>>(
				'/orders',
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async cancelLimitOrder(orderId: string): Promise<void> {
		try {
			await this.api.delete(`/orders/${encodeURIComponent(orderId)}`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async listOpenOrders(
		creatorId: string,
		walletAddress: string
	): Promise<LimitOrder[]> {
		try {
			const response = await this.api.get<APIResponse<LimitOrder[]>>(
				'/orders',
				{
					params: { creatorId, walletAddress, status: 'open' },
				}
			);
			return Array.isArray(response.data.data) ? response.data.data : [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const ordersService = new OrdersService();

export const createLimitOrder = (input: CreateLimitOrderInput) =>
	ordersService.createLimitOrder(input);
export const cancelLimitOrder = (orderId: string) =>
	ordersService.cancelLimitOrder(orderId);
export const listOpenOrders = (creatorId: string, walletAddress: string) =>
	ordersService.listOpenOrders(creatorId, walletAddress);
