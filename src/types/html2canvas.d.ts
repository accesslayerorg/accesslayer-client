declare module 'html2canvas' {
	export interface Html2CanvasOptions {
		scale?: number;
		backgroundColor?: string | null;
		useCORS?: boolean;
		logging?: boolean;
		[key: string]: unknown;
	}

	export interface HTMLCanvasElementWithDataUrl extends HTMLCanvasElement {
		toDataURL(type?: string, quality?: unknown): string;
		toBlob(
			callback: (blob: Blob | null) => void,
			type?: string,
			quality?: unknown
		): void;
	}

	export default function html2canvas(
		element: HTMLElement,
		options?: Html2CanvasOptions
	): Promise<HTMLCanvasElementWithDataUrl>;
}
