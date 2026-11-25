import { format } from 'date-fns';
import type { Course } from '@/services/course.service';
import { formatDropTimeRemaining } from '@/utils/dropCountdown.utils';
import { LAUNCH_WINDOW_MS } from '@/utils/launchPenalty.utils';

export const LAUNCH_TABS = ['live', 'upcoming', 'recent'] as const;

export type LaunchTab = (typeof LAUNCH_TABS)[number];

export interface Launch {
	id: string;
	keyId: string;
	title: string;
	creator: string;
	creatorId: string;
	startMs: number;
	phase: 'upcoming' | 'live' | 'recent';
	hasAuction: boolean;
	commitReveal: boolean;
}

const LAUNCH_TAB_LABELS: Record<LaunchTab, string> = {
	live: 'Live now',
	upcoming: 'Upcoming',
	recent: 'Recently launched',
};

export const LAUNCH_EMPTY_MESSAGES: Record<LaunchTab, string> = {
	live: 'No keys are live right now. Check the upcoming tab for scheduled launches.',
	upcoming: 'No launches are scheduled yet. Check back soon for new windows.',
	recent: 'No keys have launched recently. Newly launched keys will appear here.',
};

export function getLaunchTabLabel(tab: LaunchTab): string {
	return LAUNCH_TAB_LABELS[tab];
}

function toMs(value: string | number | null | undefined): number | null {
	if (value == null || value === '') return null;
	const ms = typeof value === 'number' ? value : new Date(value).getTime();
	return Number.isFinite(ms) ? ms : null;
}

export function getLaunchStartMs(
	course: Course,
	nowMs: number = Date.now()
): number | null {
	const candidates = [
		course.publicLaunchDate,
		course.auctionEndsAt,
		course.nextDropAt,
		course.createdAt,
		course.joinedAt,
	]
		.map(value => toMs(value))
		.filter((value): value is number => value != null);

	if (candidates.length === 0) return null;
	const upcoming = candidates.filter(value => value > nowMs);
	if (upcoming.length > 0) return Math.min(...upcoming);
	return Math.max(...candidates);
}

export function toLaunch(
	course: Course,
	nowMs: number = Date.now()
): Launch | null {
	const startMs = getLaunchStartMs(course, nowMs);
	if (startMs == null) return null;

	const hasAuction =
		Boolean(course.auctionEndsAt) ||
		(course.auctionPrice ?? 0) > 0 ||
		(course.auctionSupply ?? 0) > 0;
	const phase: Launch['phase'] =
		startMs > nowMs
			? 'upcoming'
			: nowMs - startMs <= LAUNCH_WINDOW_MS
				? 'live'
				: 'recent';

	return {
		id: course.id,
		keyId: course.id,
		title: course.name || course.title || 'Unnamed key',
		creator: course.instructorId || course.name || course.title || 'Unknown creator',
		creatorId: course.instructorId,
		startMs,
		phase,
		hasAuction,
		commitReveal: hasAuction && course.auctionSettled !== true,
	};
}

export function toLaunches(courses: Course[], nowMs: number = Date.now()): Launch[] {
	const launches: Launch[] = [];
	for (const course of courses) {
		const launch = toLaunch(course, nowMs);
		if (launch) launches.push(launch);
	}
	return launches;
}

export function filterLaunches(
	launches: Launch[],
	tab: LaunchTab,
	nowMs: number = Date.now()
): Launch[] {
	return launches
		.filter(launch => {
			if (tab === 'upcoming') return launch.startMs > nowMs;
			if (tab === 'live') {
				return (
					launch.startMs <= nowMs && nowMs - launch.startMs <= LAUNCH_WINDOW_MS
				);
			}
			return (
				launch.startMs <= nowMs && nowMs - launch.startMs > LAUNCH_WINDOW_MS
			);
		})
		.sort((a, b) =>
			tab === 'upcoming'
				? a.startMs - b.startMs || a.title.localeCompare(b.title)
				: b.startMs - a.startMs || a.title.localeCompare(b.title)
		);
}

export interface LaunchCountdownState {
	remainingMs: number;
	label: string | null;
	isLive: boolean;
}

export function getLaunchCountdownState(
	startMs: number,
	nowMs: number = Date.now()
): LaunchCountdownState {
	const remainingMs = Math.max(0, startMs - nowMs);
	return {
		remainingMs,
		label: remainingMs > 0 ? formatDropTimeRemaining(remainingMs) : null,
		isLive: remainingMs <= 0,
	};
}

export function formatLaunchDate(startMs: number): string {
	return format(new Date(startMs), 'MMM d, yyyy · h:mm a');
}

export interface LaunchCalendarDay {
	date: Date;
	inMonth: boolean;
	launches: Launch[];
}

function sameDay(a: Date, b: Date): boolean {
	return a.toDateString() === b.toDateString();
}

export function getCalendarMonthDays(
	month: Date,
	launches: Launch[]
): LaunchCalendarDay[] {
	const first = new Date(month.getFullYear(), month.getMonth(), 1);
	const startOffset = first.getDay();
	const start = new Date(first);
	start.setDate(start.getDate() - startOffset);
	const days: LaunchCalendarDay[] = [];

	for (let index = 0; index < 42; index += 1) {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		days.push({
			date,
			inMonth: date.getMonth() === month.getMonth(),
			launches: launches.filter(launch =>
				sameDay(date, new Date(launch.startMs))
			),
		});
	}

	return days;
}
