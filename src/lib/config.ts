/**
 * Application Configuration
 * Centralized configuration using environment variables
 */

export const config = {
	// API URLs
	API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
	API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',

	// API Endpoints (relative paths)
	endpoints: {
		file: {
			download: '/file/download',
			stream: '/file/stream',
			image: '/file/image'
		}
	}
} as const;

/**
 * Build full URL for API endpoints
 */
export const buildApiUrl = (endpoint: string): string => {
	return `${config.API_URL}${endpoint}`;
};

/**
 * Build full URL for base endpoints
 */
export const buildBaseUrl = (endpoint: string): string => {
	return `${config.API_BASE_URL}${endpoint}`;
};
