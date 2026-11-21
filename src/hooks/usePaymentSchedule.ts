import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchPaymentSchedule,
	type PaymentSchedule,
} from '@/services/paymentSchedule.service';

export function usePaymentSchedule(keyId: string) {
	return useQuery<PaymentSchedule>({
		queryKey: queryKeys.creators.paymentSchedule(keyId),
		queryFn: () => fetchPaymentSchedule(keyId),
		enabled: !!keyId,
		retry: false,
	});
}
