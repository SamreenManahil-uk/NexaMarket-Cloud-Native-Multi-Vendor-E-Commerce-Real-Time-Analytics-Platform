import type { Category, Product, ProductList, DataResponse } from '../types/catalogue'
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
export class ApiError extends Error {
  status: number
  constructor(status: number) { super(status === 404 ? 'This product is unavailable or no longer listed.' : status === 400 ? 'The requested catalogue address is invalid.' : 'The catalogue service is unavailable. Please try again.'); this.status = status }
}
async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response
  try { response = await fetch(`${base}${path}`, { signal, headers: { Accept: 'application/json' } }) }
  catch (error) { if (signal.aborted) throw error; throw new Error('We could not connect to the catalogue. Please check your connection and try again.') }
  if (!response.ok) throw new ApiError(response.status)
  try { return await response.json() as T } catch { throw new Error('The catalogue returned an unreadable response. Please try again.') }
}
export const api = {
  categories: (signal: AbortSignal) => get<DataResponse<Category[]>>('/api/categories', signal),
  products: (page: number, limit: number, category: string, search: string, signal: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (category) query.set('category', category)
    if (search) query.set('search', search)
    return get<ProductList>(`/api/products?${query}`, signal)
  },
  product: (id: string, signal: AbortSignal) => get<DataResponse<Product>>(`/api/products/${encodeURIComponent(id)}`, signal),
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
