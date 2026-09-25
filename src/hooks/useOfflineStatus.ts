import { useEffect, useState } from 'react';

export function useOfflineStatus(): boolean {
	const [isOffline, setIsOffline] = useState(!navigator.onLine);

	useEffect(() => {
		const onOnline = () => setIsOffline(false);
		const onOffline = () => setIsOffline(true);

		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);

		return () => {
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
		};
	}, []);

	return isOffline;
}
