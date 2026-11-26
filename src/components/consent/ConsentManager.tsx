import { useEffect } from 'react';
import { useConsent } from '@/hooks/useConsent';
import { setErrorReportingEnabled } from '@/utils/errorReporting';
import ConsentBanner from './ConsentBanner';
import ConsentPreferences from './ConsentPreferences';

export default function ConsentManager() {
	const errorReportingEnabled = useConsent(
		state => state.preferences?.errorReporting ?? false
	);

	useEffect(() => {
		void setErrorReportingEnabled(errorReportingEnabled);
	}, [errorReportingEnabled]);

	return (
		<>
			<ConsentBanner />
			<ConsentPreferences />
		</>
	);
}
