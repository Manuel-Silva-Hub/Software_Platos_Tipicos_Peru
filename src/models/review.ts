// src/models/Review.ts
// Represents a review in the application

export interface Review {
  id: number;
  dish_id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}
