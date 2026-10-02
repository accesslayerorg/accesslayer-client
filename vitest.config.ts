import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		exclude: [...configDefaults.exclude, '**/.kilo/**'],
		pool: 'forks',
		maxWorkers: 1,
		minWorkers: 1,
		fileParallelism: false,
		exclude: ['**/.kilo/**', '**/.kiro/**', '**/node_modules/**', '**/dist/**'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
