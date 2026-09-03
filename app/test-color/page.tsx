'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import { getOrCreateSessionToken } from '../../lib/session';

interface Product {
  id: number;
  name: string;
  commentary: string;
  price: number;
  images?: string[];
  image_url: string;
}

interface SavedCustomization {
  id: string;
  productId: number;
  productName: string;
  color: string;
  colorHex: string;
  aroma: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ColorState {
  name: string;
  hex: string;
  bodyGradient: string;
  topWax: string;
  shadowColor: string;
}

const PRESET_COLORS: ColorState[] = [
  { name: 'Blanco Marfil', hex: '#fdfbf7', bodyGradient: 'from-[#ffffff] via-[#fdfbf7] to-[#f3ebd9]', topWax: '#ffffff', shadowColor: 'rgba(226, 213, 195, 0.3)' },
  { name: 'Amarillo Mantequilla', hex: '#fef08a', bodyGradient: 'from-[#fffbeb] via-[#fef08a] to-[#fde047]', topWax: '#fef9c3', shadowColor: 'rgba(254, 240, 138, 0.4)' },
  { name: 'Naranja Melocotón Pastel', hex: '#ffedd5', bodyGradient: 'from-[#fff7ed] via-[#ffedd5] to-[#fed7aa]', topWax: '#fff1f2', shadowColor: 'rgba(255, 237, 213, 0.4)' },
  { name: 'Azul Cielo Pastel', hex: '#bae6fd', bodyGradient: 'from-[#f0f9ff] via-[#bae6fd] to-[#7dd3fc]', topWax: '#e0f2fe', shadowColor: 'rgba(186, 230, 253, 0.35)' },
  { name: 'Rosa Peonía', hex: '#f4c2c2', bodyGradient: 'from-[#fce4e4] via-[#f4c2c2] to-[#e89b9b]', topWax: '#fbe3e3', shadowColor: 'rgba(244, 194, 194, 0.35)' },
  { name: 'Rojo Coral Pastel', hex: '#fca5a5', bodyGradient: 'from-[#fef2f2] via-[#fca5a5] to-[#f87171]', topWax: '#fee2e2', shadowColor: 'rgba(252, 165, 165, 0.35)' },
  { name: 'Verde Menta Pastel', hex: '#b8e0d2', bodyGradient: 'from-[#e2f3ec] via-[#b8e0d2] to-[#8ebfbe]', topWax: '#d8f0e7', shadowColor: 'rgba(184, 224, 210, 0.35)' },
  { name: 'Lavanda Silvestre', hex: '#d3c5e5', bodyGradient: 'from-[#eee7f6] via-[#d3c5e5] to-[#b29ccf]', topWax: '#e7def2', shadowColor: 'rgba(211, 197, 229, 0.35)' },
  { name: 'Arena / Lino', hex: '#e2d5c3', bodyGradient: 'from-[#f3ede3] via-[#e2d5c3] to-[#ccb9a3]', topWax: '#efe7dc', shadowColor: 'rgba(226, 213, 195, 0.4)' }
];

function createCustomColorState(hex: string): ColorState {
  return {
    name: `Personalizado (${hex})`,
    hex,
    bodyGradient: '',
    topWax: hex,
    shadowColor: `${hex}55`,
  };
}

function PersonalizerContent() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');

