import React, { useState } from 'react';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadCsv, buildExportFilename } from '@/utils/portfolioExport.utils';

export type ExportType = 'trade-history' | 'holdings-snapshot' | 'distributions';

export interface PortfolioExportButtonProps {
	/** Wallet address for filename. */
	walletAddress: string;
	/** Type of export to generate. */
	exportType: ExportType;
	/** Resolved date range for filtering (trade history & distributions). */
	dateRange: {
		preset: string;
		from?: number;
		to?: number;
	} | null;
	/** Custom fetcher for the data to export. */
	fetchData: () => Promise<unknown[]>;
	/** Transform function to convert fetched data to CSV. */
	generateCsv: (data: unknown[]) => string;
	/** Optional custom label. */
	label?: string;
	/** Optional custom class name. */
	className?: string;
	/** Optional custom test ID. */
	'data-testid'?: string;
}

/**
 * Generic export button for portfolio data.
 * Shows loading spinner during fetch/format, checkmark on success, error on failure.
 */
export const PortfolioExportButton: React.FC<PortfolioExportButtonProps> = ({
	walletAddress,
	exportType,
	dateRange,
	fetchData,
	generateCsv,
	label,
	className,
	'data-testid': testId,
}) => {
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const typeLabels: Record<ExportType, string> = {
		'trade-history': 'Trade History',
		'holdings-snapshot': 'Holdings Snapshot',
		distributions: 'Distributions',
	};

	const handleExport = async () => {
		if (status === 'loading') return;
		setStatus('loading');
		setErrorMessage(null);

		try {
			const data = await fetchData();
			const csv = generateCsv(data);
			const filename = buildExportFilename(walletAddress, exportType, dateRange);
			downloadCsv(filename, csv);
			setStatus('success');
			setTimeout(() => setStatus('idle'), 2000);
		} catch (error) {
			console.error(`Failed to export ${typeLabels[exportType]}:`, error);
			setStatus('error');
			setErrorMessage(error instanceof Error ? error.message : 'Export failed');
			setTimeout(() => setStatus('idle'), 3000);
		}
	};

	const isDisabled = status === 'loading';

	return (
		<Button
			type="button"
			variant="outline"
			onClick={handleExport}
			disabled={isDisabled}
			data-testid={testId}
			aria-busy={status === 'loading'}
			className={cn(
				'gap-2 rounded-xl border-white/10 bg-white/[0.04] text-sm font-semibold text-white hover:bg-white/[0.08] hover:text-white',
				className
			)}
			title={errorMessage ?? undefined}
		>
			{status === 'loading' && (
				<Loader2 className="size-4 animate-spin" data-testid="export-spinner" aria-hidden="true" />
			)}
			{status === 'success' && (
				<Check className="size-4 text-emerald-400" data-testid="export-success" aria-hidden="true" />
			)}
			{status === 'error' && (
				<AlertCircle className="size-4 text-rose-400" data-testid="export-error" aria-hidden="true" />
			)}
			{status === 'idle' && <Download className="size-4" aria-hidden="true" />}
			{label ?? `Export ${typeLabels[exportType]}`}
		</Button>
	);
};

export default PortfolioExportButton;