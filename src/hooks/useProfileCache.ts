import { useEffect } from 'react';
import { cacheManager } from '@/utils/cache.utils';

export const useProfileCache = () => {
	useEffect(() => {
		const handleFocus = () => {
			cacheManager.invalidateAll();
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, []);

	const invalidateProfileCache = () => {
		cacheManager.invalidateAll();
	};

	return { invalidateProfileCache };
};
