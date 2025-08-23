import { useEffect, useState } from 'react';
import { getAllDishes } from '../repositories/dishRepository';
import type { Dish } from '../models/dish';

/**
This useDishesController() method or Custom hook is used to manage the loading of dishes from the API.
It handles:
 - Retrieving dishes using `getAllDishes`.
 - Controlling the loading status (`loading`).
 - Handling errors (`error`).
 * */
export function useDishesController() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true); // Activate the charging state
      const data = await getAllDishes(); // Call the getAllDishes() function (which queries the API or repository)
      setDishes(data); // Updates the status with the received data
    } catch (e: any) {
      setError(e.message ?? 'Error cargando datos'); // If an error occurs, save the message
    } finally {
      setLoading(false); //Finally, turn off the charging state
    }
  }
  
 //This executes the loading only once when mounting the component, 
 // ensuring that the plates are automatically obtained at startup.
  useEffect(() => {
    load();
  }, []);

  return { dishes, loading, error };
}
