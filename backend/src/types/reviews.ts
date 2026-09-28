export interface Review {
  id: string;
  productId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  averageRating: number | null;
  reviewCount: number;
}

export interface ProductReviews {
  reviews: Review[];
  summary: ReviewSummary;
}
