export interface Category { id: string; name: string; slug: string; description: string | null }
export interface Product {
  id: string; name: string; slug: string; description: string | null
  price: string; image_url: string | null
  category: Pick<Category, 'id' | 'name' | 'slug'>
  seller: { id: string; store_name: string }
  available_quantity: number
}
export interface Pagination { page: number; limit: number; totalItems: number; totalPages: number }
export interface DataResponse<T> { data: T }
export interface ProductList extends DataResponse<Product[]> { pagination: Pagination }
