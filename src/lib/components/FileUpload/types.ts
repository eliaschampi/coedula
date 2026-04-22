/**
 * FileUpload Component Types
 * Professional file upload with drag-drop, validation, and progress tracking
 */

export type FileUploadStatus = 'selected' | 'uploading' | 'success' | 'error';

export interface FileUploadFile {
	id: string;
	file: File;
	status: FileUploadStatus;
	progress: number;
	error?: string;
}

export interface FileUploadProps {
	/**
	 * Selected files (bindable)
	 */
	files?: FileUploadFile[];

	/**
	 * Placeholder text when no files selected
	 * @default "Upload your files"
	 */
	placeholderText?: string;

	/**
	 * Helper text shown below the placeholder title
	 * @default "Drag your files here or click to select"
	 */
	hintText?: string;

	/**
	 * Accepted file types (e.g., 'image/*', '.pdf')
	 * @default "*"
	 */
	accept?: string;

	/**
	 * Allow multiple file selection
	 * @default false
	 */
	multiple?: boolean;

	/**
	 * Maximum file size in bytes (0 = no limit)
	 * @default 0
	 */
	maxSize?: number;

	/**
	 * Disable the component
	 * @default false
	 */
	disabled?: boolean;

	/**
	 * Label for the "add more files" action
	 * @default "Add more files"
	 */
	addMoreText?: string;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * Custom validation hook. Return a message to reject the file.
	 */
	validateFile?: (file: File) => string | null;

	/**
	 * Called when a file is rejected by validation.
	 */
	oninvalid?: (message: string, file: File) => void;

	/**
	 * Custom max-size validation message builder.
	 */
	maxSizeErrorMessage?: (file: File, maxSize: number) => string;

	/**
	 * File change event handler
	 */
	onchange?: (files: FileUploadFile[]) => void;

	/**
	 * File remove event handler
	 */
	onremove?: (fileId: string) => void;
}
