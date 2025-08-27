// src/controllers/useDishesController.ts
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Dish } from '../models/dish';

// Custom hook that controls loading of dishes from Supabase
export function useDishesController() {
  const [dishes, setDishes] = useState<Dish[]>([]); // State that stores the dishes obtained from the database
  const [loading, setLoading] = useState<boolean>(true); // State to control if the request is still loading
  const [error, setError] = useState<string | null>(null); // State to handle possible errors during loading

  useEffect(() => {
    // Flag to avoid updating the state if the component has already been unmounted
    let mounted = true;

    // Asynchronous function that loads data from Supabase
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Query the "dishes" table in Supabase
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

        // Supabase error handling
        if (err) {
          console.error('Supabase error loading dishes:', err);
          if (mounted) setError(err.message ?? String(err));
          return;
        }

        // Normalization of the obtained data
        const normalized: Dish[] = (data ?? []).map((d: any) => ({
          ...d,
          region: d.regions ?? null,
          regionName: d.regions?.name ?? '',
          ingredients: d.ingredients ?? [],
        }));

        // We only update the state if the component is still mounted
        if (mounted) setDishes(normalized);
      } catch (e: any) {
        // Catch unexpected errors
        console.error('Unexpected error loading dishes:', e);
        if (mounted) setError(e.message ?? String(e));
      } finally {
        // We finish the loading state
        if (mounted) setLoading(false);
      }
    };

    // We execute the data loading when mounting the component
    load();
    return () => { mounted = false; };
  }, []);

  // We return the state and data controlled by this hook
  return { dishes, loading, error };
}
