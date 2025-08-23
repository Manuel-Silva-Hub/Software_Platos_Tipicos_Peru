#!/bin/bash

cd src || exit

# Crear carpetas
mkdir -p models repositories controllers views/components views/pages services

# Archivo de modelo
cat > models/dish.ts <<'EOF'
export interface Dish {
  id: number;
  name: string;
  description: string | null;
  photo_url: string | null;
  region_id: number;
  created_at: string;
  region?: { name: string };
}
EOF

cat > models/region.ts <<'EOF'
export interface Region {
  id: number;
  name: string;
}
EOF

# Servicio supabase
cat > services/supabase.ts <<'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
EOF

# Repositorio
cat > repositories/dishRepository.ts <<'EOF'
import { supabase } from '@/services/supabase';
import type { Dish } from '@/models/dish';

export async function getAllDishes() {
  const { data, error } = await supabase
    .from('dishes')
    .select('id, name, description, photo_url, region_id, created_at, region:regions(name)')
    .order('name');
  if (error) throw error;
  return data as Dish[];
}
EOF

# Controlador
cat > controllers/useDishesController.ts <<'EOF'
import { useEffect, useState } from 'react';
import { getAllDishes } from '@/repositories/dishRepository';
import type { Dish } from '@/models/dish';

export function useDishesController() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await getAllDishes();
      setDishes(data);
    } catch (e: any) {
      setError(e.message ?? 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { dishes, loading, error };
}
EOF

# Componentes de vista
cat > views/components/DishCard.tsx <<'EOF'
import type { Dish } from '@/models/dish';

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <article style={{border: '1px solid #eee', padding: 12, marginBottom: 8, borderRadius: 8}}>
      {dish.photo_url && (
        <img src={dish.photo_url} alt={dish.name} width={200} style={{ borderRadius: 8 }} />
      )}
      <h3>{dish.name}</h3>
      <small>{dish.region?.name}</small>
      <p>{dish.description}</p>
    </article>
  );
}
EOF

# Página principal
cat > views/pages/Home.tsx <<'EOF'
import { useDishesController } from '@/controllers/useDishesController';
import { DishCard } from '@/views/components/DishCard';

export default function Home() {
  const { dishes, loading, error } = useDishesController();

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1>Platos típicos</h1>
      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {dishes.map(d => <DishCard key={d.id} dish={d} />)}
    </main>
  );
}
EOF

# App.tsx
cat > App.tsx <<'EOF'
import Home from '@/views/pages/Home';

export default function App() {
  return <Home />;
}
EOF

echo "✅ Estructura MVC creada con archivos iniciales."
