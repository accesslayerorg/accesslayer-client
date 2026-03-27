import { cn } from '@/lib/utils';

type SectionDividerSpacing = 'compact' | 'default' | 'relaxed';

interface SectionDividerProps {
  title?: string;
  spacing?: SectionDividerSpacing;
  className?: string;
}

const spacingClasses: Record<SectionDividerSpacing, string> = {
  compact: 'marketplace-section-compact',
  default: 'marketplace-section',
  relaxed: 'marketplace-section-relaxed',
};

function SectionDivider({ title, spacing = 'default', className }: SectionDividerProps) {
  return (
    <div className={cn('flex items-center gap-3 md:gap-4', spacingClasses[spacing], className)}>
      <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
      {title ? (
        <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/55 md:text-xs">
          {title}
        </span>
      ) : null}
      <div className="h-px flex-1 bg-white/10" aria-hidden="true" />
    </div>
  );
}

export default SectionDivider;
