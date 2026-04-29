import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface StickyFilterBarProps {
	eyebrow?: string;
	title: string;
	description?: string;
	resultCount?: number;
	children: ReactNode;
	className?: string;
	onReset?: () => void;
	showReset?: boolean;
}

const StickyFilterBar: React.FC<StickyFilterBarProps> = ({
	eyebrow = 'Filters',
	title,
	description,
	resultCount,
	children,
	className,
	onReset,
	showReset,
}) => {
	return (
		<div className={cn('sticky top-4 z-20 mb-10 md:top-6', className)}>
			<div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/78 px-4 py-4 text-white shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-5 md:py-4">
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_48%,rgba(245,158,11,0.08))]" />

				<div className="relative flex flex-col gap-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<p className="text-[0.68rem] font-bold uppercase tracking-[0.28em] text-amber-300/85">
								{eyebrow}
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
								<h2 className="font-grotesque text-xl font-bold tracking-tight text-white md:text-2xl">
									{title}
								</h2>
								{typeof resultCount === 'number' && (
									<span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/75">
										{resultCount}{' '}
										{resultCount === 1 ? 'result' : 'results'}
									</span>
								)}
								{showReset && onReset && (
									<Button
										variant="outline"
										size="sm"
										onClick={onReset}
										className="h-8 rounded-full border-amber-500/20 bg-amber-500/5 px-4 text-[0.68rem] font-bold uppercase tracking-wider text-amber-400 transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)] md:h-7 md:px-3"
									>
										<X className="mr-2 size-3 md:mr-1.5" />
										Reset Filters
									</Button>
								)}
							</div>
							{description && (
								<p className="mt-2 hidden max-w-2xl text-sm text-white/62 md:block">
									{description}
								</p>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="w-full md:max-w-2xl">{children}</div>
						<span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-white/45 md:inline-flex">
							Filters stay pinned while you browse
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StickyFilterBar;
