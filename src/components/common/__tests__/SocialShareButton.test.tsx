import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SocialShareButton from '@/components/common/SocialShareButton';

describe('SocialShareButton (#1251)', () => {
	it('opens the share modal when clicked', () => {
		render(
			<SocialShareButton
				share={{
					context: 'key',
					keyName: 'Luna Starlight',
					priceXlm: '0.25',
					change24h: 1,
					url: 'https://accesslayer.app/creator/creator-1',
				}}
			/>
		);

		expect(screen.queryByTestId('social-share-modal')).not.toBeInTheDocument();
		fireEvent.click(screen.getByTestId('social-share-button'));
		expect(screen.getByTestId('social-share-modal')).toBeInTheDocument();
	});
});
