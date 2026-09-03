'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { getOrCreateSessionToken } from '../lib/session';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    totalPrice,
    clearCart,
  } = useCart();

  // Estados para el Modal de Checkout (Registro de Cliente)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCartOpen(false);
    };

    if (isCartOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  // Abrir modal de datos antes de enviar a WhatsApp
  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return;
    setIsModalOpen(true);
  };

  // Guardar en Supabase y redirigir a WhatsApp
  const handleFinalizeWhatsAppOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError('Por favor ingresa tu nombre y teléfono.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');

    try {
      const sessionToken = await getOrCreateSessionToken();

      // 1. Guardar cliente en 'customers'
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || null,
        })
        .select('id')
        .single();

      if (customerError) console.error('Error guardando cliente:', customerError.message);
      const customerId = customerData?.id || null;

      // 2. Mapear ítems del carrito para 'cart_items' (Omitiendo total_price)
      const itemsToInsert = cart.map((item: any) => ({
        session_token: sessionToken,
        customer_id: customerId,
        product_id: Number(item.id),
        product_name: item.name || 'Vela Artesanal E-Aura',
        color_name: item.colorName || 'Estándar',
        color_hex: item.colorHex || '',
        aroma_name: item.selectedAroma || 'Sin Aroma',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.price) || 0,
        total_price: Number(item.price) * Number(item.quantity),
      }));

      const { error: cartError } = await supabase.from('cart_items').insert(itemsToInsert);

      if (cartError) {
        console.error('Error al guardar carrito en BD:', cartError.message);
      }

      // 3. Generar mensaje estructurado de WhatsApp
        const phoneNumber = '525573589465';

        let message = `⭐ *Nuevo pedido de E‑Aura* ⭐\n\n`;

        message += `👤 *Cliente:* ${customerName.trim()}\n`;
        message += `📞 *Teléfono:* ${customerPhone.trim()}\n`;

        if (customerEmail.trim()) {
        message += `✉️ *Correo:* ${customerEmail.trim()}\n`;
}

