'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  wax_type: string;
  aroma: string;
  dimensions: string;
  image_url: string;
  images?: string[];
}

// Componente para el Carrusel individual de cada producto
function ProductImageCarousel({
  mainImage,
  images,
  productName,
}: {
  mainImage: string;
  images?: string[] | null;
  productName: string;
}) {
  // Verificación segura: si images es null, undefined o está vacío, usa mainImage
  const imageList = images && images.length > 0 ? images : [mainImage];
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="h-64 overflow-hidden rounded-xl mb-3 border border-white/80 bg-stone-100/20 relative shadow-inner group">
      <img
        src={imageList[currentIndex]}
        alt={`${productName} - Vista ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-all duration-300"
      />

      {/* Flechas de navegación */}
      {imageList.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
            aria-label="Imagen anterior"
          >
            ❮
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
            aria-label="Siguiente imagen"
          >
            ❯
          </button>

          {/* Puntos de posición (Dots) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
            {imageList.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentIndex === idx ? 'bg-white w-3' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const whatsappNumber = '5573589465';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true);
      if (prodData) setProducts(prodData);

      setLoading(false);
    }

    fetchData();
  }, []);

  const handleWhatsAppQuote = (productName: string) => {
    const message = encodeURIComponent(
      `¡Hola E-Aura! Me interesa cotizar el producto: ${productName}. ¿Podrían darme más información?`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.aroma?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-[#4a3b2c] relative font-[var(--font-montserrat)] flex flex-col justify-between"
      style={{ backgroundImage: "url('/bg-texture.png')" }}
    >
      <div className="absolute inset-0 bg-[#fdfbf7]/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col min-h-screen justify-between">
        {/* ENCABEZADO Y NAVEGACIÓN */}
        <header className="border-b border-[#7a5c29]/20 backdrop-blur-md rounded-2xl p-4 bg-white/20 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold">
                Catálogo Oficial
              </span>
              <h1 className="font-[var(--font-great-vibes)] text-4xl text-[#3d2b1f] leading-none">
                E-Aura
              </h1>
            </div>

            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Buscar diseño o aroma..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-4 py-2.5 rounded-full bg-white/60 backdrop-blur-sm border border-[#c9b596]/50 focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 text-[#3d2b1f]"
              />
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto pt-4 mt-2 border-t border-[#7a5c29]/10">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap font-[var(--font-cinzel)] ${
                selectedCategory === null
                  ? 'bg-[#3d2b1f] text-amber-50 shadow-md font-bold'
                  : 'bg-white/30 text-[#5c4a38] hover:bg-white/60'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap font-[var(--font-cinzel)] ${
                  selectedCategory === cat.id
                    ? 'bg-[#3d2b1f] text-amber-50 shadow-md font-bold'
                    : 'bg-white/30 text-[#5c4a38] hover:bg-white/60'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </header>

        {/* ESPACIO CENTRAL */}
        <div className="my-4 text-center">
          <p className="font-[var(--font-cinzel)] text-xs md:text-sm tracking-[0.25em] text-[#6b5235] uppercase bg-[#fdfbf7]/40 backdrop-blur-md inline-block px-6 py-2 rounded-full border border-[#c9b596]/30">
            Velas Artesanales & Recuerdos Hechos a Mano
          </p>
        </div>

        {/* RETÍCULA CON CARRUSEL DE IMÁGENES */}
        <section className="mb-12">
          {loading ? (
            <div className="text-center py-20 font-[var(--font-cinzel)] text-[#7a5c29]">
              <p className="animate-pulse tracking-widest uppercase text-xs">Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white/30 backdrop-blur-md rounded-2xl border border-white/50 text-[#6b5235]">
              No se encontraron productos.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white/35 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Carrusel Interactivo de Fotos */}
                    <ProductImageCarousel
                      mainImage={product.image_url}
                      images={product.images}
                      productName={product.name}
                    />

                    <h3 className="font-[var(--font-cinzel)] font-bold text-base text-[#2d1f15] text-center mb-1 leading-snug">
                      {product.name}
                    </h3>

                    <p className="text-xs text-[#5c4a38] text-center mb-3 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="text-xs text-[#6b5235] space-y-1 mb-4 bg-white/40 p-3 rounded-xl border border-white/50">
                      <div><strong className="text-[#3d2b1f]">Cera:</strong> {product.wax_type}</div>
                      <div><strong className="text-[#3d2b1f]">Aroma:</strong> {product.aroma}</div>
                      <div><strong className="text-[#3d2b1f]">Medidas:</strong> {product.dimensions}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-center mb-3">
                      <span className="font-[var(--font-cinzel)] font-bold text-xl text-[#2d1f15]">
                        ${product.price.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-[#6b5235]">MXN</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleWhatsAppQuote(product.name)}
                      className="w-full bg-[#0d6e48]/90 hover:bg-[#0a5739] text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 backdrop-blur-sm border border-emerald-500/30"
                    >
                      <span>Cotizar por WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-center py-4 border-t border-[#7a5c29]/20 text-[10px] text-[#6b5235] tracking-wider uppercase font-[var(--font-cinzel)]">
          © {new Date().getFullYear()} E-Aura — Velas Artesanales
        </footer>
      </div>
    </main>
  );
}