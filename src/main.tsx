import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import Web3Provider from './providers/Web3Provider.tsx';
import { registerUnhandledRejectionLogger } from './utils/unhandledRejectionLogger';
import { queryClient } from './providers/web3Utils';
import {
	restorePersistedQueries,
	subscribeToQueryCache,
} from './lib/queryPersistence';

registerUnhandledRejectionLogger();

// Restore IndexedDB-persisted queries before the first render so the UI
// has stale data available immediately (#754).
void restorePersistedQueries(queryClient);

// Persist every subsequent cache update to IndexedDB.
subscribeToQueryCache(queryClient);

// Register the background-sync service worker.
if ('serviceWorker' in navigator) {
	navigator.serviceWorker
		.register('/service-worker.js')
		.catch(() => {
			// SW registration is best-effort; a failure must not block the app.
		});
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Web3Provider>
			<App />
		</Web3Provider>
	</StrictMode>
);
