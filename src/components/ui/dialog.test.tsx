import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dialog, DialogContent } from './dialog';

describe('DialogContent', () => {
	it('adds mobile safe-area bottom inset padding and restores desktop spacing', () => {
		render(
			<Dialog open>
				<DialogContent>Dialog body</DialogContent>
			</Dialog>
		);

		const content = screen.getByRole('dialog');
		expect(content.className).toContain(
			'pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
		);
		expect(content.className).toContain('sm:pb-6');
	});
});