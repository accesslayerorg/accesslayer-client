import { getHealthBand } from '@/utils/vaultHealth.utils';

export interface HealthFactorGaugeProps {
  healthFactor: number;
  liquidationPrice?: number;
}

export default function HealthFactorGauge({ healthFactor, liquidationPrice }: HealthFactorGaugeProps) {
  const band = getHealthBand(healthFactor);
  const marker = Math.max(0, Math.min(100, ((healthFactor - 0.5) / 2.5) * 100));
  const label = band === 'safe' ? 'Safe' : band === 'caution' ? 'Caution' : 'Danger';
  const color = band === 'safe' ? 'text-emerald-600' : band === 'caution' ? 'text-amber-600' : 'text-red-600';

  return (
    <section aria-label="Vault health" className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Health factor</p>
          <p className={`text-3xl font-bold ${color}`} data-testid="health-factor">{healthFactor.toFixed(2)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${band === 'danger' ? 'bg-red-100 text-red-700' : band === 'caution' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`} data-testid="health-band">{label}</span>
      </div>
      <div className="relative mt-5 h-3 overflow-hidden rounded-full" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 w-[20%] bg-red-400" />
        <div className="absolute inset-y-0 left-[20%] w-[32%] bg-amber-400" />
        <div className="absolute inset-y-0 left-[52%] right-0 bg-emerald-400" />
        <span className="absolute top-1/2 size-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900 shadow" style={{ left: `${marker}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>0.5 danger</span><span>1.0 caution</span><span>1.3 safe</span><span>3.0+</span></div>
      {(liquidationPrice ?? 0) > 0 && <p className="mt-4 text-sm text-muted-foreground">Liquidation price: <strong className="text-foreground">{liquidationPrice?.toFixed(4)} XLM</strong></p>}
    </section>
  );
}
