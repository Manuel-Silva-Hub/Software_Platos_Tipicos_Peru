import { supabase } from "./supabase";

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
