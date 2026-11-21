import type { RefObject } from 'react';

export function downloadQrPng(
	canvasRef: RefObject<HTMLCanvasElement | null>,
	filename: string
): void {
	const canvas = canvasRef.current;
	if (!canvas) return;

	const output = document.createElement('canvas');
	output.width = 1024;
	output.height = 1024;
	const context = output.getContext('2d');
	if (!context) return;

	context.drawImage(canvas, 0, 0, output.width, output.height);
	output.toBlob(blob => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename.replace(/[^a-z0-9_-]/gi, '_')}.png`;
		link.click();
		URL.revokeObjectURL(url);
	}, 'image/png');
}
