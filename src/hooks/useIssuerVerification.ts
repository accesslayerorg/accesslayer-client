import { useQuery } from '@tanstack/react-query';
import { fetchIssuerVerification } from '@/services/issuerVerification.service';

export function useIssuerVerification(wallet: string, enabled = true) {
	return useQuery({
		queryKey: ['issuerVerification', wallet],
		queryFn: () => fetchIssuerVerification(wallet),
		enabled: enabled && !!wallet,
		retry: false,
		staleTime: 5 * 60_000,
	});
}
