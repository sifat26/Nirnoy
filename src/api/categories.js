import { api } from './client';

/** Active exam categories (for Home tabs, onboarding, and dropdowns). */
export const listCategories = () => api.get('/categories');
