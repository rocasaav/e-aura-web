'use client';

import Image from 'next/image';
import { useCart } from '@/context/CartContext';

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

  if (!isCartOpen) return null;

  // Generación dinámica del mensaje formateado para WhatsApp
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    // TODO: Reemplaza con tu número de WhatsApp real (a 10 dígitos con clave de país 52)
    const phoneNumber = '525573589465';

    let message = '¡Hola! 🕯️ Me gustaría realizar el siguiente pedido en E-Aura:\n\n';

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   • Cantidad: ${item.quantity}\n`;
      if (item.selectedAroma) {
        message += `   • Aroma: ${item.selectedAroma}\n`;
      }
      message += `   • Precio: $${item.price * item.quantity} MXN\n\n`;
    });

    message += `*Total del Pedido:* $${totalPrice} MXN\n\n`;
    message += 'Quedo a la espera de sus datos de pago e indicaciones de envío. ¡Gracias!';

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo translúcido / Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#fdfbf7] text-[#3d2b1f] font-[var(--font-montserrat)] shadow-2xl flex flex-col justify-between border-l border-[#e8ded1]">
          
          {/* Encabezado */}
          <div className="p-6 bg-white/80 border-b border-[#e8ded1] flex items-center justify-between">
            <h2 className="text-xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f]">
              Tu Carrito
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-gray-400 hover:text-[#3d2b1f] text-lg font-bold p-1 transition-all cursor-pointer"
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
                  className="mt-4 text-xs font-semibold px-4 py-2 bg-[#3d2b1f] text-white rounded-xl hover:bg-[#5a3e2b] transition-all cursor-pointer"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-white rounded-xl border border-[#e8ded1] shadow-sm items-center"
                >
                  {item.image && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#f2eae1] flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-bold text-xs text-[#3d2b1f]">{item.name}</h3>
                    {item.selectedAroma && (
                      <p className="text-[10px] text-[#7a5c29]">Aroma: {item.selectedAroma}</p>
                    )}
                    <p className="text-xs font-semibold text-[#3d2b1f] mt-1">
                      ${item.price} MXN
                    </p>

                    {/* Selector de cantidad */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-5 h-5 rounded bg-[#fdfbf7] border border-[#c9b596] flex items-center justify-center text-xs font-bold hover:bg-[#e8ded1] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-semibold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-5 h-5 rounded bg-[#fdfbf7] border border-[#c9b596] flex items-center justify-center text-xs font-bold hover:bg-[#e8ded1] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs p-1 cursor-pointer"
                    title="Eliminar producto"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Resumen y Checkout */}
          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-[#e8ded1] space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Total estimado:</span>
                <span className="text-base text-[#3d2b1f]">${totalPrice} MXN</span>
              </div>

              <button
                onClick={handleWhatsAppCheckout}
                className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-xs tracking-wide hover:bg-[#20ba5a] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
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
    </div>
  );
}