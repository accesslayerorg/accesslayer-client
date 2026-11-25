/**
 * Static metadata for the services tracked on the public platform status
 * page (#1051).
 *
 * The backend status endpoint is the source of truth for current health,
 * uptime history, and incidents. This catalog only carries product naming
 * and copy so the page can label a service consistently when the status
 * payload does not name it — for example the affected-service chips on an
 * incident, or the grid rendered while the status feed is unreachable.
 */

export interface MonitoredServiceDescriptor {
	/** Stable identifier shared with the backend status payload. */
	id: string;
	/** Display name shown in the health grid and incident log. */
	name: string;
	/** One-line description of what the service powers. */
	description: string;
}

export const MONITORED_SERVICES: readonly MonitoredServiceDescriptor[] = [
	{
		id: 'contract-rpc',
		name: 'Contract RPC',
		description:
			'Soroban RPC endpoint serving creator key reads and trade submissions.',
	},
	{
		id: 'indexer',
		name: 'Indexer',
		description:
			'Indexes ledger events into marketplace listings, holders, and history.',
	},
	{
		id: 'api',
		name: 'API',
		description:
			'Backend REST API for creator metadata, auth, and notifications.',
	},
	{
		id: 'ipfs',
		name: 'IPFS',
		description: 'Pinned content gateway for creator assets and perk material.',
	},
];

/** Looks up the catalog entry for a service id, if it is monitored. */
export function findMonitoredService(
	id: string
): MonitoredServiceDescriptor | undefined {
	return MONITORED_SERVICES.find(service => service.id === id);
}

/**
 * Normalized platform health used by the status banner (#1403).
 *
 * `operational` means everything is healthy and no banner is shown.
 * `degraded` covers lagging or partially impaired services, `partial-outage`
 * means one or more services are down, and `maintenance` means trading is
 * intentionally paused.
 */
export type PlatformStatusLevel =
	| 'operational'
	| 'degraded'
	| 'partial-outage'
	| 'maintenance';

/** Banner variants rendered by `StatusBanner`; `none` hides the banner. */
export type StatusBannerVariant =
	| 'none'
	| 'degraded'
	| 'partial-outage'
	| 'maintenance';

export interface StatusBannerDescriptor {
	variant: StatusBannerVariant;
	/** Short headline shown in the banner. */
	label: string;
	/** Supporting copy explaining the impact. */
	description: string;
	/** Tailwind classes for the banner container. */
	containerClassName: string;
	/** Tailwind classes for the headline text. */
	labelClassName: string;
	/** Whether trade actions must be disabled while this banner is shown. */
	disablesTrading: boolean;
}

/** Copy shown when the indexer is lagging behind the chain. */
export const INDEXER_LAG_NOTE =
	'The indexer is catching up, so balances and prices may be delayed.';

/** Explanation shown when trading is disabled during maintenance. */
export const MAINTENANCE_TRADE_DISABLED_MESSAGE =
	'Trading is paused while we perform scheduled maintenance. Your funds are safe and no action is required.';

/** Path of the public platform status page. */
export const STATUS_PAGE_PATH = '/status';

/** Absolute link to the public platform status page. */
export const STATUS_PAGE_URL = STATUS_PAGE_PATH;

/** Label for the link to the status page. */
export const STATUS_PAGE_LINK_LABEL = 'View status page';

const STATUS_BANNER_DESCRIPTORS: Record<
	Exclude<StatusBannerVariant, 'none'>,
	StatusBannerDescriptor
> = {
	degraded: {
		variant: 'degraded',
		label: 'Degraded service',
		description:
			'Some services are running slower than usual. Data may be slightly out of date.',
		containerClassName:
			'border-amber-500/40 bg-amber-500/10 text-amber-100',
		labelClassName: 'text-amber-200',
		disablesTrading: false,
	},
	'partial-outage': {
		variant: 'partial-outage',
		label: 'Partial outage',
		description:
			'Some services are unavailable. Balances, prices, and history may be incomplete.',
		containerClassName: 'border-red-500/40 bg-red-500/10 text-red-100',
		labelClassName: 'text-red-200',
		disablesTrading: false,
	},
	maintenance: {
		variant: 'maintenance',
		label: 'Scheduled maintenance',
		description: MAINTENANCE_TRADE_DISABLED_MESSAGE,
		containerClassName:
			'border-sky-500/40 bg-sky-500/10 text-sky-100',
		labelClassName: 'text-sky-200',
		disablesTrading: true,
	},
};

const NO_BANNER_DESCRIPTOR: StatusBannerDescriptor = {
	variant: 'none',
	label: '',
	description: '',
	containerClassName: '',
	labelClassName: '',
	disablesTrading: false,
};

/**
 * Maps a normalized platform status level to the banner descriptor that
 * should be rendered. Operational status yields the hidden `none` variant.
 */
export function getStatusBannerDescriptor(
	level: PlatformStatusLevel
): StatusBannerDescriptor {
	if (level === 'operational') {
		return NO_BANNER_DESCRIPTOR;
	}
	return STATUS_BANNER_DESCRIPTORS[level];
}

/** Returns true when the given level should render a banner. */
export function shouldShowStatusBanner(level: PlatformStatusLevel): boolean {
	return getStatusBannerDescriptor(level).variant !== 'none';
}

/** Returns true when trading must be disabled for the given level. */
export function isTradingDisabled(level: PlatformStatusLevel): boolean {
	return getStatusBannerDescriptor(level).disablesTrading;
}
