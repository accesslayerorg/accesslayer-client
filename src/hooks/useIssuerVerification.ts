import { useContext } from 'react';
import { useQuery, QueryClientContext, QueryClient } from '@tanstack/react-query';
import { fetchIssuerVerification } from '@/services/issuerVerification.service';

const fallbackQueryClient = new QueryClient();

export function useIssuerVerification(wallet: string, enabled = true) {
	const clientInContext = useContext(QueryClientContext);
	const client = clientInContext ?? fallbackQueryClient;

	return useQuery(
		{
			queryKey: ['issuerVerification', wallet],
			queryFn: () => fetchIssuerVerification(wallet),
			enabled: enabled && !!wallet && !!clientInContext,
			retry: false,
			staleTime: 5 * 60_000,
		},
		client
	);
}
