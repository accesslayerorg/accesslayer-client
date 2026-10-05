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
