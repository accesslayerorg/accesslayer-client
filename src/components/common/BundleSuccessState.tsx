import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { BuyMarketplaceBundleResult } from '@/types/bundles';
import { cn } from '@/lib/utils';

export interface BundleSuccessStateProps {
    result: BuyMarketplaceBundleResult;
    className?: string;
}

/**
 * Post-purchase success panel (issue #981).
 *
 * Lists every key received and shows the transaction hash. Kept dumb so
 * it's easy to test in isolation — the parent owns the post-buy navigation.
 */
const BundleSuccessState: React.FC<BundleSuccessStateProps> = ({ result, className }) => {
    return (
        <section
            className={cn(
                'flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6',
                className
            )}
            aria-labelledby="bundle-success-heading"
        >
            <header className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <h2
                    id="bundle-success-heading"
                    className="text-lg font-semibold text-emerald-900"
                >
                    Bundle purchased
                </h2>
            </header>

            <ul className="flex flex-col gap-1 text-sm text-emerald-900">
                {result.receivedKeys.map(key => (
                    <li key={key.creatorId} className="flex items-center justify-between">
                        <span>{key.creatorName}</span>
                        <span className="text-emerald-700">+{key.quantity}</span>
                    </li>
                ))}
            </ul>

            <div className="flex items-center gap-2 border-t border-emerald-200 pt-3 text-xs text-emerald-900">
                <span className="font-medium">Transaction</span>
                <code className="truncate font-mono">{result.txHash}</code>
                <a
                    href={`https://stellar.expert/explorer/public/tx/${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 underline-offset-4 hover:underline"
                >
                    View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
            </div>
        </section>
    );
};

export default BundleSuccessState;