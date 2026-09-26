import React from 'react';
import BondingCurveChart from '@/components/common/BondingCurveChart';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import {
	buildCurvePreviewPoints,
	getDraftInitialPriceXlm,
	type KeyFactoryDraft,
} from '@/utils/keyFactory.utils';

export interface KeyFactoryCurvePreviewProps {
	/** Current wizard draft; the preview is derived from it. */
	draft: KeyFactoryDraft;
	/** Whether the draft's curve config is valid. */
	isValid?: boolean;
	className?: string;
}

/**
 * Bonding-curve preview for the key factory wizard (#959).
 *
 * Renders the curve the entered configuration would produce, plus the initial
 * key price, so a creator can sanity-check the shape of their curve before
 * deploying. The preview updates live on every keystroke — the sampling is
 * pure and cheap.
 */
export const KeyFactoryCurvePreview: React.FC<KeyFactoryCurvePreviewProps> = ({
	draft,
	isValid = true,
	className,
}) => {
	const points = buildCurvePreviewPoints(draft);
	const initialPriceXlm = getDraftInitialPriceXlm(draft);
	const finalPriceXlm = points[points.length - 1]?.priceXLM ?? 0;

	return (
		<div
			className={className}
			data-testid="key-factory-curve-preview"
			data-curve-valid={isValid ? 'true' : 'false'}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<h3 className="font-grotesque text-lg font-bold text-white">
					Curve preview
				</h3>
				<p className="text-sm text-white/60">
					Initial price{' '}
					<span
						className="font-mono font-semibold text-white"
						data-testid="key-factory-initial-price"
					>
						{formatXlmPrice(initialPriceXlm)}
					</span>
				</p>
			</div>

			{!isValid && (
				<p
					role="status"
					className="mt-2 text-xs text-amber-300"
					data-testid="key-factory-curve-preview-invalid"
				>
					Enter a valid base price, growth factor and max supply to
					preview your curve.
				</p>
			)}

			<div className="mt-4">
				<BondingCurveChart data={points} height={240} />
			</div>

			<p
				className="mt-2 text-xs text-white/50"
				data-testid="key-factory-curve-endpoint"
			>
				Price at max supply: {formatXlmPrice(finalPriceXlm)}
			</p>
		</div>
	);
};

export default KeyFactoryCurvePreview;
