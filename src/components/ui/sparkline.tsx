interface SparklineProps {
	data: number[];
	width?: number;
	height?: number;
	color?: string;
}

export function Sparkline({
	data,
	width = 320,
	height = 80,
	color = '#fbbf24',
}: SparklineProps) {
	if (!data || data.length < 2) return null;

	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;

	const points = data
		.map((value, index) => {
			const x = (index / (data.length - 1)) * width;
			const y = height - ((value - min) / range) * height;
			return `${x},${y}`;
		})
		.join(' ');

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			className="block h-10 w-full"
			aria-hidden="true"
		>
			<polyline fill="none" stroke={color} strokeWidth="2" points={points} />
		</svg>
	);
}