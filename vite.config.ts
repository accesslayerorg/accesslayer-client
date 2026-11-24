import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: [
				'icons/logo.svg',
				'accesslayer-client.png',
				'images/hero-bg.avif',
				'images/noise.png',
			],
			manifest: false,
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,avif,woff2}'],
				runtimeCaching: [
					{
						urlPattern: ({ url, request }) => {
							if (request.method !== 'GET') return false;
							const pathname = url.pathname;
							// Exclude authenticated and personal responses from shared caches
							if (
								pathname.includes('/auth') ||
								pathname.includes('/user') ||
								pathname.includes('/wallet') ||
								pathname.includes('/personal') ||
								pathname.includes('/account') ||
								pathname.includes('/session') ||
								pathname.includes('/orders') ||
								pathname.includes('/portfolio') ||
								pathname.includes('/notifications')
							) {
								return false;
							}
							return pathname.startsWith('/api/');
						},
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'public-api-cache',
							cacheableResponse: {
								statuses: [0, 200],
							},
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 24 * 60 * 60,
							},
						},
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		proxy: {
			'/api': {
				target: 'https://agt-rho.vercel.app/',
				changeOrigin: true,
				secure: false,
			},
		},
	},
});
