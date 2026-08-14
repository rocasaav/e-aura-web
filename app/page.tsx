'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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

function ProductImageCarousel({
  mainImage,
  images,
  productName,
}: {
  mainImage: string;
  images?: string[] | null;
  productName: string;
}) {
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
    <div className="w-full h-64 overflow-hidden rounded-xl mb-4 border border-[#e8ded1] bg-[#fdfbf7] relative shadow-inner group flex items-center justify-center p-2">
      <div className="relative w-full h-full">
        <Image
          src={imageList[currentIndex]}
          alt={`${productName} - Vista ${currentIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain transition-all duration-300"
          priority={currentIndex === 0}
        />
      </div>

      {imageList.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/60 hover:bg-[#3d2b1f]/80 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs z-10"
            aria-label="Imagen anterior"
            >
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/60 hover:bg-[#3d2b1f]/80 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs z-10"
            aria-label="Siguiente imagen"
          >
            ❯
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-[#3d2b1f]/40 backdrop-blur-sm px-2.5 py-1 rounded-full z-10">
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
      try {
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*');
        if (catError) console.error('Error al cargar categorías:', catError.message);
        if (catData) setCategories(catData);

        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('is_available', true);
        if (prodError) console.error('Error al cargar productos:', prodError.message);
        if (prodData) setProducts(prodData);
      } catch (err) {
        console.error('Error inesperado:', err);
      } finally {
        setLoading(false);
      }
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
      className="min-h-screen text-[#4a3b2c] relative font-[var(--font-montserrat)] flex flex-col justify-between bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/bg-texture.png')" }}
    >
      <div className="absolute inset-0 bg-[#fdfbf7]/30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col min-h-screen justify-between">
        
        {/* ENCABEZADO COMPACTO Y CON TIPOGRAFÍA ALEX BRUSH */}
        <header className="border border-[#7a5c29]/20 backdrop-blur-md rounded-2xl px-4 py-2 bg-white/40 shadow-sm mb-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-1.5">
            <div className="text-center md:text-left">
              <span className="text-[9px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold block leading-none">
                Nuestro catálogo
              </span>
              <h1 
                style={{ fontFamily: 'var(--font-alex-brush), "Alex Brush", cursive' }} 
                className="text-3xl md:text-4xl text-[#5a3e2b] leading-tight my-0 tracking-normal"
              >
                E-Aura
              </h1>
            </div>

            <div className="w-full md:w-60">
              <input
                type="text"
                placeholder="Buscar diseño o aroma..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-1 rounded-full bg-white/70 backdrop-blur-sm border border-[#c9b596]/60 focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 text-[#3d2b1f]"
              />
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5 mt-1 border-t border-[#7a5c29]/15 pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-3 py-0.5 rounded-full font-[var(--font-cinzel)] transition-all ${
                selectedCategory === null
                  ? 'bg-[#c9b596] text-[#2d1f15] shadow-md font-bold border border-[#b39e7d]'
                  : 'bg-white/40 text-[#5c4a38] hover:bg-white/70'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs px-3 py-0.5 rounded-full font-[var(--font-cinzel)] transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#F1E7FD] text-[#2d1f15] shadow-md font-bold border border-[#b39e7d]'
                    : 'bg-white/40 text-[#5c4a38] hover:bg-white/70'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </header>

        {/* CINTILLA CENTRAL */}
        <div className="my-2 text-center">
          <p className="font-[var(--font-cinzel)] text-xs md:text-sm tracking-[0.22em] text-[#5a3e2b] uppercase bg-[#fdfbf7]/60 backdrop-blur-md inline-block px-6 py-2 rounded-full border border-[#c9b596]/30 shadow-sm">
            Velas Artesanales & Recuerdos Hechos a Mano
          </p>
        </div>

        {/* CATÁLOGO DE PRODUCTOS */}
        <section className="my-6">
          {loading ? (
            <div className="text-center py-16 font-[var(--font-cinzel)] text-[#7a5c29]">
              <p className="animate-pulse tracking-widest uppercase text-xs">Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 text-[#6b5235]">
              No se encontraron productos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white/50 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
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

                    <div className="text-xs text-[#6b5235] space-y-1 mb-4 bg-white/60 p-3 rounded-xl border border-white/70">
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

                    {/* BOTÓN CON TONO MÁS CLARO (#bda37e) */}
                    <button
                       onClick={() => handleWhatsAppQuote(product.name)}
                       style={{ backgroundImage: "url('/fondoWhatsApp.png')" }}
                       className="w-full bg-cover bg-center text-[#3d2b1f] font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 border border-[#8a6b43]/40 font-[var(--font-cinzel)] tracking-wider hover:brightness-95 active:scale-[0.98]"
                     >
                       <svg className="w-4 h-4 fill-current text-[#128C7E]" viewBox="0 0 24 24">
                         <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001l-1.416 5.17 5.291-1.387c1.464.798 3.118 1.218 4.779 1.219h.004c5.506 0 9.989-4.478 9.99-9.985 0-2.668-1.039-5.177-2.926-7.064c-1.886-1.887-4.394-2.925-7.064-2.925zm5.72 14.181c-.236.666-1.373 1.272-1.912 1.346-.492.068-1.127.098-1.821-.124-.424-.136-.971-.312-1.685-.623-2.977-1.295-4.921-4.303-5.07-4.502-.149-.199-1.21-1.609-1.21-3.07 0-1.46.764-2.18 1.037-2.478.273-.298.596-.372.795-.372.199 0 .398.003.57.011.183.008.428-.069.67.511.248.596.845 2.063.919 2.212.075.149.124.323.025.522-.099.199-.149.323-.298.497-.149.174-.313.389-.447.522-.149.149-.304.312-.131.61.174.298.774 1.278 1.66 2.068 1.14.1 2.046 1.341 2.344 1.54.298.199.472.174.646-.025.174-.199.745-.869.944-1.167.199-.298.398-.248.67-.149.273.099 1.738.82 2.036.969.298.149.497.223.571.348.074.124.074.72-.162 1.386z"/>
                       </svg>
                       <span>Cotizar por WhatsApp</span>
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECCIÓN QUIÉNES SOMOS */}
        <section className="my-8 bg-white/45 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/70 max-w-4xl mx-auto shadow-sm">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 text-center md:text-left">
              <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold">
                Hecho con intención
              </span>
              <h2 className="font-[var(--font-cinzel)] text-lg md:text-xl font-bold text-[#3d2b1f] mb-3">
                ¿Quiénes Somos en E-Aura?
              </h2>
              <p className="text-xs text-[#5c4a38] leading-relaxed">
                Creamos velas artesanales y recuerdos únicos hechos totalmente a mano. Nos enfocamos en transformar espacios y momentos especiales mediante aromas envolventes y diseños elegantes elaborados con ceras de alta calidad.
              </p>
            </div>
            
            <div className="bg-white/40 p-4 rounded-xl border border-white/60 text-center space-y-2">
              <div className="text-xs font-semibold text-[#3d2b1f]">✨ 100% Ceras Naturales</div>
              <div className="text-[11px] text-[#6b5235]">Diseños personalizados para eventos especiales</div>
            </div>
          </div>
        </section>

        {/* SECCIÓN CONTACTO DIRECTO */}
        <section className="my-6 bg-white/45 backdrop-blur-md rounded-2xl p-6 border border-white/70 max-w-2xl mx-auto shadow-sm text-center">
          <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold">
            Atención Personalizada
          </span>
          <h3 className="font-[var(--font-cinzel)] text-sm font-bold text-[#3d2b1f] mb-4 mt-1">
            Contacto Directo
          </h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-[#5c4a38]">
            <a 
              href="tel:5573589465" 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/70 hover:bg-white transition-all"
            >
              📞 <span>55 7358 9465</span>
            </a>
            <a 
              href="mailto:ventas@e-aura.com.mx" 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/70 hover:bg-white transition-all"
            >
              ✉️ <span>ventas@e-aura.com.mx</span>
            </a>
          </div>
        </section>

        {/* SECCIÓN REDES SOCIALES */}
        <section className="my-6 text-center bg-white/45 backdrop-blur-md rounded-2xl p-6 border border-white/70 max-w-xl mx-auto shadow-sm">
          <h3 className="font-[var(--font-cinzel)] text-xs md:text-sm tracking-[0.2em] uppercase text-[#3d2b1f] mb-2 font-bold">
            Búscanos en nuestras redes sociales
          </h3>
          <p className="text-xs text-[#5c4a38] mb-4">
            Descubre nuestras últimas creaciones, proceso artesanal y novedades.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://www.facebook.com/share/1BHy6xB8e7/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-full bg-white/50 hover:bg-white text-[#3d2b1f] font-[var(--font-cinzel)] border border-[#c9b596]/40 transition-all shadow-sm"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/laylashop_e?igsh=MW1nZmlsaG13NHZzNQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-full bg-white/50 hover:bg-white text-[#3d2b1f] font-[var(--font-cinzel)] border border-[#c9b596]/40 transition-all shadow-sm"
            >
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@lyla.lyla385?_r=1&_t=ZS-98q3FUASibl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-full bg-white/50 hover:bg-white text-[#3d2b1f] font-[var(--font-cinzel)] border border-[#c9b596]/40 transition-all shadow-sm"
            >
              TikTok
            </a>
          </div>
        </section>

        {/* PIE DE PÁGINA */}
        <footer className="text-center py-4 border-t border-[#7a5c29]/20 text-[10px] text-[#6b5235] tracking-wider uppercase font-[var(--font-cinzel)]">
          © {new Date().getFullYear()} E-Aura — Velas Artesanales
        </footer>
      </div>
    </main>
  );
}