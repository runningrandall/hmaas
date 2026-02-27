// Re-export from new API module for backward compatibility
export { API_URL, apiGet, apiPost, apiPut, apiDelete, customersApi, getReport } from './api/index';
export type { Customer, Account, PaginatedResult, Report } from './api/index';
