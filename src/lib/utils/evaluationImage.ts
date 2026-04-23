export const EVALUATION_PAPER_FORMATS = {
	A5_VERTICAL: { name: 'A5 Vertical', ratio: 1 / 1.414, tolerance: 0.05 },
	A5_HORIZONTAL: { name: 'A5 Horizontal', ratio: 1.414, tolerance: 0.05 }
} as const;

export function validateEvaluationImageProportion(
	width: number,
	height: number
): {
	isValid: boolean;
	format: string;
} {
	const imageRatio = width / height;
	const target = EVALUATION_PAPER_FORMATS.A5_VERTICAL;
	const isValid = Math.abs(imageRatio - target.ratio) <= target.tolerance;

	return {
		isValid,
		format: isValid ? target.name : 'Formato no A5'
	};
}

export function processEvaluationImageWithCanvas(
	image: HTMLImageElement,
	options: {
		rotation?: 0 | 90 | 180 | 270;
		flip?: {
			horizontal?: boolean;
			vertical?: boolean;
		};
		crop?: {
			x: number;
			y: number;
			width: number;
			height: number;
		};
		quality?: number;
	}
): string {
	const { naturalWidth: imageWidth, naturalHeight: imageHeight } = image;
	let sourceX = 0;
	let sourceY = 0;
	let sourceWidth = imageWidth;
	let sourceHeight = imageHeight;
	let canvasWidth = imageWidth;
	let canvasHeight = imageHeight;

	if (options.crop && options.crop.width > 0 && options.crop.height > 0) {
		sourceX = Math.max(0, Math.round(options.crop.x));
		sourceY = Math.max(0, Math.round(options.crop.y));
		sourceWidth = Math.max(1, Math.round(options.crop.width));
		sourceHeight = Math.max(1, Math.round(options.crop.height));

		if (sourceX + sourceWidth > imageWidth) {
			sourceWidth = imageWidth - sourceX;
		}

		if (sourceY + sourceHeight > imageHeight) {
			sourceHeight = imageHeight - sourceY;
		}

		canvasWidth = Math.max(1, sourceWidth);
		canvasHeight = Math.max(1, sourceHeight);
	}

	let finalWidth = canvasWidth;
	let finalHeight = canvasHeight;
	const applyRotation = options.rotation !== undefined && options.rotation !== 0;

	if (applyRotation && (options.rotation === 90 || options.rotation === 270)) {
		finalWidth = canvasHeight;
		finalHeight = canvasWidth;
	}

	const outputCanvas = document.createElement('canvas');
	const outputContext = outputCanvas.getContext('2d');

	if (!outputContext) {
		throw new Error('No se pudo obtener el contexto 2D del canvas');
	}

	outputCanvas.width = finalWidth;
	outputCanvas.height = finalHeight;

	outputContext.save();
	outputContext.translate(finalWidth / 2, finalHeight / 2);

	if (applyRotation) {
		outputContext.rotate((options.rotation! * Math.PI) / 180);
	}

	if (options.flip?.horizontal || options.flip?.vertical) {
		outputContext.scale(options.flip.horizontal ? -1 : 1, options.flip.vertical ? -1 : 1);
	}

	outputContext.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		-canvasWidth / 2,
		-canvasHeight / 2,
		canvasWidth,
		canvasHeight
	);

	outputContext.restore();

	return outputCanvas.toDataURL('image/jpeg', options.quality ?? 0.95);
}

export function base64ToEvaluationImageFile(base64Data: string, fileName: string): File {
	const [metadata, content] = base64Data.split(',');

	if (!metadata || !content) {
		throw new Error('La imagen procesada es inválida');
	}

	const mimeType = metadata.split(':')[1]?.split(';')[0] ?? 'image/jpeg';
	const byteString = atob(content);
	const bytes = new Uint8Array(byteString.length);

	for (let index = 0; index < byteString.length; index += 1) {
		bytes[index] = byteString.charCodeAt(index);
	}

	return new File([bytes], fileName, { type: mimeType });
}
