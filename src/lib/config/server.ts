import { createDatabase, devDbConfig } from '$lib/database';

// Create single database instance for the application
export const dbInstance = createDatabase(devDbConfig);
