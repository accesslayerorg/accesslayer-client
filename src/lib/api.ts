// Compatibility re-export: hooks import the shared axios client from `@/lib/api`,
// while the implementation lives with the other API plumbing in services.
export { api, apiClient } from '@/services/api.service';
