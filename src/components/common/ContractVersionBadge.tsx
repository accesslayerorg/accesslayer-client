import { useContractVersion } from '@/hooks/useContractVersion';

const CHANGELOG_URL = 'https://github.com/contracts/CHANGELOG.md';

/**
 * Small footer badge showing the currently active protocol contract
 * version and linking to the changelog.
 */
export default function ContractVersionBadge() {
	const { currentVersion } = useContractVersion();

	if (!currentVersion) return null;

	return (
		<a
			href={CHANGELOG_URL}
			target="_blank"
			rel="noopener noreferrer"
			data-testid="contract-version-badge"
			className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
			aria-label={`Contract version ${currentVersion}, open changelog`}
		>
			<span aria-hidden="true">Contract</span>
			<span className="font-mono">v{currentVersion}</span>
		</a>
	);
}
