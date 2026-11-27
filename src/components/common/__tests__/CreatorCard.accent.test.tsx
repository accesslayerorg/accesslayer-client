import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createCreatorAccentStyle, generatePalette } from '@/utils/accentPalette.utils';

describe('Creator accent scoping (#1488)', () => {
	it('generates scoped CSS variables for creator cards and pages without polluting root', () => {
		const creatorAccent = '#059669'; // Emerald
		const palette = generatePalette(creatorAccent);
		const scopedStyle = createCreatorAccentStyle(palette, 'light');

		expect(scopedStyle['--accent']).toBe('#059669');
		expect(scopedStyle['--color-accent']).toBe('#059669');
		expect(scopedStyle['--accent-text']).toBeDefined();
		expect(scopedStyle['--accent-foreground']).toBeDefined();

		render(
			<div data-testid="creator-card" style={scopedStyle as React.CSSProperties}>
				<span className="accent-element">Creator Key Content</span>
			</div>
		);

		const card = screen.getByTestId('creator-card');
		expect(card.style.getPropertyValue('--accent')).toBe('#059669');
		// Global document root style must not be polluted by creator card
		expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
	});
});
