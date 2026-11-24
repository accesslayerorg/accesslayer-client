import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { oracleService } from '@/services/oracle.service';
import type { PaymentAsset } from '@/types/paymentAsset.types';

export const ALLOWLISTED_PAYMENT_ASSETS: PaymentAsset[] = [
	{
		code: 'XLM',
		name: 'Stellar Lumens (Native)',
		decimals: 7,
		rateAgainstXlm: 1.0,
		balance: 250.0,
	},
	{
		code: 'USDC',
		name: 'USD Coin',
		decimals: 6,
		rateAgainstXlm: 0.125, // 1 XLM = 0.125 USDC
		balance: 100.0,
		issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
	},
	{
		code: 'EURC',
		name: 'Euro Coin',
		decimals: 6,
		rateAgainstXlm: 0.115, // 1 XLM = 0.115 EURC
		balance: 5.0, // Low balance to demonstrate shortfall
		issuer: 'GDZCEWJ5TVXUTFH6V5CVDZDDE4P74IIFDETOXAC6VU7THCGMAFARFGWA',
	},
	{
		code: 'WETH',
		name: 'Wrapped Ether',
		decimals: 18,
		rateAgainstXlm: 0.000045, // 1 XLM = 0.000045 WETH
		balance: 0.25,
	},
];

export function usePaymentAssets(initialAssetCode: string = 'XLM') {
	const [selectedCode, setSelectedCode] = useState<string>(initialAssetCode);

	const { data: oracleStatuses = {}, isLoading } = useQuery({
		queryKey: ['oracle', 'allPaymentAssets'],
		queryFn: async () => {
			const map: Record<string, any> = {};
			for (const asset of ALLOWLISTED_PAYMENT_ASSETS) {
				const status = await oracleService.getOracleStatus(asset.code);
				map[asset.code] = status;
			}
			return map;
		},
		staleTime: 30_000,
	});

	const assets = useMemo(() => {
		return ALLOWLISTED_PAYMENT_ASSETS.map(asset => {
			const status = oracleStatuses[asset.code];
			return {
				...asset,
				oracleStatus: status,
			};
		});
	}, [oracleStatuses]);

	const selectedAsset = useMemo(() => {
		return assets.find(a => a.code === selectedCode) || assets[0];
	}, [assets, selectedCode]);

	return {
		assets,
		selectedAsset,
		selectAsset: setSelectedCode,
		isLoading,
	};
}
