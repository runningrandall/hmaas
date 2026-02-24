// Re-export from new API module for backward compatibility
export { API_URL, apiGet, apiPost, apiPut, apiDelete, customersApi } from './api/index';
export type { Customer, Account, PaginatedResult } from './api/index';
