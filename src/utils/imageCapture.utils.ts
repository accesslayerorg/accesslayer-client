import html2canvas from 'html2canvas';

export interface ImageCaptureResult {
	dataUrl: string;
	blob: Blob;
}

/**
 * Renders an HTML element to a high-resolution PNG image entirely client-side.
 * No data is sent to any external server or API.
 */
export async function captureElementToPng(
	element: HTMLElement
): Promise<ImageCaptureResult> {
	const canvas = await html2canvas(element, {
		scale: 2,
		backgroundColor: null,
		useCORS: true,
		logging: false,
	});

	const dataUrl = canvas.toDataURL('image/png');

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(b => {
			if (b) {
				resolve(b);
			} else {
				// Fallback to dataURL conversion if toBlob produces null
				try {
					const byteString = atob(dataUrl.split(',')[1]);
					const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
					const ab = new ArrayBuffer(byteString.length);
					const ia = new Uint8Array(ab);
					for (let i = 0; i < byteString.length; i++) {
						ia[i] = byteString.charCodeAt(i);
					}
					resolve(new Blob([ab], { type: mimeString }));
				} catch (err) {
					reject(new Error('Failed to create image blob from canvas', { cause: err }));
				}
			}
		}, 'image/png');
	});

	return { dataUrl, blob };
}
