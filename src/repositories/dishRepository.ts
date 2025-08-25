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
  // Supabase suele devolver la relación como ARRAY aunque sea 1-a-1.
  region?: Region[] | Region | null;
};

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

//Get reviews - Versión que funciona como antes
export async function getDishReviews(dishId: number) {
  try {
    // Método 1: Intentar con JOIN a auth.users (como funcionaba antes)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id, 
        dish_id, 
        user_id, 
        rating, 
        comment, 
        created_at,
        user:auth.users(id, email)
      `)
      .eq('dish_id', dishId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error with JOIN query:', error);
      // Si falla el JOIN, usar método alternativo
      return await getDishReviewsFallback(dishId);
    }

    if (!data) return [];

    // Mapear los datos como funcionaba antes
    const mapped: Review[] = data.map((r: any) => ({
      id: r.id as number,
      dish_id: r.dish_id as number,
      user_id: r.user_id as string,
      rating: r.rating as number,
      comment: r.comment as string,
      created_at: r.created_at as string,
      user: r.user ? { 
        id: r.user.id as string, 
        email: r.user.email as string 
      } : undefined
    }));

    return mapped;
  } catch (err) {
    console.error('Error fetching reviews:', err);
    // Fallback si hay cualquier error
    return await getDishReviewsFallback(dishId);
  }
}

// Método fallback (por si el JOIN no funciona)
async function getDishReviewsFallback(dishId: number) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, dish_id, user_id, rating, comment, created_at')
    .eq('dish_id', dishId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data) return [];

  // Para cada review, intentar obtener el email del usuario
  const reviewsWithUsers = await Promise.all(
    data.map(async (r: any) => {
      // Intentar obtener datos del usuario actual para verificar si es el mismo
      const { data: userData } = await supabase.auth.getUser();
      
      let userEmail = undefined;
      
      // Si el review es del usuario actual, usar su email
      if (userData?.user && userData.user.id === r.user_id) {
        userEmail = userData.user.email;
      }

      return {
        id: r.id as number,
        dish_id: r.dish_id as number,
        user_id: r.user_id as string,
        rating: r.rating as number,
        comment: r.comment as string,
        created_at: r.created_at as string,
        user: userEmail ? { 
          id: r.user_id as string, 
          email: userEmail as string 
        } : undefined
      };
    })
  );

  return reviewsWithUsers;
}

//Set review
export async function addDishReview(dishId: number, rating: number, comment: string) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('reviews')
    .insert([{ dish_id: dishId, user_id: user.id, rating, comment }]);
  
  if (error) throw error;
  return true;
}