message += `\n📦 *Aquí está el detalle de tu pedido:* \n`;
message += `-----------------------------------\n`;

      cart.forEach((item: any, index: number) => {
        message += `${index + 1}. *${item.name}*\n`;
        if (item.colorName) message += `   • Color: ${item.colorName}\n`;
        if (item.selectedAroma) message += `   • Aroma: ${item.selectedAroma}\n`;
        message += `   • Cantidad: ${item.quantity} pza(s)\n`;
        message += `   • Subtotal: $${(item.price * item.quantity).toFixed(2)} MXN\n\n`;
      });

      message += `-----------------------------------\n`;
      message += `💵 *Total a pagar:* $${totalPrice.toFixed(2)} MXN\n\n`;
      message += `Quedo atento a sus datos de pago y a las indicaciones para el envío. Muchas gracias.`;


      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      setIsModalOpen(false);
      setIsCartOpen(false);
      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error('Error al procesar pedido:', err);
      setCheckoutError('Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo translúcido / Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#fdfbf7] text-[#3d2b1f] font-[var(--font-montserrat)] shadow-2xl flex flex-col justify-between border-l border-[#e8ded1] animate-in slide-in-from-right duration-300">
          
          {/* Encabezado */}
          <div className="p-6 bg-white/80 border-b border-[#e8ded1] flex items-center justify-between">
            <h2 className="text-xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f]">
              Tu Carrito
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-400 hover:text-[#3d2b1f] text-lg font-bold p-1 transition-all cursor-pointer"
              aria-label="Cerrar carrito"
            >
              ✕
            </button>
          </div>

          {/* Listado de ítems */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-[#7a5c29]">
                <p className="text-sm">Tu carrito está vacío.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 text-xs font-semibold px-4 py-2 bg-[#3d2b1f] text-white rounded-xl hover:bg-[#5a3e2b] transition-all cursor-pointer font-[var(--font-cinzel)]"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
             cart.map((item: any, idx: number) => {
  const safeImage =
    item.image && typeof item.image === 'string' && item.image.trim() !== ''
      ? item.image
      : '/placeholder.png';

  return (
    <div
      key={item.cartItemId || item.id || idx}
      className="flex gap-4 p-3 bg-white rounded-xl border border-[#e8ded1] shadow-sm items-center"
    >
      {/* Imagen */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#f2eae1] flex-shrink-0 bg-[#fdfbf7]">
        <Image
          src={safeImage}
          alt={item.name || 'Producto'}
          fill
          sizes="64px"
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Información del producto */}
      <div className="flex-1">
        <h3 className="font-bold text-xs text-[#3d2b1f]">{item.name}</h3>

        {/* Detalle de Color y Aroma */}
        <div className="space-y-0.5 mt-1">
          {item.colorName && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#6b5235]">
              {item.colorHex && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner inline-block"
                  style={{ backgroundColor: item.colorHex }}
                />
              )}
              <span>Color: {item.colorName}</span>
            </div>
          )}
          {item.selectedAroma && (
            <p className="text-[10px] text-[#7a5c29]">Aroma: {item.selectedAroma}</p>
          )}
        </div>

        <p className="text-xs font-semibold text-[#3d2b1f] mt-1.5">
          ${item.price.toFixed(2)} MXN
        </p>

        {/* Selector de cantidad */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity - 1)}
            className="w-5 h-5 rounded bg-[#fdfbf7] border border-[#c9b596] flex items-center justify-center text-xs font-bold hover:bg-[#e8ded1] cursor-pointer"
            aria-label="Disminuir cantidad"
          >
            -
          </button>
          <span className="text-xs font-semibold w-4 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
            className="w-5 h-5 rounded bg-[#fdfbf7] border border-[#c9b596] flex items-center justify-center text-xs font-bold hover:bg-[#e8ded1] cursor-pointer"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      </div>

      {/* Botón eliminar */}
      <button
        onClick={() => removeFromCart(item.cartItemId || item.id)}
        className="text-rose-600 hover:text-rose-800 text-xs p-1 cursor-pointer"
        title="Eliminar producto"
        aria-label={`Eliminar ${item.name}`}
      >
        ✕
      </button>
    </div>
  );
})}


          {/* Resumen y Checkout */}
          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-[#e8ded1] space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Total estimado:</span>
                <span className="text-base text-[#3d2b1f]">${totalPrice.toFixed(2)} MXN</span>
              </div>

              <button
                onClick={handleOpenCheckoutModal}
                className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-xs tracking-wide hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98] font-[var(--font-cinzel)]"
              >
                <span>Completar Pedido por WhatsApp</span>
              </button>

              <button
                onClick={clearCart}
                className="w-full text-center text-[10px] text-gray-400 hover:text-rose-600 transition-all cursor-pointer"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DATOS DEL CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fdfbf7] border border-[#e8ded1] w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-150 text-[#3d2b1f]">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 font-bold text-base cursor-pointer"
            >
              ✕
            </button>

            <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold block mb-1">
              Confirmación de Pedido
            </span>
            <h3 className="font-[var(--font-cinzel)] text-xl font-bold text-[#2d1f15] mb-4">
              Tus Datos de Contacto
            </h3>

            <form onSubmit={handleFinalizeWhatsAppOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3d2b1f] uppercase tracking-wider mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana García"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-white border border-[#c9b596]/60 text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d2b1f] uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 5512345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-white border border-[#c9b596]/60 text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3d2b1f] uppercase tracking-wider mb-1">
                  Correo Electrónico <span className="text-stone-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-white border border-[#c9b596]/60 text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40 shadow-xs"
                />
              </div>

              {checkoutError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {checkoutError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all font-[var(--font-cinzel)] shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar e Ir a WhatsApp 💬'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}