import { AlertTriangle, Wrench } from 'lucide-react';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';

export default function StatusBanner() {
	const { status } = usePlatformStatus();
	const overall = status?.overall;

	if (!overall || overall === 'operational') return null;

	const isMaintenance = overall === 'maintenance';
	const message = isMaintenance
		? status?.maintenance?.message ?? 'Platform maintenance is currently active.'
		: overall === 'partial_outage'
			? 'Some platform services are experiencing an outage.'
			: 'Some platform services are degraded.';
	const Icon = isMaintenance ? Wrench : AlertTriangle;

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="platform-status-banner"
			className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100"
		>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			<span>{message}</span>
		</div>
	);
}
