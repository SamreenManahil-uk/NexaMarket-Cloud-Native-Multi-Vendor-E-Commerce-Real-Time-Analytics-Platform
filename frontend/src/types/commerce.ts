export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  stock: number;
  sellerName: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: CartProduct;
  lineTotal: string;
}

export interface CartData {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
}

export interface CartResponse {
  data: CartData;
}

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  stock: number;
  sellerName: string;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: WishlistProduct;
}

export interface WishlistResponse {
  data: WishlistItem[];
}
