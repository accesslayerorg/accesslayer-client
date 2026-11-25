import { useState } from 'react';
import EmptyState from '@/components/common/EmptyState';
import LaunchCard from '@/components/common/LaunchCard';
import LaunchCalendar from '@/components/common/LaunchCalendar';
import Skeleton from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLaunches } from '@/hooks/useLaunches';
import {
	LAUNCH_EMPTY_MESSAGES,
	LAUNCH_TABS,
	getLaunchTabLabel,
	type LaunchTab,
} from '@/utils/launch.utils';

export default function LaunchesPage() {
	useDocumentTitle('Launches — AccessLayer');
	const [tab, setTab] = useState<LaunchTab>('live');
	const { allLaunches, launches, nowMs, isLoading, isError, refetch } =
		useLaunches(tab);

	return (
		<main className="min-h-screen bg-slate-950 px-6 pt-12 pb-28 md:px-12 md:pb-16">
			<div className="mx-auto max-w-7xl space-y-10">
				<header>
					<h1 className="font-grotesque text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
						Launches
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						Track keys as they launch, follow upcoming windows and set a reminder
						before a launch opens.
					</p>
				</header>

				<Tabs
					value={tab}
					onValueChange={value => setTab(value as LaunchTab)}
					data-testid="launches-tabs"
				>
					<TabsList aria-label="Launch status" className="flex-wrap">
						{LAUNCH_TABS.map(value => (
							<TabsTrigger
								key={value}
								value={value}
								data-testid={`launch-tab-${value}`}
							>
								{getLaunchTabLabel(value)}
							</TabsTrigger>
						))}
					</TabsList>

					{LAUNCH_TABS.map(value => (
						<TabsContent
							key={value}
							value={value}
							data-testid={`launch-panel-${value}`}
						>
							{isLoading ? (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{Array.from({ length: 3 }, (_, index) => (
										<Skeleton
											key={index}
											className="h-56 w-full rounded-2xl"
										/>
									))}
								</div>
							) : isError ? (
								<EmptyState
									title="Couldn't load launches"
									description="We couldn't load launches right now. Check your connection and try again."
									cta={{ label: 'Try again', onClick: () => void refetch() }}
									className="mx-auto w-full max-w-xl"
								/>
							) : launches.length === 0 ? (
								<EmptyState
									title={`No ${getLaunchTabLabel(value).toLowerCase()} launches`}
									description={LAUNCH_EMPTY_MESSAGES[value]}
									className="mx-auto w-full max-w-xl"
								/>
							) : (
								<div
									data-testid={`launch-grid-${value}`}
									className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
								>
									{launches.map(launch => (
										<LaunchCard
											key={launch.id}
											launch={launch}
											nowMs={nowMs}
										/>
									))}
								</div>
							)}
						</TabsContent>
					))}
				</Tabs>

				<LaunchCalendar launches={allLaunches} />
			</div>
		</main>
	);
}
