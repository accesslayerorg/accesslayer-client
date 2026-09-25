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
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
