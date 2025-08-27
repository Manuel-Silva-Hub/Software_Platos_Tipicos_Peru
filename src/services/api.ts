import { supabase } from "./supabase";

/**
This function retrieves the details of a specific dish from Supabase. It searches the `dishes` 
table by its `id` and includes basic dish information, its region (name only), and 
its ingredients (id, name, and quantity). It then returns the object with the dish data 
or `null` if an error occurs.
*/
export async function getDishDetails(dishId: number) {
  const { data, error } = await supabase
    .from("dishes")
    .select(`
      id,
      name,
      description,
      photo_url,
      regions ( name ),
      ingredients ( id, name, quantity )
    `)
    .eq("id", dishId)
    .single();

  if (error) {
    console.error("Error loading dish:", error);
    return null;
  }
  return data;
}

/**
This function toggles (adds or removes) a dish from a user's favorites. It also checks 
if the dish already exists in the `favorites` table for that user. If it exists, it deletes 
it and returns `{removed: true}`; if it doesn't exist, it inserts it and returns `{added: true}`.
*/
export async function toggleFavorite(userId: string, dishId: number) {
  const { data: existing } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("dish_id", dishId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    return { removed: true };
  } else {
    await supabase.from("favorites").insert([{ user_id: userId, dish_id: dishId }]);
    return { added: true };
  }
}
