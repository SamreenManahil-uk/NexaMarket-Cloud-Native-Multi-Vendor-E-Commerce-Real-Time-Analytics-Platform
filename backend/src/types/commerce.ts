export interface CommerceProduct {
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
  product: CommerceProduct;
  lineTotal: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: CommerceProduct;
}
