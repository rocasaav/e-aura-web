import React, { useState } from 'react';

export default function CandleCustomizer({ onClose, onSave }) {
  // Estados para las diferentes opciones personalizables de la vela
  const [color, setColor] = useState('#FDFBF7');
  const [aroma, setAroma] = useState('Vainilla');
  const [label, setLabel] = useState('Mi Vela Especial');

  const handleSave = () => {
    if (onSave) {
      onSave({ color, aroma, label });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[28px] max-w-[380px] w-full p-5 shadow-[0_20px_60px_rgba(0,0,0,0.07)] relative">
        {/* Botón de Cierre */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-black/40 hover:text-black text-sm"
          >
            ✕
          </button>
        )}

        <h2 className="text-[16px] font-medium tracking-[0.04em] text-center mb-8 uppercase">
          Configura tu Vela
        </h2>

        {/* Visualizador de la Vela */}
        <div className="relative flex justify-center mb-10 overflow-visible">
          <div className="relative w-32 h-44 rounded-b-2xl border border-black/10 flex flex-col items-center justify-center transition-all duration-200" style={{ backgroundColor: color }}>
            {/* Mecha de la vela */}
            <div className="w-1.5 h-5 bg-black/20 absolute -top-5 rounded-full" />
            
            {/* Etiqueta editable de la vela */}
            <div className="bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded border border-black/10 text-[11px] max-w-[100px] text-center font-sans tracking-[0.12em] uppercase truncate">
              {label || 'Tu Texto'}
            </div>
          </div>
        </div>

        {/* Controles de Configuración */}
        <div className="flex flex-col gap-5">
          {/* Opción 1: Color */}
          <div>
            <label className="text-[11px] tracking-[0.14em] uppercase text-black/60 mb-1.5 block">
              Color de cera
            </label>
            <div className="flex gap-1.5">
              {['#FDFBF7', '#E5D3C3', '#D3E5C3', '#C3DDFE', '#FEE2E2'].map((itemColor) => (
                <button
                  key={itemColor}
                  onClick={() => setColor(itemColor)}
                  style={{ backgroundColor: itemColor }}
                  className={`w-9 h-9 rounded-full border transition-all ${
                    color === itemColor ? 'ring-1 ring-black ring-offset-2 ring-offset-white' : 'border-black/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Opción 2: Aroma */}
          <div>
            <label className="text-[11px] tracking-[0.14em] uppercase text-black/60 mb-1.5 block">
              Aroma
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Vainilla', 'Lavanda', 'Sándalo', 'Canela'].map((itemAroma) => (
                <button
                  key={itemAroma}
                  onClick={() => setAroma(itemAroma)}
                  className={`px-3 py-1.5 rounded-full text-[13px] border transition-colors ${
                    aroma === itemAroma
                      ? 'border-black bg-black text-white'
                      : 'border-black/10 hover:border-black/30'
                  }`}
                >
                  {itemAroma}
                </button>
              ))}
            </div>
          </div>

          {/* Opción 3: Etiqueta */}
          <div>
            <label className="text-[11px] tracking-[0.14em] uppercase text-black/60 mb-1.5 block">
              Texto en Etiqueta
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 border border-black/10 rounded-lg text-[13px] outline-none focus:border-black transition-colors"
              placeholder="Escribe tu mensaje..."
            />
          </div>

          {/* Botón Guardar */}
          <button
            onClick={handleSave}
            className="w-full bg-black text-white py-3 rounded-full text-[13px] uppercase tracking-[0.12em] font-medium hover:scale-[1.05] transition-all"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}