  const [product, setProduct] = useState<Product | null>(null);
  const [aromasList, setAromasList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de Personalización
  const [selectedColor, setSelectedColor] = useState<ColorState>(PRESET_COLORS[0]);
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false);
  const [selectedAroma, setSelectedAroma] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customizations, setCustomizations] = useState<SavedCustomization[]>([]);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  // 1. Cargar configuraciones guardadas previamente en localStorage
  useEffect(() => {
    const localData = localStorage.getItem('eaura_customizations');
    if (localData) {
      try {
        setCustomizations(JSON.parse(localData));
      } catch (e) {
        console.error('Error al leer localStorage:', e);
      }
    }
  }, []);

  // 2. Guardar automáticamente en localStorage cada vez que se modifique la lista
  useEffect(() => {
    localStorage.setItem('eaura_customizations', JSON.stringify(customizations));
  }, [customizations]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        await getOrCreateSessionToken();

        const { data: catalogData } = await supabase
          .from('products')
          .select('id, name, commentary, price, images, is_available')
          .eq('is_available', true);

        if (catalogData) {
          const formattedCatalog: Product[] = catalogData.map((p) => {
            let img = '/placeholder-candle.jpg';
            if (Array.isArray(p.images) && p.images.length > 0) img = p.images[0];
            return {
              id: Number(p.id),
              name: p.name,
              commentary: p.commentary || '',
              price: Number(p.price),
              images: Array.isArray(p.images) ? p.images : [],
              image_url: img,
            };
          });

          const parsedId = productId ? Number(productId) : null;
          const current = formattedCatalog.find((item) => item.id === parsedId) || formattedCatalog[0];
          setProduct(current || null);
        }

        const { data: allAromas } = await supabase
          .from('aromas')
          .select('id, name')
          .order('name', { ascending: true });

        if (allAromas && allAromas.length > 0) {
          setAromasList(allAromas);
          setSelectedAroma(allAromas[0].name);
        }

      } catch (err) {
        console.error('Error al cargar datos desde Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [productId]);

  const handleSaveConfiguration = () => {
    if (!product) return;

    const newConfig: SavedCustomization = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      aroma: selectedAroma || 'Sin Aroma',
      quantity: quantity,
      unitPrice: product.price,
      total: product.price * quantity,
    };

    setCustomizations((prev) => [...prev, newConfig]);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
    setQuantity(1);
  };

  const handleUpdateItemQuantity = (id: string, delta: number) => {
    setCustomizations((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item): item is SavedCustomization => item !== null)
    );
  };

  if (loading) {
    return (
      <div className="text-center py-20 font-[var(--font-cinzel)] text-[#7a5c29]">
        <p className="animate-pulse tracking-widest uppercase text-xs">Cargando personalizador...</p>
      </div>
    );
  }

  if (!product) return null;

  const totalPiecesCount = customizations.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmountSum = customizations.reduce((acc, item) => acc + item.total, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* CABECERA */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold block">
            Personalizando tu selección
          </span>
          <h1 className="font-[var(--font-cinzel)] text-3xl font-bold text-[#2d1f15] leading-tight">
            {product.name}
          </h1>
        </div>

        <Link
          href="/mis-favoritos"
          className="text-xs bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white px-5 py-2.5 rounded-full font-[var(--font-cinzel)] transition-all shadow-sm"
        >
          ← Volver a Mis Favoritos
        </Link>
      </div>

      {/* TARJETA DEL MODELO EN EDICIÓN */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-[#e8ded1] shadow-sm flex flex-col md:flex-row items-center gap-5">
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#d9cebe] flex-shrink-0 bg-[#fdfbf7]">
          <Image src={product.image_url} alt={product.name} fill className="object-cover" unoptimized />
        </div>

        <div className="flex-1 text-center md:text-left space-y-1 w-full">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="bg-[#f3ebd9] text-[#7a5c29] text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full font-[var(--font-cinzel)]">
              Modelo en edición
            </span>
          </div>

          <p className="text-xs text-[#6b5235] line-clamp-2 leading-relaxed">
            {product.commentary || 'Vela artesanal moldeada a mano con cera ecológica.'}
          </p>
        </div>

        <div className="text-right flex-shrink-0 md:border-l md:border-[#e8ded1] md:pl-5 w-full md:w-auto flex md:flex-col justify-between items-center md:items-end">
          <span className="text-[10px] text-[#7a5c29] font-[var(--font-cinzel)] uppercase font-medium">Precio Base</span>
          <span className="font-[var(--font-cinzel)] font-bold text-xl text-[#2d1f15]">
            ${product.price.toFixed(2)} <span className="text-xs font-normal text-[#6b5235]">MXN</span>
          </span>
        </div>
      </div>

      {/* PANEL PRINCIPAL DE PERSONALIZACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* VISTA PREVIA INTERACTIVA */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-sm flex flex-col items-center justify-center relative">
          <div className="bg-[#fdfbf7] border border-[#e8ded1] rounded-xl p-4 w-full flex flex-col items-center justify-center relative h-96 shadow-inner overflow-hidden">
            <div className="relative w-48 h-64 flex justify-center items-end my-4">
              
              {/* Flama Vectorial */}
              <div className="absolute top-2 z-30 flex items-center justify-center">
                <svg width="44" height="64" viewBox="0 0 44 64" fill="none" className="drop-shadow-sm">
                  <defs>
                    <linearGradient id="flameOuterGrad" x1="22" y1="4" x2="22" y2="60" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                    <linearGradient id="flameInnerGrad" x1="22" y1="22" x2="22" y2="50" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#fde047" />
                    </linearGradient>
                  </defs>
                  <path d="M 22 4 C 22 4, 38 30, 38 42 C 38 52 31 60 22 60 C 13 60 6 52 6 42 C 6 30, 22 4, 22 4 Z" fill="url(#flameOuterGrad)" stroke="#111111" strokeWidth="3.5" strokeLinejoin="round" />
                  <path d="M 22 22 C 22 22, 30 35, 30 42 C 30 47 26 50 22 50 C 18 50 14 47 14 42 C 14 35, 22 22, 22 22 Z" fill="url(#flameInnerGrad)" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Cuerpo de la Vela */}
              <div className="relative w-36 h-48 rounded-b-[2rem] rounded-t-lg flex flex-col items-center justify-end">
                <div className="absolute top-5 w-[92%] h-7 rounded-[50%] z-20 shadow-inner overflow-hidden border border-white/40 transition-colors duration-300" style={{ backgroundColor: selectedColor.topWax }} />
                <div 
                  className={`w-full h-40 ${isCustomColor ? '' : `bg-gradient-to-br ${selectedColor.bodyGradient}`} rounded-b-[2rem] rounded-t-md shadow-md relative overflow-hidden transition-all duration-300 border border-white/60`}
                  style={{ backgroundColor: isCustomColor ? selectedColor.hex : undefined }}
                >
                  <div className="absolute top-0 left-3 w-6 h-full bg-gradient-to-r from-white/40 via-white/10 to-transparent blur-[1px]"></div>
                </div>
                <div className="absolute -bottom-2 w-32 h-4 rounded-full blur-md -z-10 transition-colors duration-300" style={{ backgroundColor: selectedColor.shadowColor }} />
              </div>

            </div>
          </div>
        </div>

        {/* CONTROLES DE SELECCIÓN DE COLOR Y AROMA */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-sm space-y-6">
          
          {/* COLOR */}
          <div>
            <label className="block text-xs font-bold text-[#3d2b1f] uppercase tracking-wider font-[var(--font-cinzel)] mb-3">
              1. Elige el color: <span className="normal-case text-[#7a5c29] font-normal">({selectedColor.name})</span>
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => { setIsCustomColor(false); setSelectedColor(color); }}
                  style={{ backgroundColor: color.hex }}
                  className={`w-8 h-8 rounded-full border-2 transition-all transform active:scale-90 ${
                    !isCustomColor && selectedColor.name === color.name
                      ? 'border-[#3d2b1f] scale-110 shadow-md ring-2 ring-[#7a5c29]/40'
                      : 'border-white shadow-sm hover:scale-105'
                  }`}
                />
              ))}

              <div className="relative group">
                <input
                  type="color"
                  value={selectedColor.hex}
                  onChange={(e) => { setIsCustomColor(true); setSelectedColor(createCustomColorState(e.target.value)); }}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer z-20"
                />
                <div className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${isCustomColor ? 'border-[#3d2b1f] bg-white' : 'border-[#7a5c29]/60'}`}>
                  <span className="text-xs">🎨</span>
                </div>
              </div>
            </div>
          </div>

          {/* AROMA */}
          <div>
            <label className="block text-xs font-bold text-[#3d2b1f] uppercase tracking-wider font-[var(--font-cinzel)] mb-2">
              2. Selecciona la esencia / aroma:
            </label>
            <select
              value={selectedAroma}
              onChange={(e) => setSelectedAroma(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-white border border-[#c9b596]/60 text-[#3d2b1f] focus:outline-none shadow-sm cursor-pointer"
            >
              {aromasList.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* CANTIDAD Y BOTÓN DE GUARDAR */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#c9b596]/60 rounded-xl bg-white overflow-hidden shadow-sm">
                <button type="button" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))} className="px-3 py-2 text-xs font-bold text-[#3d2b1f] hover:bg-[#f0e8dd] transition-colors">-</button>
                <span className="px-3 py-2 text-xs font-bold min-w-[32px] text-center text-[#3d2b1f]">{quantity}</span>
                <button type="button" onClick={() => setQuantity((prev) => prev + 1)} className="px-3 py-2 text-xs font-bold text-[#3d2b1f] hover:bg-[#f0e8dd] transition-colors">+</button>
              </div>

              <button
                type="button"
                onClick={handleSaveConfiguration}
                className="flex-1 bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white text-xs font-bold py-3 px-4 rounded-xl font-[var(--font-cinzel)] transition-all shadow-md active:scale-[0.99]"
              >
                + Guardar esta configuración
              </button>
            </div>
          </div>

          {savedMessage && (
            <p className="text-center text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-semibold animate-in fade-in">
              ✓ Configuración guardada para {product.name}.
            </p>
          )}
        </div>

      </div>

      {/* SECCIÓN DE RESUMEN CON PERSISTENCIA */}
      {customizations.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-[var(--font-cinzel)] text-sm font-bold text-[#2d1f15] uppercase tracking-wider">
              CONFIGURACIONES DE TUS FAVORITOS ({customizations.length}):
            </h3>
            
            <Link
              href="/mis-favoritos"
              className="text-xs bg-[#7a5c29] hover:bg-[#5a3e2b] text-white px-4 py-2 rounded-xl font-[var(--font-cinzel)] transition-all shadow-sm font-semibold"
            >
              ← Seguir eligiendo en Favoritos
            </Link>
          </div>

          <div className="bg-[#c9b596]/15 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#c9b596]/40 shadow-sm space-y-6 font-[var(--font-montserrat)] text-[#3d2b1f]">
            
            {/* Encabezado del contenedor */}
            <div className="flex items-center justify-between border-b border-[#c9b596]/30 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#3d2b1f] font-[var(--font-cinzel)]">
                  Creación Artesanal Personalizada
                </h3>
              </div>
              <span className="text-[10px] md:text-xs font-semibold px-3 py-1 rounded-full bg-[#c9b596] text-white shadow-sm">
                Hecho a tu medida
              </span>
            </div>

            {/* Listado de items */}
            <div className="space-y-3">
              {customizations.map((item) => (
                <div key={item.id} className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs items-center bg-[#f3e8ff] p-4 rounded-2xl border border-[#d8b4fe]/40 shadow-sm">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)]">Artículo</span>
                    <span className="font-bold text-[#3d2b1f]">{item.productName}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)]">Color</span>
                    <span className="font-medium text-[#3d2b1f]">{item.color}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)]">Aroma</span>
                    <span className="font-medium text-[#3d2b1f]">{item.aroma}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)]">Precio Unidad</span>
                    <span className="font-semibold text-[#3d2b1f]">${item.unitPrice.toFixed(2)}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)] mb-1">Cantidad</span>
                    <div className="inline-flex items-center bg-[#f8f5f0] border border-[#c9b596]/50 rounded-lg px-2 py-1 gap-2 font-bold text-[#3d2b1f]">
                      <button 
                        type="button" 
                        onClick={() => handleUpdateItemQuantity(item.id, -1)} 
                        className="hover:text-[#7a5c29] transition-colors"
                        title="Disminuir cantidad"
                      >
                        -
                      </button>
                      <span>{item.quantity} pz</span>
                      <button 
                        type="button" 
                        onClick={() => handleUpdateItemQuantity(item.id, 1)} 
                        className="hover:text-[#7a5c29] transition-colors"
                        title="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="block text-[10px] uppercase font-bold text-[#7a5c29] font-[var(--font-cinzel)]">Subtotal</span>
                    <span className="text-sm font-bold text-[#7a5c29] font-[var(--font-cinzel)]">${item.total.toFixed(2)} MXN</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie del cuadro: Leyenda y TOTAL */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-[#c9b596]/30">
              <p className="text-xs italic text-[#7a5c29] font-medium text-center md:text-left">
                * Tu vela será elaborada a mano cuidando cada detalle de color y aroma elegidos.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="bg-[#f8f5f0] border border-[#c9b596] px-6 py-3 rounded-2xl shadow-sm text-center md:text-right w-full sm:w-auto">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7a5c29] font-[var(--font-cinzel)]">
                    Total Acumulado ({totalPiecesCount} pzas)
                  </span>
                  <span className="text-2xl md:text-3xl font-extrabold text-[#3d2b1f] tracking-tight font-[var(--font-cinzel)]">
                    ${totalAmountSum.toFixed(2)} <span className="text-sm font-semibold text-[#7a5c29]">MXN</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomizerPage() {
  return (
    <main className="min-h-screen text-[#4a3b2c] font-[var(--font-montserrat)] p-6 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/bg-texture.png')" }}>
      <Suspense fallback={<div className="text-center py-20 font-[var(--font-cinzel)] text-[#7a5c29]">Cargando...</div>}>
        <PersonalizerContent />
      </Suspense>
    </main>
  );
}