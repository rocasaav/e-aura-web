'use client';

import type React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import { getOrCreateSessionToken } from '../../lib/session';
import { createOrtSession } from '@/lib/ort-client';

interface Product {
  id: number;
  name: string;
  commentary: string;
  price: number;
  images?: string[];
  image_url: string;
  mask_image_url?: string | null;
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
  maskImageUrl?: string;
  imageUrl: string;
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
  { name: 'Arena / Lino', hex: '#e2d5c3', bodyGradient: 'from-[#f3ede3] via-[#e2d5c3] to-[#ccb9a3]', topWax: '#efe7dc', shadowColor: 'rgba(226, 213, 195, 0.4)' },
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

  // ORT SESSION
  const [ortSession, setOrtSession] = useState<any>(null);

  useEffect(() => {
    async function initOrt() {
      try {
        const modelBuffer = await fetch('/model.onnx').then((r) => r.arrayBuffer());
        const session = await createOrtSession(modelBuffer);
        setOrtSession(session);
      } catch (err) {
        console.error('Error inicializando ORT:', err);
      }
    }
    initOrt();
  }, []);

  const [product, setProduct] = useState<Product | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [aromasList, setAromasList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedColor, setSelectedColor] = useState<ColorState>(PRESET_COLORS[0]);
  const [isCustomColor, setIsCustomColor] = useState<boolean>(false);
  const [selectedAroma, setSelectedAroma] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customizations, setCustomizations] = useState<SavedCustomization[]>([]);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  const fetchAromasForProduct = async (pId: number) => {
    try {
      const { data: relAromas, error } = await supabase
        .from('product_wax_aromas')
        .select('aromas(id, name)')
        .eq('product_id', pId);

      let fetchedAromas: { id: number; name: string }[] = [];

      if (!error && relAromas && relAromas.length > 0) {
        const mapped = relAromas.map((item: any) => item.aromas).filter(Boolean);
        fetchedAromas = Array.from(
          new Map(mapped.map((a: { id: number; name: string }) => [a.id, a])).values()
        );
      }

      if (fetchedAromas.length === 0) {
        const { data: allAromas } = await supabase
          .from('aromas')
          .select('id, name')
          .order('name', { ascending: true });

        fetchedAromas = allAromas || [];
      }

      setAromasList(fetchedAromas);
      setSelectedAroma(fetchedAromas.length > 0 ? fetchedAromas[0].name : 'Neutro');
    } catch (err) {
      console.error('Error al cargar aromas:', err);
    }
  };
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        await getOrCreateSessionToken();

        const { data: catalogData } = await supabase
          .from('products')
          .select('id, name, commentary, price, images, mask_image_url, is_available')
          .eq('is_available', true);

        let formattedCatalog: Product[] = [];

        if (catalogData) {
          formattedCatalog = catalogData.map((p) => {
            const img =
              Array.isArray(p.images) && p.images.length > 0
                ? p.images[0]
                : '/placeholder-candle.jpg';

            return {
              id: Number(p.id),
              name: p.name,
              commentary: p.commentary || '',
              price: Number(p.price),
              images: Array.isArray(p.images) ? p.images : [],
              image_url: img,
              mask_image_url: p.mask_image_url || null,
            };
          });
        }

        const favsRaw = localStorage.getItem('e_aura_favorites');
        const favIds: number[] = favsRaw ? JSON.parse(favsRaw) : [];

        const userFavProducts = formattedCatalog.filter((p) => favIds.includes(p.id));
        setFavoriteProducts(userFavProducts);

        const parsedId = productId ? Number(productId) : null;
        let currentProduct: Product | null = null;

        if (parsedId) {
          currentProduct = formattedCatalog.find((item) => item.id === parsedId) || null;
        }

        if (!currentProduct && userFavProducts.length > 0) {
          currentProduct = userFavProducts[0];
        } else if (!currentProduct && formattedCatalog.length > 0) {
          currentProduct = formattedCatalog[0];
        }

        setProduct(currentProduct);

        if (currentProduct) {
          await fetchAromasForProduct(currentProduct.id);
        }

        const savedCustomsRaw = localStorage.getItem('eaura_customizations');
        if (savedCustomsRaw) {
          setCustomizations(JSON.parse(savedCustomsRaw));
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [productId]);

  useEffect(() => {
    localStorage.setItem('eaura_customizations', JSON.stringify(customizations));
  }, [customizations]);

  const handleSelectProduct = (selectedProd: Product) => {
    setProduct(selectedProd);
    fetchAromasForProduct(selectedProd.id);
  };
  const handleSaveConfiguration = () => {
    if (!product) return;

    const uniqueId = `${product.id}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 4)}`;

    const newConfig: SavedCustomization = {
      id: uniqueId,
      productId: product.id,
      productName: product.name,
      color: selectedColor.name || 'Blanco Marfil',
      colorHex: selectedColor.hex,
      aroma: selectedAroma || 'Neutro',
      quantity,
      unitPrice: product.price,
      total: product.price * quantity,
      maskImageUrl: product.mask_image_url || undefined,
      imageUrl: product.image_url,
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
            return newQty <= 0
              ? null
              : { ...item, quantity: newQty, total: newQty * item.unitPrice };
          }
          return item;
        })
        .filter((item): item is SavedCustomization => item !== null)
    );
  };

  const handleClearAll = () => {
    setCustomizations([]);
    localStorage.removeItem('eaura_customizations');
  };

  const totalPiecesCount = customizations.reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  const totalAmountSum = customizations.reduce(
    (acc, item) => acc + item.total,
    0
  );

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    const storePhoneNumber = '5573589465';

    let message = `⭐ *NUEVO PEDIDO DE E-AURA* ⭐\n\n`;
    message += `👤 *Cliente:* ${customerName}\n`;
    message += `📞 *Teléfono:* ${customerPhone}\n`;
    if (customerEmail) message += `✉️ *Correo:* ${customerEmail}\n`;

    message += `\n--------------------------------\n`;
    message += `🕯 *DETALLE DEL PEDIDO:*\n\n`;

    customizations.forEach((item, index) => {
      message += `${index + 1}. *${item.productName}*\n`;
      message += `   • Color: ${item.color}\n`;
      message += `   • Aroma: ${item.aroma}\n`;
      message += `   • Cantidad: ${item.quantity} pz(s) x $${item.unitPrice.toFixed(
        2
      )}\n`;
      message += `   • Subtotal: $${item.total.toFixed(2)} MXN\n\n`;
    });

    message += `--------------------------------\n`;
    message += `📦 *Total de piezas:* ${totalPiecesCount}\n`;
    message += `💵 *Total a pagar:* $${totalAmountSum.toFixed(2)} MXN\n\n`;
    message += `Hola, me gustaría confirmar este pedido personalizado. Muchas gracias.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${storePhoneNumber}?text=${encodedMessage}`,
      '_blank'
    );

    setIsModalOpen(false);
  };
  if (loading) {
    return (
      <div className="text-center py-20 font-[var(--font-cinzel)] text-[#a3685e]">
        <p className="animate-pulse tracking-widest uppercase text-xs">
          Cargando personalizador...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 font-[var(--font-cinzel)] space-y-4">
        <p className="text-sm text-[#8c5349]">
          No tienes ningún producto seleccionado en tus favoritos.
        </p>

        <Link
          href="/"
          className="inline-block text-xs bg-gradient-to-r from-[#a3685e] to-[#8c5349] text-white px-6 py-3 rounded-full shadow-md hover:opacity-90 transition-all font-semibold tracking-wider"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#a3685e] uppercase font-bold block mb-1">
              Personalizando tu selección
            </span>

            <h1 className="font-[var(--font-cinzel)] text-3xl font-bold text-[#4a3531] leading-tight">
              {product.name}
            </h1>
          </div>

          <Link
            href="/"
            className="text-xs bg-white/90 hover:bg-white text-[#8c5349] border border-[#e8d5d1] px-5 py-2.5 rounded-full font-[var(--font-cinzel)] font-semibold transition-all shadow-xs hover:shadow-md backdrop-blur-sm"
          >
            ← Volver al catálogo
          </Link>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-[#f0e4e1] shadow-xs flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#e6d3cf] flex-shrink-0 bg-white">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-1 w-full">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="bg-[#f8eeec] text-[#a3685e] text-[10px] uppercase font-bold px-3 py-0.5 rounded-full font-[var(--font-cinzel)] tracking-wider">
                  Asigna la configuración de color y aroma que más te guste.
                </span>
              </div>

              <p className="text-xs text-[#705651] line-clamp-2 leading-relaxed font-normal">
                {product.commentary ||
                  'Vela artesanal moldeada a mano con cera ecológica.'}
              </p>
            </div>

            <div className="text-right flex-shrink-0 md:border-l md:border-[#f0e4e1] md:pl-5 w-full md:w-auto flex md:flex-col justify-between items-center md:items-end">
              <span className="text-[10px] text-[#a3685e] font-[var(--font-cinzel)] uppercase font-semibold tracking-wider">
                Precio Base
              </span>

              <span className="font-[var(--font-cinzel)] font-bold text-xl text-[#4a3531]">
                ${product.price.toFixed(2)}{' '}
                <span className="text-xs font-medium text-[#8c5349]">MXN</span>
              </span>
            </div>
          </div>

          {favoriteProducts.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-[#f0e4e1]/80 px-1">
              <span className="text-xs text-[#a3685e] font-bold font-[var(--font-cinzel)] whitespace-nowrap">
                ¡Selecciona un producto y configúralo a tu gusto! :
              </span>

              {favoriteProducts.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => handleSelectProduct(fav)}
                  className={`text-xs px-4 py-1.5 rounded-full font-[var(--font-cinzel)] whitespace-nowrap transition-all ${
                    product.id === fav.id
                      ? 'bg-[#f4ecfb] text-[#6b3e36] font-semibold border-2 border-[#a3685e] shadow-xs'
                      : 'bg-white/80 text-[#8c6d66] hover:bg-[#fcf5f3] border border-[#eee2de]'
                  }`}
                >
                  {fav.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
      {/* PREVIEW + CONTROLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* PREVIEW DE LA VELA */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#f0e4e1] shadow-xs flex flex-col items-center justify-center relative">
          <div className="bg-[#fffcfb] border border-[#f0e4e1] rounded-xl p-4 w-full flex flex-col items-center justify-center relative h-96 shadow-inner overflow-hidden">
            <div className="relative w-48 h-64 flex justify-center items-end my-4">

              {/* FLAMA */}
              <div className="absolute top-2 z-30 flex items-center justify-center">
                <svg width="44" height="64" viewBox="0 0 44 64" fill="none" className="drop-shadow-xs">
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

                  <path
                    d="M 22 4 C 22 4, 38 30, 38 42 C 38 52 31 60 22 60 C 13 60 6 52 6 42 C 6 30, 22 4, 22 4 Z"
                    fill="url(#flameOuterGrad)"
                    stroke="#111111"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M 22 22 C 22 22, 30 35, 30 42 C 30 47 26 50 22 50 C 18 50 14 47 14 42 C 14 35, 22 22, 22 22 Z"
                    fill="url(#flameInnerGrad)"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* CUERPO DE LA VELA */}
              <div className="relative w-36 h-48 rounded-b-[2rem] rounded-t-lg flex flex-col items-center justify-end">
                <div
                  className="absolute top-5 w-[92%] h-7 rounded-[50%] z-20 shadow-inner overflow-hidden border border-white/40 transition-colors duration-300"
                  style={{ backgroundColor: selectedColor.topWax }}
                />

                <div
                  className={`w-full h-40 ${
                    isCustomColor ? '' : `bg-gradient-to-br ${selectedColor.bodyGradient}`
                  } rounded-b-[2rem] rounded-t-md shadow-md relative overflow-hidden transition-all duration-300 border border-white/60`}
                  style={{ backgroundColor: isCustomColor ? selectedColor.hex : undefined }}
                >
                  <div className="absolute top-0 left-3 w-6 h-full bg-gradient-to-r from-white/40 via-white/10 to-transparent blur-[1px]" />
                </div>

                <div
                  className="absolute -bottom-2 w-32 h-4 rounded-full blur-md -z-10 transition-colors duration-300"
                  style={{ backgroundColor: selectedColor.shadowColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLES DE COLOR Y AROMA */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#f0e4e1] shadow-xs space-y-6">

          {/* COLOR */}
          <div>
            <label className="block text-xs font-bold text-[#4a3531] uppercase tracking-wider font-[var(--font-cinzel)] mb-3">
              1. Elige el color: <span className="normal-case text-[#a3685e] font-medium">({selectedColor.name})</span>
            </label>

            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => {
                    setIsCustomColor(false);
                    setSelectedColor(color);
                  }}
                  style={{ backgroundColor: color.hex }}
                  className={`w-8 h-8 rounded-full border transition-all transform active:scale-90 ${
                    !isCustomColor && selectedColor.name === color.name
                      ? 'border-[#8c5349] scale-110 shadow-sm ring-2 ring-[#a3685e]/30'
                      : 'border-black/10 shadow-2xs hover:scale-105'
                  }`}
                />
              ))}

              {/* COLOR PERSONALIZADO */}
              <div className="relative group">
                <input
                  type="color"
                  value={selectedColor.hex}
                  onChange={(e) => {
                    setIsCustomColor(true);
                    setSelectedColor(createCustomColorState(e.target.value));
                  }}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer z-20"
                />

                <div
                  className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                    isCustomColor ? 'border-[#8c5349] bg-white' : 'border-[#a3685e]/50 bg-white/50'
                  }`}
                >
                  <span className="text-xs">🎨</span>
                </div>
              </div>
            </div>
          </div>

          {/* AROMA */}
          <div>
            <label className="block text-xs font-bold text-[#4a3531] uppercase tracking-wider font-[var(--font-cinzel)] mb-2">
              2. Selecciona la esencia / aroma:
            </label>

            <select
              value={selectedAroma}
              onChange={(e) => setSelectedAroma(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-white border border-[#e2d0cb] text-[#4a3531] focus:outline-none focus:ring-2 focus:ring-[#a3685e]/30 shadow-2xs cursor-pointer transition-all"
            >
              {aromasList.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* CONTROL DE CANTIDAD + GUARDAR */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          {/* CONTROL DE CANTIDAD */}
          <div className="flex items-center border border-[#e2d0cb] rounded-xl bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className="px-3 py-2 text-xs font-bold text-[#4a3531] hover:bg-[#fcf5f3] transition-colors"
            >
              -
            </button>

            <span className="px-3 py-2 text-xs font-bold min-w-[32px] text-center text-[#4a3531]">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity((prev) => prev + 1)}
              className="px-3 py-2 text-xs font-bold text-[#4a3531] hover:bg-[#fcf5f3] transition-colors"
            >
              +
            </button>
          </div>

          {/* GUARDAR CONFIGURACIÓN */}
          <button
            type="button"
            onClick={handleSaveConfiguration}
            className="flex-1 bg-[#F5EEF8] hover:bg-[#EAE0F2] text-[#4A3531] border-2 border-[#9E6B65] hover:border-[#865651] text-xs font-bold py-3 px-4 rounded-full font-[var(--font-cinzel)] tracking-wider transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.98]"
          >
            + Guardar esta configuración
          </button>
        </div>
      </div>

      {/* MENSAJE DE GUARDADO */}
      {savedMessage && (
        <p className="text-center text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium animate-in fade-in">
          ✓ Configuración guardada correctamente en tu lista.
        </p>
      )}

      {/* LISTA DE CONFIGURACIONES */}
      {customizations.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#f0e4e1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-[var(--font-cinzel)] text-sm font-bold text-[#4a3531] uppercase tracking-wider">
              CONFIGURACIONES DE TUS FAVORITOS ({customizations.length}):
            </h3>

            <button
              onClick={handleClearAll}
              className="text-xs bg-[#F5EEF8] hover:bg-[#EAE0F2] text-[#4A3531] border-2 border-[#9E6B65] hover:border-[#865651] px-4 py-2 rounded-full font-[var(--font-cinzel)] font-bold tracking-wider transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.98]"
            >
              ( - ) Borrar todo y limpiar lista
            </button>
          </div>

          <div className="bg-[#FAF5F7]/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#E8DCE2] shadow-xs space-y-6 font-[var(--font-montserrat)] text-[#4a3531]">
            <div className="flex items-center justify-between border-b border-[#E8DCE2]/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#4a3531] font-[var(--font-cinzel)]">
                  Mi pedido
                </h3>
              </div>
            </div>

            {/* TABLA */}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#E8DCE2] text-[#8c5349] uppercase font-[var(--font-cinzel)] tracking-wider">
                    <th className="py-2.5 px-3 font-bold text-left">Artículo</th>
                    <th className="py-2.5 px-3 font-bold">Color</th>
                    <th className="py-2.5 px-3 font-bold">Aroma</th>
                    <th className="py-2.5 px-3 font-bold">Precio Unidad</th>
                    <th className="py-2.5 px-3 font-bold text-center">Cantidad</th>
                    <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E8DCE2]/50">
                  {customizations.map((item) => (
                    <tr key={item.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#4a3531] text-left">
                        {item.productName}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#5c423d]">
                        {item.color}
                      </td>

                      <td className="py-3 px-3 font-medium text-[#5c423d]">
                        {item.aroma}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#4a3531]">
                        ${item.unitPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center bg-white border border-[#E8DCE2] rounded-lg px-2 py-1 gap-2 font-bold text-[#4a3531] shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, -1)}
                            className="hover:text-[#a3685e] transition-colors"
                          >
                            -
                          </button>

                          <span>{item.quantity} pz</span>

                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, 1)}
                            className="hover:text-[#a3685e] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#8c5349] font-[var(--font-cinzel)] text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span>${item.total.toFixed(2)} MXN</span>

                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, -item.quantity)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all shadow-2xs cursor-pointer active:scale-95 font-[var(--font-montserrat)]"
                          >
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN INFERIOR CON FRASE Y TOTAL */}
      <div className="pt-4 border-t border-[#E8DCE2]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* FRASE */}
          <p
            className="text-xs italic text-[#705651] font-medium md:max-w-[50%] leading-relaxed"
            style={{ textAlign: 'justify' }}
          >
            * Hecho a mano, con amor, solo para ti. Elegiste cada color y aroma con mucho cariño.
            Ahora nos toca a nosotros crearlas. En E-Aura cada vela es artesanal y única, elaborada
            una por una. Por ser artesanales, el tono puede variar ligeramente, lo que hace a tu pieza
            aún más especial. Gracias por confiar tu celebración en nosotros.
          </p>

          {/* TOTAL */}
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="bg-white/90 border border-[#E8DCE2] px-5 py-2.5 rounded-xl shadow-2xs text-right w-full sm:w-auto min-w-[240px]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8c5349] font-[var(--font-cinzel)]">
                Total Acumulado ({totalPiecesCount} pzas)
              </span>

              <span className="text-xl md:text-2xl font-bold text-[#4a3531] tracking-tight font-[var(--font-cinzel)]">
                ${totalAmountSum.toFixed(2)} <span className="text-xs font-semibold text-[#8c5349]">MXN</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20bd5a] hover:to-[#0e7569] text-white text-xs font-bold py-2.5 px-5 rounded-xl font-[var(--font-cinzel)] tracking-wider transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>💬</span> Confirmar y Enviar Pedido por WhatsApp
            </button>
          </div>
        </div>
      </div>
      {/* MODAL DE DATOS DEL CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#e8d5d1] shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#8c5349] hover:text-[#4a3531] font-bold text-sm p-1"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="text-2xl">🕯️</span>
              <h3 className="font-[var(--font-cinzel)] text-lg font-bold text-[#4a3531]">
                Datos de Contacto
              </h3>
              <p className="text-xs text-[#705651]">
                Por favor ingresa tus datos para personalizar el envío de tu pedido.
              </p>
            </div>

            <form onSubmit={handleSendWhatsApp} className="space-y-4 text-xs font-[var(--font-montserrat)]">
              <div>
                <label className="block text-[11px] font-bold text-[#4a3531] uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María González"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF5F7] border border-[#e2d0cb] text-[#4a3531] focus:outline-none focus:ring-2 focus:ring-[#a3685e]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a3531] uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 55 1234 5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF5F7] border border-[#e2d0cb] text-[#4a3531] focus:outline-none focus:ring-2 focus:ring-[#a3685e]/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4a3531] uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF5F7] border border-[#e2d0cb] text-[#4a3531] focus:outline-none focus:ring-2 focus:ring-[#a3685e]/40"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold py-3 px-4 rounded-xl font-[var(--font-cinzel)] tracking-wider transition-all shadow-md hover:shadow-lg active:scale-[0.98] text-xs"
                >
                  Enviar Cotización a WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full bg-white text-[#8c5349] border border-[#e2d0cb] hover:bg-[#FAF5F7] font-bold py-2.5 px-4 rounded-xl font-[var(--font-cinzel)] transition-all text-xs"
                >
                  🖨️ Imprimir / Guardar Nota en PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PLANTILLA DE IMPRESIÓN */}
      <div className="hidden print:block font-[var(--font-montserrat)] text-[#4a3531] p-8 max-w-4xl mx-auto relative min-h-screen">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-repeat -z-10"
          style={{ backgroundImage: "url('/bg-texture.png')" }}
        />

        {/* ENCABEZADO */}
        <div className="border-b-2 border-[#8c5349] pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="font-[var(--font-cinzel)] text-2xl font-bold text-[#8c5349]">E-AURA</h1>
            <p className="text-xs uppercase tracking-widest text-[#705651]">Velas Artesanales & Recuerdos</p>
          </div>

          <div className="text-right text-xs">
            <p className="font-bold font-[var(--font-cinzel)]">NOTA DE PEDIDO</p>
            <p className="text-[#705651]">{new Date().toLocaleDateString('es-MX')}</p>
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        <div className="bg-[#FAF5F7] p-4 rounded-xl border border-[#e2d0cb] mb-6 text-xs space-y-1">
          <p className="font-bold font-[var(--font-cinzel)] text-[#8c5349] uppercase tracking-wider mb-2">
            DATOS DEL CLIENTE
          </p>

          <p><strong>Nombre:</strong> {customerName || 'No especificado'}</p>
          <p><strong>Teléfono:</strong> {customerPhone || 'No especificado'}</p>
          {customerEmail && <p><strong>Correo Electrónico:</strong> {customerEmail}</p>}
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="mb-6">
          <h2 className="font-[var(--font-cinzel)] text-sm font-bold text-[#8c5349] uppercase tracking-wider mb-3">
            DETALLE DE PRODUCTOS SELECCIONADOS
          </h2>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-[#8c5349] text-[#8c5349] font-[var(--font-cinzel)] uppercase">
                <th className="py-2 px-2">Imagen</th>
                <th className="py-2 px-2">Producto</th>
                <th className="py-2 px-2">Color</th>
                <th className="py-2 px-2">Aroma</th>
                <th className="py-2 px-2 text-center">Cant.</th>
                <th className="py-2 px-2 text-right">Precio Unid.</th>
                <th className="py-2 px-2 text-right">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e2d0cb]">
              {customizations.map((item) => (
                <tr key={item.id} className="align-middle">
                  <td className="py-3 px-2">
                    <div className="w-18 h-18 relative border border-[#e2d0cb] rounded-lg overflow-hidden bg-white shadow-xs">
                      <Image
                        src={item.maskImageUrl || item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </td>

                  <td className="py-3 px-2 font-bold">{item.productName}</td>
                  <td className="py-3 px-2">{item.color}</td>
                  <td className="py-3 px-2">{item.aroma}</td>
                  <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 px-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right font-bold">${item.total.toFixed(2)} MXN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTAL */}
        <div className="flex justify-end pt-4 border-t-2 border-[#8c5349]">
          <div className="text-right text-xs">
            <p className="font-bold font-[var(--font-cinzel)] text-[#8c5349] uppercase">
              TOTAL DE PIEZAS: {totalPiecesCount}
            </p>

            <p className="text-base font-bold font-[var(--font-cinzel)] text-[#4a3531]">
              TOTAL ACUMULADO: ${totalAmountSum.toFixed(2)} MXN
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] text-[#705651] italic border-t border-[#e2d0cb] pt-4">
          <p>* Esta nota refleja la cotización de elaboración artesanal configurada en el sitio web de E-Aura.</p>
        </div>
      </div>
  );
}

/* EXPORT DEL COMPONENTE */
export default function CustomizerPage() {
  return (
    <main
      className="min-h-screen text-[#4a3531] font-[var(--font-montserrat)] p-6 bg-cover bg-center bg-fixed print:p-0 print:bg-none"
      style={{ backgroundImage: "url('/bg-texture.png')" }}
    >
      <Suspense
        fallback={
          <div className="text-center py-20 font-[var(--font-cinzel)] text-[#a3685e]">
            Cargando...
          </div>
        }
      >
        <PersonalizerContent />
      </Suspense>
    </main>
  );
}
