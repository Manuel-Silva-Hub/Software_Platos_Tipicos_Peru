import { supabase } from '../services/supabase';
import type { Dish } from '../models/dish';
import type { Region } from '../models/region';

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
