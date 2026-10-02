import React from 'react';

export interface PriceImpactOverrideCheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
}

/** Requires explicit acknowledgement before a high-impact trade can proceed. */
const PriceImpactOverrideCheckbox: React.FC<
	PriceImpactOverrideCheckboxProps
> = ({ checked, onChange }) => (
	<label className="flex cursor-pointer items-start gap-2 text-xs text-white/80">
		<input
			type="checkbox"
			checked={checked}
			onChange={event => onChange(event.target.checked)}
			className="mt-0.5 accent-amber-400"
			data-testid="price-impact-override-checkbox"
		/>
		<span>
			I understand this trade&apos;s estimated price impact exceeds my
			slippage tolerance and want to proceed.
		</span>
	</label>
);

export default PriceImpactOverrideCheckbox;
