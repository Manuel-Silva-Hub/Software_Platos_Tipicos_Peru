import { supabase } from '../services/supabase';
import type { Dish } from '../models/dish';
import type { Region } from '../models/region';
import type { Review } from '../models/review';

type Row = {
  id: number;
  name: string;
  description?: string | null;
  photo_url?: string | null;
  region_id?: number | null;
  created_at?: string | null;
  region?: Region[] | Region | null;
};

/**
This function retrieves all dishes from Supabase. It also retrieves basic information 
about the dish and its associated region. It also normalizes the data so that `region` 
is a single object and `regions` is a compatibility array.
*/
export async function getAllDishes(): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select(`
      id,
      name,
      description,
      photo_url,
      region_id,
      created_at,
      region:regions (
        id,
        name,
        description,
        lat,
        lng,
        photo_url
      )
    `)
    .order('name');

  if (error) throw error;

  const rows = (data ?? []) as Row[];

  // Normalizamos: .region como objeto y también .regions para compatibilidad
  return rows.map((r) => {
    const regionArray = Array.isArray(r.region)
      ? r.region
      : r.region
      ? [r.region]
      : [];

    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      photo_url: r.photo_url ?? null,
      region_id: r.region_id ?? null,
      created_at: r.created_at ?? null,
      region: regionArray[0] ?? null,
      regions: regionArray.length ? regionArray : undefined,
    } as Dish;
  });
}

/**
This function retrieves all reviews for a specific dish. It also searches the `reviews` 
table by `dish_id`. It also returns an array of reviews sorted by creation date (most recent first). 
Each review includes user information (ID, email, name).
*/
export async function getDishReviews(dishId: number) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('dish_id', dishId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map with the data already stored in the table
    const mapped: Review[] = data.map((r: any) => ({
      id: r.id,
      dish_id: r.dish_id,
      user_id: r.user_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      user: {
        id: r.user_id,
        email: r.user_email || 'Usuario',
        name: r.user_name || r.user_email?.split('@')[0] || 'Usuario'
      }
    }));

    return mapped;
  } catch (err) {
    console.error('Error fetching reviews:', err);
    return [];
  }
}

/**
This function adds a new review to a dish. It also verifies that the user is authenticated 
in Supabase. It also inserts a new row into the `reviews` table with the user's data and their 
comment. Finally, it returns `true` if the insertion was successful.
*/
export async function addDishReview(dishId: number, rating: number, comment: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('reviews')
    .insert([{ 
      dish_id: dishId, 
      user_id: user.id, 
      rating, 
      comment,
      user_email: user.email,
      user_name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                'Usuario'
    }]);
  
  if (error) throw error;
  return true;
}