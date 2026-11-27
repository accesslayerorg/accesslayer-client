import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { isDomainAllowed } from '@/utils/embedGenerator.utils';
import { ShieldAlert, TrendingUp, Users, Sparkles, ExternalLink } from 'lucide-react';
import type { EmbedTheme } from '@/types/embed.types';

export interface EmbedWidgetViewProps {
	creatorKeyId?: string;
	creatorName?: string;
	theme?: EmbedTheme;
	priceXlm?: number;
	holders?: number;
	change24hPercent?: number;
	allowedDomains?: string[];
	referrerDomain?: string;
}

export const EmbedWidgetView: React.FC<EmbedWidgetViewProps> = ({
	creatorKeyId: propKeyId,
	creatorName: propName,
	theme: propTheme,
	priceXlm = 14.5,
	holders = 128,
	change24hPercent = 8.4,
	allowedDomains: propAllowlist,
	referrerDomain,
}) => {
	const params = useParams<{ id: string }>();
	const [searchParams] = useSearchParams();

	const creatorKeyId = propKeyId ?? params.id ?? 'alice-key';
	const creatorName = propName ?? creatorKeyId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	const theme: EmbedTheme = propTheme ?? ((searchParams.get('theme') as EmbedTheme) || 'dark');
	const allowParam = searchParams.get('allow');

	const allowlist = useMemo(() => {
		if (propAllowlist) return propAllowlist;
		if (!allowParam) return [];
		return allowParam.split(',').map((s) => s.trim()).filter(Boolean);
	}, [propAllowlist, allowParam]);

	const currentOriginHost = useMemo(() => {
		if (referrerDomain !== undefined) return referrerDomain;
		if (typeof document !== 'undefined' && document.referrer) {
			try {
				return new URL(document.referrer).hostname;
			} catch {
				return '';
			}
		}
		return typeof window !== 'undefined' ? window.location.hostname : '';
	}, [referrerDomain]);

	const isAuthorized = useMemo(
		() => isDomainAllowed(currentOriginHost, allowlist),
		[currentOriginHost, allowlist]
	);

	const isDark = theme === 'dark';

	if (!isAuthorized) {
		return (
			<div
				className={`flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border p-4 text-center ${
					isDark
						? 'border-white/10 bg-[#0b1728] text-white/70'
						: 'border-slate-200 bg-slate-50 text-slate-600'
				}`}
				data-testid="embed-unauthorized-placeholder"
			>
				<ShieldAlert className="h-7 w-7 text-rose-400 mb-2" />
				<p className="text-xs font-semibold">Domain not authorized for this widget</p>
				<p className="text-[11px] opacity-60 mt-1">
					Host <span className="font-mono">{currentOriginHost || 'unknown'}</span> is not in the creator&apos;s allowlist.
				</p>
			</div>
		);
	}

	const isPositive = change24hPercent >= 0;

	return (
		<div
			className={`flex h-full min-h-[160px] flex-col justify-between rounded-xl border p-4 transition-colors ${
				isDark
					? 'border-white/10 bg-[#0b1728] text-white'
					: 'border-slate-200 bg-white text-slate-900 shadow-sm'
			}`}
			data-testid="embed-widget-view"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-amber-400 font-bold text-xs">
						<Sparkles className="h-3.5 w-3.5" />
					</div>
					<div>
						<h4 className="text-sm font-bold leading-tight">{creatorName}</h4>
						<span className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
							AccessLayer Key
						</span>
					</div>
				</div>

				<a
					href={`/keys/${encodeURIComponent(creatorKeyId)}`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-300"
				>
					Trade <ExternalLink className="h-3 w-3" />
				</a>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 border-current/10">
				<div>
					<span className={`text-[10px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
						Price
					</span>
					<span className="font-mono text-sm font-bold text-amber-400">
						{priceXlm.toFixed(2)} XLM
					</span>
				</div>
				<div>
					<span className={`text-[10px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
						24h Change
					</span>
					<span
						className={`font-mono text-sm font-bold flex items-center gap-0.5 ${
							isPositive ? 'text-emerald-400' : 'text-rose-400'
						}`}
					>
						<TrendingUp className="h-3 w-3" />
						{isPositive ? '+' : ''}
						{change24hPercent.toFixed(1)}%
					</span>
				</div>
				<div>
					<span className={`text-[10px] block ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
						Holders
					</span>
					<span className="font-mono text-sm font-bold flex items-center gap-1">
						<Users className="h-3 w-3 opacity-60" />
						{holders}
					</span>
				</div>
			</div>

			<div className={`mt-2 text-[10px] text-right ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
				Powered by AccessLayer
			</div>
		</div>
	);
};

export default EmbedWidgetView;
