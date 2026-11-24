import React from 'react';
import type { FunnelStage } from '@/types/ambassador.types';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface AmbassadorFunnelChartProps {
	funnel: FunnelStage[];
}

export const AmbassadorFunnelChart: React.FC<AmbassadorFunnelChartProps> = ({ funnel }) => {
	const maxCount = Math.max(1, ...funnel.map((s) => s.count));

	return (
		<div className="space-y-3" data-testid="ambassador-funnel-chart">
			{funnel.map((item, idx) => {
				const widthPercent = Math.max(8, Math.round((item.count / maxCount) * 100));
				return (
					<div key={item.stage} className="space-y-1" data-testid={`funnel-stage-${idx}`}>
						<div className="flex items-center justify-between text-xs">
							<span className="font-semibold text-white/80">{item.stage}</span>
							<div className="flex items-center gap-2 font-mono">
								<span className="font-bold text-white">{formatNumber(item.count)}</span>
								{idx > 0 && (
									<span className="text-[11px] text-amber-300/80">
										({item.conversionPercent}% conv)
									</span>
								)}
							</div>
						</div>
						<div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
							<div
								className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
								style={{ width: `${item.count === 0 ? 0 : widthPercent}%` }}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default AmbassadorFunnelChart;
