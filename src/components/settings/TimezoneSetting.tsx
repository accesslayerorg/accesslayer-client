import React, { useState, useMemo } from 'react';
import { useTimezone, getAllTimezones, getBrowserTimezone } from '@/hooks/useTimezone';
import {
	formatDateTime,
	getZoneAbbreviation,
	formatUtcTooltip,
} from '@/utils/time';
import { Globe, Clock, Check, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

export interface TimezoneSettingProps {
	className?: string;
}

export const TimezoneSetting: React.FC<TimezoneSettingProps> = ({ className }) => {
	const { timezone, isAuto, effectiveTimezone, setTimezone, setAutoDetect } =
		useTimezone();

	const [searchQuery, setSearchQuery] = useState('');
	const allZones = useMemo(() => getAllTimezones(), []);

	const filteredZones = useMemo(() => {
		if (!searchQuery.trim()) return allZones.slice(0, 40);
		const q = searchQuery.toLowerCase().trim();
		return allZones.filter(z => z.toLowerCase().includes(q)).slice(0, 40);
	}, [allZones, searchQuery]);

	const now = new Date();
	const currentTimeStr = formatDateTime(now, {
		includeZone: true,
		timeStyle: 'medium',
	});
	const zoneAbbr = getZoneAbbreviation(now, effectiveTimezone);
	const utcTooltip = formatUtcTooltip(now);

	return (
		<section
			aria-labelledby="timezone-settings-title"
			data-testid="timezone-setting-section"
			className={cn(
				'rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md',
				className
			)}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Globe className="size-5 text-amber-400" aria-hidden="true" />
						<h2
							id="timezone-settings-title"
							className="font-jakarta text-lg font-bold text-white"
						>
							Timezone & Date Display
						</h2>
					</div>
					<p className="text-xs text-white/60">
						Set your preferred timezone for trading activity, scheduled drops, and history.
					</p>
				</div>

				{/* Live time preview with UTC tooltip on hover */}
				<Tooltip content={utcTooltip}>
					<div
						tabIndex={0}
						role="note"
						aria-label={`Current time in ${effectiveTimezone}: ${currentTimeStr}. UTC time: ${utcTooltip}`}
						data-testid="timezone-preview-pill"
						className="flex cursor-help items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-2 text-xs font-mono text-amber-300"
					>
						<Clock className="size-3.5" aria-hidden="true" />
						<span>{currentTimeStr}</span>
						<span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[0.65rem] font-bold">
							{zoneAbbr}
						</span>
					</div>
				</Tooltip>
			</div>

			{/* Quick Actions: Auto-detect & UTC */}
			<div className="mt-5 flex flex-wrap items-center gap-2.5">
				<button
					type="button"
					onClick={() => setAutoDetect()}
					data-testid="timezone-autodetect-button"
					className={cn(
						'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
						isAuto
							? 'border-amber-400/60 bg-amber-400/20 text-amber-200'
							: 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
					)}
				>
					<Sparkles className="size-3.5" />
					Auto-detect (System: {getBrowserTimezone()})
				</button>

				<button
					type="button"
					onClick={() => setTimezone('UTC')}
					data-testid="timezone-utc-button"
					className={cn(
						'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
						!isAuto && timezone === 'UTC'
							? 'border-amber-400/60 bg-amber-400/20 text-amber-200'
							: 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
					)}
				>
					UTC
				</button>
			</div>

			{/* Searchable Zone List */}
			<div className="mt-4 space-y-2">
				<div className="relative">
					<Search className="absolute left-3 top-2.5 size-4 text-white/40" />
					<input
						type="text"
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder="Search timezones (e.g., London, New York, Tokyo)..."
						data-testid="timezone-search-input"
						className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
					/>
				</div>

				<div
					data-testid="timezone-options-list"
					className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-1.5 divide-y divide-white/5"
				>
					{filteredZones.map(zone => {
						const isSelected = !isAuto && timezone === zone;
						return (
							<button
								key={zone}
								type="button"
								onClick={() => setTimezone(zone)}
								data-testid={`timezone-option-${zone}`}
								className={cn(
									'flex w-full items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors',
									isSelected
										? 'bg-amber-400/20 text-amber-200 font-semibold'
										: 'text-white/80 hover:bg-white/10 hover:text-white'
								)}
							>
								<span>{zone}</span>
								{isSelected && (
									<Check className="size-3.5 text-amber-400" aria-hidden="true" />
								)}
							</button>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export default TimezoneSetting;
