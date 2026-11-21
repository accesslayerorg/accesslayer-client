import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		pool: 'threads',
		maxWorkers: 1,
		minWorkers: 1,
		fileParallelism: false,
		exclude: [
			...configDefaults.exclude,
			'**/.kilo/**',
			'**/.kiro/**',
			'**/node_modules/**',
			'**/dist/**',
		],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
