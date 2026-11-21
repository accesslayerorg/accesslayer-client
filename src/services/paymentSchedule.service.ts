import { BaseApiService, type APIResponse } from './api.service';

export type PaymentInstalmentStatus = 'paid' | 'pending' | 'overdue';

/** One scheduled instalment on a payment schedule. */
export interface PaymentInstalment {
	/** 1-based instalment number. */
	number: number;
	/** ISO due date for the instalment. */
	dueDate: string;
	/** Instalment amount, in XLM. */
	amount: number;
	status: PaymentInstalmentStatus;
}

/** Instalment-based repayment schedule for a key/invoice. */
export interface PaymentSchedule {
	instalments: PaymentInstalment[];
	/** Cumulative repaid amount, in XLM. */
	paidAmount: number;
	/** Total scheduled amount, in XLM. */
	totalAmount: number;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
	return typeof value === 'object' && value !== null
		? (value as UnknownRecord)
		: {};
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDueDate(value: unknown): string {
	if (typeof value === 'string' && value.trim() !== '') return value;
	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Date(
			value < 1_000_000_000_000 ? value * 1_000 : value
		).toISOString();
	}
	return new Date().toISOString();
}

function normalizeStatus(value: unknown, dueDate: string): PaymentInstalmentStatus {
	const status = String(value ?? '').trim().toLowerCase();
	if (status === 'paid' || status === 'complete' || status === 'completed') {
		return 'paid';
	}
	if (status === 'overdue' || status === 'late') return 'overdue';
	if (status === 'pending' || status === 'scheduled' || status === 'due') {
		return 'pending';
	}
	// Derive from the due date when the API omits a status.
	return new Date(dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
}

export function normalizePaymentInstalment(
	value: unknown,
	index: number
): PaymentInstalment {
	const raw = asRecord(value);
	const dueDate = normalizeDueDate(raw.dueDate ?? raw.due_date ?? raw.dueAt);
	return {
		number: Math.max(1, Math.floor(asNumber(raw.number ?? raw.instalmentNumber ?? index + 1))),
		dueDate,
		amount: asNumber(raw.amount ?? raw.value ?? raw.total),
		status: normalizeStatus(raw.status ?? raw.state, dueDate),
	};
}

export function normalizePaymentSchedule(value: unknown): PaymentSchedule {
	const raw = asRecord(value);
	const data =
		raw.instalments ?? raw.schedule ?? raw.payments ?? raw.data ?? value;
	const rows = Array.isArray(data) ? data : [];

	const instalments = rows
		.map((row, index) => normalizePaymentInstalment(row, index))
		.sort((a, b) => a.number - b.number);

	const totalAmount =
		asNumber(raw.totalAmount ?? raw.total_amount) ||
		instalments.reduce((sum, item) => sum + item.amount, 0);
	const paidAmount =
		asNumber(raw.paidAmount ?? raw.paid_amount) ||
		instalments
			.filter(item => item.status === 'paid')
			.reduce((sum, item) => sum + item.amount, 0);

	return { instalments, paidAmount, totalAmount };
}

class PaymentScheduleService extends BaseApiService {
	async getPaymentSchedule(keyId: string): Promise<PaymentSchedule> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${encodeURIComponent(keyId)}/payment-schedule`
			);
			return normalizePaymentSchedule(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const paymentScheduleService = new PaymentScheduleService();

export function fetchPaymentSchedule(keyId: string): Promise<PaymentSchedule> {
	return paymentScheduleService.getPaymentSchedule(keyId);
}
