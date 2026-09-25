import { cn } from '@/lib/utils';

interface PriceSparklineProps {
	dataPoints: number[];
	width?: number;
	height?: number;
	className?: string;
}

const POSITIVE_COLOR = '#34d399';
const NEGATIVE_COLOR = '#ef4444';
const NEUTRAL_COLOR = 'currentColor';

export function PriceSparkline({
	dataPoints,
	width = 120,
	height = 40,
	className,
}: PriceSparklineProps) {
	if (dataPoints.length === 0) return null;

	const getLineColor = () => {
		if (dataPoints.length < 2) return NEUTRAL_COLOR;
		const last = dataPoints[dataPoints.length - 1];
		const first = dataPoints[0];
		if (last > first) return POSITIVE_COLOR;
		if (last < first) return NEGATIVE_COLOR;
		return NEUTRAL_COLOR;
	};

	const lineColor = getLineColor();

	const padding = 2;
	const innerWidth = width - padding * 2;
	const innerHeight = height - padding * 2;

	if (dataPoints.length === 1) {
		return (
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				className={cn('overflow-visible', className)}
				role="img"
				aria-label="Price sparkline"
			>
				<circle
					cx={width / 2}
					cy={height / 2}
					r={2}
					fill={lineColor}
				/>
			</svg>
		);
	}

	const min = Math.min(...dataPoints);
	const max = Math.max(...dataPoints);
	const range = max - min || 1;

	const buildPathD = () =>
		dataPoints
			.map((value, index) => {
				const x = padding + (index / (dataPoints.length - 1)) * innerWidth;
				const y =
					padding + (1 - (value - min) / range) * innerHeight;
				return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(' ');

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className={cn('overflow-visible', className)}
			role="img"
			aria-label="Price sparkline"
		>
			<path
				d={buildPathD()}
				fill="none"
				stroke={lineColor}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
