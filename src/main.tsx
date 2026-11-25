import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.tsx';
import Web3Provider from './providers/Web3Provider.tsx';
import { ThemeProvider } from './providers/ThemeProvider.tsx';
import { PendingTransactionProvider } from './contexts/PendingTransactionContext';
import { registerUnhandledRejectionLogger } from './utils/unhandledRejectionLogger';
import { queryClient } from './providers/web3Utils';
import {
	restorePersistedQueries,
	subscribeToQueryCache,
} from './lib/queryPersistence';
import './lib/i18n';

registerUnhandledRejectionLogger();

// Restore IndexedDB-persisted queries before the first render so the UI
// has stale data available immediately (#754).
void restorePersistedQueries(queryClient);

// Persist every subsequent cache update to IndexedDB.
subscribeToQueryCache(queryClient);

// Register the background-sync + push service worker.
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js').catch(() => {
		// SW registration is best-effort; a failure must not block the app.
	});
}

createRoot(document.getElementById('root')!).render(
	<HelmetProvider>
		<StrictMode>
			<Web3Provider>
				<ThemeProvider>
					<PendingTransactionProvider>
						<App />
					</PendingTransactionProvider>
				</ThemeProvider>
			</Web3Provider>
		</StrictMode>
	</HelmetProvider>
);
	navigator.serviceWorker
		.register('/service-worker.js')
		.then((registration) => {
			// Forward messages emitted by the push service worker (e.g. a
			// notification click that needs in-app routing) to the app.
			navigator.serviceWorker.addEventListener('message', (event) => {
				const data = event.data;
				if (!data || typeof data !== 'object') return;
				if (data.type === 'PUSH_NOTIFICATION_CLICK') {
					window.dispatchEvent(
						new CustomEvent('push:notification-click', {
							detail: data.payload ?? {},
						}),
					);
				}
			});

			// Best-effort: ask the push subscription hook to clean up the
			// backend subscription when the user signs out. The hook listens
			// for this event and performs the unsubscribe + backend removal.
			window.addEventListener('auth:signed-out', () => {
				window.dispatchEvent(new CustomEvent('push:cleanup'));
			});

			// Keep the registration reference available for debugging.
			void registration;
		})
		.catch(() => {
			// SW registration is best-effort; a failure must not block the app.
		});
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Web3Provider>
			<ThemeProvider>
				<PendingTransactionProvider>
					<App />
				</PendingTransactionProvider>
			</ThemeProvider>
		</Web3Provider>
	</StrictMode>
);
