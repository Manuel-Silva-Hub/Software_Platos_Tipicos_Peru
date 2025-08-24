// src/models/dish.ts
// Represents a dish (plato) in the application.

import type { Region } from './region';
import type { Ingredient } from './ingredient';

export interface Dish {
  id: number;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  region_id?: number | null;
  regions?: Region[];           // when fetched as a relation (select regions(...))
  region?: Region | null;       // or when you bring the region as an alias "region:regions(...)"
  ingredients?: Ingredient[];
  ingredients_text?: string | null;
  difficulty?: string | null;
  prep_time?: number | null;
  created_at?: string | null;
}
