import Skeleton from '@/components/ui/skeleton';

/**
 * Loading placeholder for the platform status page (#1051).
 *
 * Mirrors the banner, 2×2 health grid, and incident rows so the first paint
 * and the loaded view occupy the same space — the grid refreshes every 60
 * seconds without shifting the layout.
 */
export default function StatusPageSkeleton() {
	return (
		<div
			data-testid="status-page-skeleton"
			role="status"
			aria-label="Loading platform status"
		>
			<span className="sr-only">Loading platform status</span>

			<div className="rounded-2xl border border-border bg-card px-6 py-6">
				<div className="flex items-center gap-4">
					<Skeleton className="size-12 shrink-0 rounded-full" />
					<div className="w-full max-w-xs space-y-2">
						<Skeleton className="h-5 w-56" />
						<Skeleton className="h-3 w-40" />
					</div>
				</div>
			</div>

			<div className="mt-10 grid gap-4 sm:grid-cols-2">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="w-full max-w-[12rem] space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-3 w-44" />
							</div>
							<Skeleton className="h-6 w-24 shrink-0 rounded-full" />
						</div>
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-full" />
					</div>
				))}
			</div>

			<div className="mt-12 space-y-4">
				{Array.from({ length: 2 }).map((_, index) => (
					<div
						key={index}
						className="rounded-2xl border border-border bg-card p-5"
					>
						<Skeleton className="h-4 w-64" />
						<Skeleton className="mt-4 h-6 w-full" />
						<Skeleton className="mt-4 h-12 w-full" />
					</div>
				))}
			</div>
		</div>
	);
}
