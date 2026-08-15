'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

export default function MisFavoritosPage() {
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      const savedFavorites = localStorage.getItem('e_aura_favorites');
      if (!savedFavorites) {
        setLoading(false);
        return;
      }

      const favoriteIds: number[] = JSON.parse(savedFavorites);
      if (favoriteIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, commentary, price, images')
        .in('id', favoriteIds);

      if (error) {
        console.error('Error cargando favoritos:', error);
      } else if (data) {
        const formatted = data.map((prod: any) => ({
          id: prod.id,
          name: prod.name,
          description: prod.commentary || '',
          price: prod.price,
          image_url: prod.images?.[0] || '/placeholder.png',
        }));
        setFavoriteProducts(formatted);
      }
      setLoading(false);
    }

    loadFavorites();
  }, []);

  const removeFavorite = (id: number) => {
    const updatedProducts = favoriteProducts.filter((p) => p.id !== id);
    setFavoriteProducts(updatedProducts);

    const updatedIds = updatedProducts.map((p) => p.id);
    localStorage.setItem('e_aura_favorites', JSON.stringify(updatedIds));
  };

  return (
    <main
      className="min-h-screen text-[#4a3b2c] relative font-[var(--font-montserrat)] bg-cover bg-center bg-fixed p-6"
      style={{ backgroundImage: "url('/bg-texture.png')" }}
    >
      <div className="max-w-4xl mx-auto bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/80 shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b border-[#7a5c29]/20 pb-4">
          <h1 className="font-[var(--font-cinzel)] font-bold text-xl text-[#3d2b1f]">
            ♥ Mis Piezas Favoritas
          </h1>
          <Link
            href="/"
            className="text-xs px-4 py-2 rounded-full bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] transition-all"
          >
            ← Volver al Catálogo
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-xs py-8 text-gray-500">Cargando tus piezas guardadas...</p>
        ) : favoriteProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-600 mb-4">Aún no has agregado ninguna pieza a tus "Me Gusta".</p>
            <Link
              href="/"
              className="inline-block text-xs px-5 py-2.5 rounded-full bg-[#c9b596] text-[#2d1f15] font-bold"
            >
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white/80 p-4 rounded-xl border border-gray-200 flex gap-4 items-center justify-between"
              >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                  <Image src={prod.image_url} alt={prod.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-[var(--font-cinzel)] font-bold text-sm text-[#3d2b1f]">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-gray-600">${prod.price.toFixed(2)} MXN</p>
                </div>
                <button
                  onClick={() => removeFavorite(prod.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 p-2 font-bold"
                  title="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}