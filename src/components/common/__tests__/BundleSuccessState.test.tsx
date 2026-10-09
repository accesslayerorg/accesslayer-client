import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BundleSuccessState from '@/components/common/BundleSuccessState';

describe('BundleSuccessState (issue #981)', () => {
    it('lists every received key', () => {
        render(
            <BundleSuccessState
                result={{
                    txHash: '0xdeadbeef',
                    receivedKeys: [
                        { creatorId: '1', creatorName: 'Alex Rivers', quantity: 3 },
                        { creatorId: '2', creatorName: 'Sarah Chen', quantity: 4 },
                    ],
                }}
            />
        );

        expect(screen.getByRole('heading', { name: /bundle purchased/i })).toBeInTheDocument();
        expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
        expect(screen.getByText('+3')).toBeInTheDocument();
        expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
        expect(screen.getByText('+4')).toBeInTheDocument();
    });

    it('renders the transaction hash and a link to the explorer', () => {
        render(
            <BundleSuccessState
                result={{
                    txHash: '0xabc123',
                    receivedKeys: [],
                }}
            />
        );

        expect(screen.getByText('0xabc123')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /view/i });
        expect(link).toHaveAttribute(
            'href',
            'https://stellar.expert/explorer/public/tx/0xabc123'
        );
    });
});