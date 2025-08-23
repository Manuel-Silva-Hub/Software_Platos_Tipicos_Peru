import { supabase } from '../services/supabase';
import type { Dish } from '../models/dish';

/**
 * Gets all dishes from the database in Supabase.
 * */

//{Promise<Dish[]>} List of dishes in the form of an array of Dish objects.
//{Error} If an error occurs in the query to Supabase.
export async function getAllDishes() {
  const { data, error } = await supabase
    .from('dishes') // access the dishes table
    .select('id, name, description, photo_url, region_id, created_at, region:regions(name)') //defines the columns to be retrieved
    .order('name'); //sorts the results by the name field
  if (error) throw error; //If an error occurs, it is thrown for handling by the caller of the function.
  return data as Dish[]; //ensures that the response is treated as an array of Dish objects
}
