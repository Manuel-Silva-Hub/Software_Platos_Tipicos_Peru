import type { Dish } from '../../models/dish';

//Component that displays information about a dish.

/*
This component renders:
- An image of the dish (if one exists).
- The name of the dish.
- The associated region (if one exists, the first one is chosen).
- The description.
*/

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <article style={{border: '1px solid #eee', padding: 12, marginBottom: 8, borderRadius: 8}}>
      {dish.photo_url && (
        <img src={dish.photo_url} alt={dish.name} width={200} style={{ borderRadius: 8 }} />
      )}
      <h3>{dish.name}</h3>
      <small>{dish.region?.[0]?.name}</small>
      <p>{dish.description}</p>
    </article>
  );
}
