'use client';

import { useState } from 'react';

const PALETTE_PRESETS = [
  { name: 'Blanco / Crema', hex: '#fdfbf7' },
  { name: 'Rosa Pastel', hex: '#f4c2c2' },
  { name: 'Azul Celeste', hex: '#aec6cf' },
  { name: 'Verde Menta', hex: '#b2e2d4' },
  { name: 'Lavanda', hex: '#cb99c9' },
  { name: 'Amarillo Cera', hex: '#fdfd96' },
  { name: 'Terracota', hex: '#e07a5f' },
  { name: 'Rojo Carmín', hex: '#d62828' },
  { name: 'Negro Azabache', hex: '#2b2d42' },
];

export default function TestColorPage() {
  const [layer1Color, setLayer1Color] = useState('#f4c2c2');
  const [layer2Color, setLayer2Color] = useState('#aec6cf');
  const [layer3Color, setLayer3Color] = useState('#cb99c9');
  const [selectedAroma, setSelectedAroma] = useState('Vainilla');

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 mb-2 text-center">
          🧪 Prueba de Concepto: Paleta y Selector de Color Personalizado
        </h1>
        <p className="text-xs text-gray-500 mb-6 text-center">
          Usa los botones rápidos o abre el selector de color libre para elegir cualquier tono (HEX / RGB).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* VISOR VELA */}
          <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
            <svg
              width="180"
              height="260"
              viewBox="0 0 200 280"
              className="drop-shadow-md transition-all duration-300"
            >
              <path d="M100,15 C105,30 115,40 100,55 C85,40 95,30 100,15 Z" fill="#ffb703" className="animate-pulse" />
              <path d="M100,25 C102,35 108,40 100,50 C92,40 98,35 100,25 Z" fill="#fb8500" />
              <rect x="98" y="55" width="4" height="15" fill="#333" />

              {/* Capa 1 */}
              <path d="M50,70 L150,70 L150,110 L50,110 Z" fill={layer1Color} stroke="#d1d5db" strokeWidth="1" className="transition-colors duration-300" />
              <text x="100" y="94" fill="#555" fontSize="10" textAnchor="middle" className="select-none pointer-events-none">Capa 1</text>

              {/* Capa 2 */}
              <path d="M50,110 L150,110 L150,160 L50,160 Z" fill={layer2Color} stroke="#d1d5db" strokeWidth="1" className="transition-colors duration-300" />
              <text x="100" y="139" fill="#555" fontSize="10" textAnchor="middle" className="select-none pointer-events-none">Capa 2</text>

              {/* Capa 3 */}
              <path d="M50,160 L150,160 L150,220 L50,220 Z" fill={layer3Color} stroke="#d1d5db" strokeWidth="1" className="transition-colors duration-300" />
              <text x="100" y="194" fill="#555" fontSize="10" textAnchor="middle" className="select-none pointer-events-none">Capa 3</text>

              <ellipse cx="100" cy="223" rx="60" ry="8" fill="#e5e7eb" stroke="#9ca3af" />
            </svg>

            <span className="text-[11px] text-gray-400 mt-2">
              Aroma seleccionado: <strong className="text-gray-700">{selectedAroma}</strong>
            </span>
          </div>

          {/* CONTROLES */}
          <div className="space-y-5">
            
            {/* Control Capa 1 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Capa 1 (Superior):</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-500">{layer1Color}</span>
                  <input
                    type="color"
                    value={layer1Color}
                    onChange={(e) => setLayer1Color(e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    title="Abrir paleta personalizada"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {PALETTE_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setLayer1Color(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border ${layer1Color === c.hex ? 'ring-2 ring-black scale-110' : 'border-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            {/* Control Capa 2 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Capa 2 (Media):</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-500">{layer2Color}</span>
                  <input
                    type="color"
                    value={layer2Color}
                    onChange={(e) => setLayer2Color(e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    title="Abrir paleta personalizada"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {PALETTE_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setLayer2Color(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border ${layer2Color === c.hex ? 'ring-2 ring-black scale-110' : 'border-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            {/* Control Capa 3 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Capa 3 (Inferior):</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-gray-500">{layer3Color}</span>
                  <input
                    type="color"
                    value={layer3Color}
                    onChange={(e) => setLayer3Color(e.target.value)}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    title="Abrir paleta personalizada"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {PALETTE_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setLayer3Color(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={`w-5 h-5 rounded-full border ${layer3Color === c.hex ? 'ring-2 ring-black scale-110' : 'border-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            {/* Selector Aroma */}
            <div className="pt-2 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-1">Aroma:</label>
              <select
                value={selectedAroma}
                onChange={(e) => setSelectedAroma(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
              >
                <option value="Vainilla">Vainilla Suave</option>
                <option value="Lavanda">Lavanda Relajante</option>
                <option value="Canela y Manzana">Canela & Manzana</option>
              </select>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}