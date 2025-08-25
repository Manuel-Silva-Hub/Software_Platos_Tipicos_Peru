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
