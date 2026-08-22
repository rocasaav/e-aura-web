'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

// --- INTERFACES BASADAS EN EL ESQUEMA DE SUPABASE ---

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  category_ids: number[];
  name: string;
  slug?: string;
  description: string;
  price: number;
  wax_type: string;
  aroma: string;
  dimensions: string;
  image_url: string;
  images: string[];
  is_available: boolean;
}

interface ProductWaxAromaQueryResult {
  layer_number?: number;
  wax_types?: { name: string } | null;
  aromas?: { name: string } | null;
}

interface ProductCategoryQueryResult {
  category_id: number;
}

interface ProductQueryResult {
  id: number;
  name: string;
  slug?: string;
  commentary?: string;
  price: number;
  dimensions?: string;
  images?: string[] | null;
  is_available: boolean;
  product_categories?: ProductCategoryQueryResult[];
  product_wax_aromas?: ProductWaxAromaQueryResult[];
}

interface ProductImageCarouselProps {
  mainImage: string;
  images?: string[] | null;
  productName: string;
  onImageClick?: (images: string[], initialIndex: number) => void;
}

function ProductImageCarousel({
  mainImage,
  images,
  productName,
  onImageClick,
}: ProductImageCarouselProps) {
  const imageList = images && images.length > 0 ? images : [mainImage];
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prevImage = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const nextImage = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX.current - touchEndX;
    const minSwipeDistance = 40;

    if (swipeDistance > minSwipeDistance) {
      nextImage();
    } else if (swipeDistance < -minSwipeDistance) {
      prevImage();
    }

    touchStartX.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full h-64 overflow-hidden rounded-xl mb-4 border border-[#e8ded1] bg-[#fdfbf7] relative shadow-inner group flex items-center justify-center p-2 select-none touch-pan-y cursor-zoom-in"
      onClick={() => onImageClick && onImageClick(imageList, currentIndex)}
    >
      <div className="relative w-full h-full">
        <Image
          src={imageList[currentIndex] || '/placeholder.png'}
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
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/75 hover:bg-[#3d2b1f] text-white p-2.5 rounded-full backdrop-blur-sm transition-opacity duration-200 text-xs z-10 shadow-md active:scale-95 md:opacity-80 md:group-hover:opacity-100"
            aria-label="Imagen anterior"
          >
            ❮
          </button>

          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/75 hover:bg-[#3d2b1f] text-white p-2.5 rounded-full backdrop-blur-sm transition-opacity duration-200 text-xs z-10 shadow-md active:scale-95 md:opacity-80 md:group-hover:opacity-100"
            aria-label="Siguiente imagen"
          >
            ❯
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-[#3d2b1f]/50 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 items-center">
            {imageList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className="p-1 focus:outline-none"
                aria-label={`Ir a la imagen ${idx + 1}`}
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    currentIndex === idx ? 'bg-white w-3 h-1.5' : 'bg-white/50 w-1.5 h-1.5'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { totalItems, setIsCartOpen, addToCart } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  // Estado para el Modal Lupa con Carrusel Integrado
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    index: number;
    title: string;
  } | null>(null);

  const touchStartXModal = useRef<number | null>(null);
  const whatsappNumber = '5573589465';

  useEffect(() => {
    setMounted(true);
    const savedFavorites = localStorage.getItem('e_aura_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error al cargar favoritos de localStorage:', e);
      }
    }
  }, []);

  const toggleFavorite = (productId: number) => {
    setFavorites((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];

      localStorage.setItem('e_aura_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
  async function fetchData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 🚀 Disparamos ambas peticiones en paralelo
      const [catResult, prodResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true }),
        supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            commentary,
            price,
            dimensions,
            images,
            is_available,
            product_categories (
              category_id
            ),
            product_wax_aromas (
              layer_number,
              wax_types:wax_type_id ( name ),
              aromas:aroma_id ( name )
            )
          `)
          .eq('is_available', true)
      ]);

      const { data: catData, error: catError } = catResult;
      const { data: productsData, error: prodError } = prodResult;

      if (catError) throw catError;
      if (prodError) throw prodError;

      if (catData) setCategories(catData);

      if (productsData) {
        const formattedProducts: Product[] = (productsData as unknown as ProductQueryResult[]).map((prod) => {
          const waxTypes = prod.product_wax_aromas
            ?.map((item) => item.wax_types?.name)
            .filter((name): name is string => Boolean(name));

          const aromas = prod.product_wax_aromas
            ?.map((item) => item.aromas?.name)
            .filter((name): name is string => Boolean(name));

          const categoryIds = prod.product_categories
            ?.map((pc) => pc.category_id)
            .filter(Boolean) || [];

          const imageList = prod.images && prod.images.length > 0 ? prod.images : ['/placeholder.png'];

          return {
            id: prod.id,
            category_ids: categoryIds,
            name: prod.name,
            slug: prod.slug,
            description: prod.commentary || 'Vela artesanal personalizada hecha con insumos naturales de alta calidad.',
            price: Number(prod.price) || 0,
            wax_type: waxTypes?.length ? Array.from(new Set(waxTypes)).join(', ') : 'Cera Artesanal',
            aroma: aromas?.length ? Array.from(new Set(aromas)).join(', ') : 'Aroma Natural',
            dimensions: prod.dimensions || 'N/A',
            image_url: imageList[0],
            images: imageList,
            is_available: prod.is_available,
          };
        });

        setProducts(formattedProducts);
      }
    } catch (err: unknown) {
      console.error('Error al consultar Supabase:', err);
      setErrorMessage('No se pudieron cargar los productos. Por favor intenta de nuevo.');
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
    const matchesCategory = selectedCategory
      ? product.category_ids?.includes(selectedCategory)
      : true;

    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.aroma?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Funciones de navegación para el Modal Lupa
  const nextLightboxImage = () => {
    if (!lightboxData) return;
    setLightboxData((prev) =>
      prev
        ? {
            ...prev,
            index: prev.index === prev.images.length - 1 ? 0 : prev.index + 1,
          }
        : null
    );
  };

  const prevLightboxImage = () => {
    if (!lightboxData) return;
    setLightboxData((prev) =>
      prev
        ? {
            ...prev,
            index: prev.index === 0 ? prev.images.length - 1 : prev.index - 1,
          }
        : null
    );
  };

  const handleModalTouchStart = (e: React.TouchEvent) => {
    touchStartXModal.current = e.touches[0].clientX;
  };

  const handleModalTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXModal.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartXModal.current - touchEndX;
    const minSwipeDistance = 40;

    if (swipeDistance > minSwipeDistance) {
      nextLightboxImage();
    } else if (swipeDistance < -minSwipeDistance) {
      prevLightboxImage();
    }
    touchStartXModal.current = null;
  };

  return (
    <main
      className="min-h-screen text-[#4a3b2c] relative font-[var(--font-montserrat)] flex flex-col justify-between bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/bg-texture.png')" }}
    >
      <div className="absolute inset-0 bg-[#fdfbf7]/30 pointer-events-none" />
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 flex flex-col min-h-screen justify-between">
        
        {/* ENCABEZADO */}
        <header className="border border-[#7a5c29]/20 backdrop-blur-md rounded-2xl px-4 py-3 bg-white/50 shadow-sm mb-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-center md:text-left">
              <span className="text-[10px] tracking-widest font-serif text-[#7a5c29] uppercase font-semibold block leading-none">
                Nuestro catálogo
              </span>
              <h1 className="font-cursive text-5xl md:text-6xl text-[#5a3e2b] leading-tight my-0">
                E-Aura
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              <input
                type="text"
                placeholder="Buscar diseño o aroma..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 text-xs px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-[#c9b596]/60 focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 text-[#3d2b1f]"
              />

              <Link
                href="/mis-favoritos"
                onClick={(e) => {
                  if (!mounted || favorites.length === 0) {
                    e.preventDefault();
                  }
                }}
                aria-disabled={!mounted || favorites.length === 0}
                className={`w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-serif transition-all shadow-sm border border-[#3d2b1f] ${
                  mounted && favorites.length > 0
                    ? 'bg-[#5a3e2b] hover:bg-[#3d2b1f] text-white active:scale-95 cursor-pointer'
                    : 'bg-[#5a3e2b]/50 text-white/60 border-[#3d2b1f]/40 opacity-50 cursor-not-allowed pointer-events-none'
                }`}
              >
                <span className={mounted && favorites.length > 0 ? 'text-rose-400' : 'text-gray-300'}>♥</span>
                <span>Mis Me Gusta</span>
                {mounted && favorites.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                    {favorites.length}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white font-[var(--font-cinzel)] transition-all shadow-sm active:scale-95 border border-[#3d2b1f] relative cursor-pointer"
              >
                <span>🛒 Carrito</span>
                {totalItems > 0 && (
                  <span className="bg-[#c9b596] text-[#2d1f15] text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-2 mt-2 border-t border-[#7a5c29]/15 pb-1">
            <button
              type="button"
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
                type="button"
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
        <div className="my-3 text-center">
          <p className="font-serif text-xs md:text-sm tracking-[0.18em] text-[#5a3e2b] uppercase bg-[#fdfbf7]/70 backdrop-blur-md inline-block px-6 py-2 rounded-full border border-[#c9b596]/40 shadow-sm">
            Velas Artesanales <span className="font-cursive text-xl lowercase text-[#7a5c29] tracking-normal px-1">&</span> Recuerdos Hechos a Mano
          </p>
        </div>

        {/* CATÁLOGO DE PRODUCTOS */}
        <section className="my-6">
          {loading ? (
            <div className="text-center py-16 font-[var(--font-cinzel)] text-[#7a5c29]">
              <p className="animate-pulse tracking-widest uppercase text-xs">Cargando catálogo...</p>
            </div>
          ) : errorMessage ? (
            <div className="text-center py-12 bg-rose-50/80 backdrop-blur-md rounded-2xl border border-rose-200 text-rose-800 text-xs font-[var(--font-cinzel)]">
              {errorMessage}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 text-[#6b5235]">
              No se encontraron productos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const isFavorite = favorites.includes(product.id);

                return (
                  <div
                    key={product.id}
                    className="bg-white/50 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative group"
                  >
                    <div>
                      <ProductImageCarousel
                        mainImage={product.image_url}
                        images={product.images}
                        productName={product.name}
                        onImageClick={(images, initialIndex) =>
                          setLightboxData({
                            images,
                            index: initialIndex,
                            title: product.name,
                          })
                        }
                      />
                      <h3 className="font-cursive text-3xl md:text-4xl text-[#3d2b1f] text-center mb-1 leading-snug">
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
                        <span className="font-serif font-bold text-xl text-[#2d1f15]">
                          ${product.price.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-[#6b5235]">MXN</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-6 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppQuote(product.name)}
                          style={{ backgroundImage: "url('/fondoWhatsApp.png')" }}
                          className="col-span-3 bg-cover bg-center text-[#3d2b1f] font-bold py-2.5 px-2 rounded-xl text-xs transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1 border border-[#8a6b43]/40 font-[var(--font-cinzel)] tracking-wider hover:brightness-95 active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4 fill-current text-[#128C7E]" viewBox="0 0 24 24">
                            <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001l-1.416 5.17 5.291-1.387c1.464.798 3.118 1.218 4.779 1.219h.004c5.506 0 9.989-4.478 9.99-9.985 0-2.668-1.039-5.177-2.926-7.064c-1.886-1.887-4.394-2.925-7.064-2.925zm5.72 14.181c-.236.666-1.373 1.272-1.912 1.346-.492.068-1.127.098-1.821-.124-.424-.136-.971-.312-1.685-.623-2.977-1.295-4.921-4.303-5.07-4.502-.149-.199-1.21-1.609-1.21-3.07 0-1.46.764-2.18 1.037-2.478.273-.298.596-.372.795-.372.199 0 .398.003.57.011.183.008.428-.069.67.511.248.596.845 2.063.919 2.212.075.149.124.323.025.522-.099.199-.149.323-.298.497-.149.174-.313.389-.447.522-.149.149-.304.312-.131.61.174.298.774 1.278 1.66 2.068 1.14.1 2.046 1.341 2.344 1.54.298.199.472.174.646-.025.174-.199.745-.869.944-1.167.199-.298.398-.248.67-.149.273.099 1.738.82 2.036.969.298.149.497.223.571.348.074.124.074.72-.162 1.386z"/>
                          </svg>
                          <span>Cotizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => addToCart && addToCart(product)}
                          title="Agregar al Carrito"
                          className="col-span-2 bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white font-bold py-2.5 px-2 rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 font-[var(--font-cinzel)]"
                        >
                          🛒 <span>+</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          title={isFavorite ? 'Quitar de Me Gusta' : 'Agregar a Me Gusta'}
                          className={`col-span-1 rounded-xl flex items-center justify-center text-base border transition-all active:scale-90 ${
                            isFavorite
                              ? 'bg-rose-100 border-rose-300 text-rose-600 shadow-inner'
                              : 'bg-white/80 border-[#c9b596]/50 text-gray-400 hover:text-rose-500 hover:bg-white'
                          }`}
                        >
                          {isFavorite ? '♥' : '♡'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MODAL LUPA CON CARRUSEL INTEGRADO OPTIMIZADO */}
        {lightboxData && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 transition-opacity duration-300 select-none"
            onClick={() => setLightboxData(null)}
          >
            <div
              className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center justify-center bg-[#fdfbf7] rounded-2xl overflow-hidden border border-[#c9b596]/40 shadow-2xl p-4 md:p-6"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleModalTouchStart}
              onTouchEnd={handleModalTouchEnd}
            >
              {/* Botón para cerrar */}
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="absolute top-3 right-3 bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white w-9 h-9 rounded-full flex items-center justify-center shadow-md border border-[#c9b596]/50 text-sm font-bold z-20 transition-transform active:scale-90 cursor-pointer"
                aria-label="Cerrar vista ampliada"
              >
                ✕
              </button>

              {/* Título y Contador del Modal */}
              <div className="w-full text-center mb-2 px-8">
                <h4 className="font-cursive text-2xl md:text-3xl text-[#3d2b1f] leading-none">
                  {lightboxData.title}
                </h4>
                {lightboxData.images.length > 1 && (
                  <span className="text-[11px] font-serif text-[#7a5c29] uppercase tracking-wider block mt-1">
                    Imagen {lightboxData.index + 1} de {lightboxData.images.length}
                  </span>
                )}
              </div>

              {/* Contenedor Principal de la Foto */}
              <div className="relative w-full h-[55vh] md:h-[65vh] my-2 flex items-center justify-center">
                <Image
                  src={lightboxData.images[lightboxData.index] || '/placeholder.png'}
                  alt={`${lightboxData.title} ampliado`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />

                {/* Flechas de Navegación en Pantalla Grande */}
                {lightboxData.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevLightboxImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/80 hover:bg-[#3d2b1f] text-white p-3 rounded-full backdrop-blur-sm transition-all text-sm z-10 shadow-lg active:scale-95"
                      aria-label="Foto anterior"
                    >
                      ❮
                    </button>

                    <button
                      type="button"
                      onClick={nextLightboxImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3d2b1f]/80 hover:bg-[#3d2b1f] text-white p-3 rounded-full backdrop-blur-sm transition-all text-sm z-10 shadow-lg active:scale-95"
                      aria-label="Siguiente foto"
                    >
                      ❯
                    </button>
                  </>
                )}
              </div>

              {/* Miniaturas Inferiores con Descarga Inmediata Optimizada */}
              {lightboxData.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto max-w-full py-2 px-1 scrollbar-none items-center">
                  {lightboxData.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxData((prev) => (prev ? { ...prev, index: idx } : null))}
                      className={`relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        lightboxData.index === idx
                          ? 'border-[#7a5c29] scale-105 shadow-md'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        fill
                        loading="eager"
                        quality={40}
                        className="object-cover"
                        sizes="60px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIE DE PÁGINA */}
        <footer className="mt-12 border-t border-[#7a5c29]/20 pt-10 pb-6 bg-white/40 backdrop-blur-md rounded-t-3xl border-x border-white/60 shadow-lg px-6 md:px-12 text-[#4a3b2c]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
            <div className="space-y-3">
              <h2 className="font-cursive text-4xl text-[#5a3e2b] leading-none">E-Aura</h2>
              <p className="text-xs text-[#6b5235] leading-relaxed font-serif">
                Velas artesanales de cera natural y recuerdos hechos a mano. Para nosotros, cada cliente es único: si tienes un diseño en mente, dinos cómo lo imaginas y lo creamos especialmente para ti.
              </p>
              <div className="text-[11px] font-semibold text-[#7a5c29] font-serif tracking-wider uppercase pt-1">
                ✨ Hecho con amor en México
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-xs uppercase tracking-widest text-[#3d2b1f] font-bold border-b border-[#c9b596]/40 pb-1.5 inline-block md:block">
                Contacto & Pedidos
              </h3>
              <ul className="space-y-2 text-xs text-[#5c4a38]">
                <li className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-emerald-700 font-bold">📱 Tel / WhatsApp:</span>
                  <a 
                    href={`https://wa.me/${whatsappNumber}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-[#3d2b1f] transition-colors"
                  >
                    +52 55 7358 9465
                  </a>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-[#7a5c29] font-bold">✉️ Correo:</span>
                  <a 
                    href="mailto:ventas@e-aura.com.mx" 
                    className="hover:underline hover:text-[#3d2b1f] transition-colors"
                  >
                    contacto@e-aura.com.mx
                  </a>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-2 text-[11px] text-[#7a5c29]">
                  <span>🕒 Atención: Lun a Sáb - 9:00 AM a 7:00 PM</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-xs uppercase tracking-widest text-[#3d2b1f] font-bold border-b border-[#c9b596]/40 pb-1.5 inline-block md:block">
                Síguenos en Redes
              </h3>
              <p className="text-xs text-[#6b5235]">
                Conoce nuestros nuevos diseños, procesos de elaboración y promociones especiales.
              </p>
              
              <div className="flex justify-center md:justify-start items-center gap-3 pt-1">
  {/* Instagram */}
  <a
    href="https://www.instagram.com/laylashop_e?igsh=MW1nZmlsaG13NHZzNQ=="
    target="_blank"
    rel="noopener noreferrer"
    className="bg-white/80 hover:bg-[#5a3e2b] hover:text-white text-[#3d2b1f] border border-[#c9b596]/60 p-2 rounded-full transition-all shadow-sm hover:scale-110"
    aria-label="Instagram E-Aura"
  >
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  </a>

  {/* Facebook */}
  <a
    href="https://www.facebook.com/share/1BHy6xB8e7/"
    target="_blank"
    rel="noopener noreferrer"
    className="bg-white/80 hover:bg-[#5a3e2b] hover:text-white text-[#3d2b1f] border border-[#c9b596]/60 p-2 rounded-full transition-all shadow-sm hover:scale-110"
    aria-label="Facebook E-Aura"
  >
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
      <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z" />
    </svg>
  </a>

  {/* TikTok */}
  <a
    href="https://www.tiktok.com/@lyla.lyla385?_r=1&_t=ZS-98q3FUASibl"
    target="_blank"
    rel="noopener noreferrer"
    className="bg-white/80 hover:bg-[#5a3e2b] hover:text-white text-[#3d2b1f] border border-[#c9b596]/60 p-2 rounded-full transition-all shadow-sm hover:scale-110"
    aria-label="TikTok E-Aura"
  >
    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.28 2.56.02.82.42 1.61 1.08 2.11.83.65 1.98.81 2.97.43.91-.33 1.61-1.09 1.83-2.03.11-.64.08-1.3-.01-1.94-.02-3.55-.01-7.1-.01-10.65z" />
    </svg>
  </a>
</div>
            </div>
          </div>

          <div className="border-t border-[#7a5c29]/15 pt-4 text-center text-[11px] text-[#6b5235]">
            <p>© {new Date().getFullYear()} E-Aura. Todos los derechos reservados.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}