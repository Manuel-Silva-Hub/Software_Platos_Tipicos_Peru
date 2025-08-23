// src/models/ingredient.ts
// Represents an ingredient of a dish.

export interface Ingredient {
  id: number;
  dish_id?: number | null;
  name: string;
  quantity?: string | null;
}
