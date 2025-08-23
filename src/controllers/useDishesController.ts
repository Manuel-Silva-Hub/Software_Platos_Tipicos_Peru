// src/controllers/useDishesController.ts
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Dish } from '../models/dish';

export function useDishesController() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: err } = await supabase
          .from('dishes')
          .select(`
            id,
            name,
            description,
            photo_url,
            region_id,
            created_at,
            regions (id, name, lat, lng),
            ingredients (id, name, quantity)
          `);

        if (err) {
          console.error('Supabase error loading dishes:', err);
          if (mounted) setError(err.message ?? String(err));
          return;
        }

        const normalized: Dish[] = (data ?? []).map((d: any) => ({
          ...d,
          region: d.regions ?? null, // 👈 ya no lo tratamos como array
          regionName: d.regions?.name ?? '', // 👈 campo directo para filtrar en Home.tsx
          ingredients: d.ingredients ?? [],
        }));

        if (mounted) setDishes(normalized);
      } catch (e: any) {
        console.error('Unexpected error loading dishes:', e);
        if (mounted) setError(e.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { dishes, loading, error };
}
