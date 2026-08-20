'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function LayerEditorPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Capas y colores
  const [selectedColor, setSelectedColor] = useState<string>('#F4C2C2');
  const [activeLayer, setActiveLayer] = useState<'all' | 'duck1' | 'duck2'>('all');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // 1. Manejar la carga de imagen y quitar fondo en el navegador (100% Gratis)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage('Removiendo fondo de la imagen...');

    try {
      // Importación dinámica de la librería open-source para evitar problemas de SSR
      const { removeBackground } = await import('@imgly/background-removal');

      // Procesar imagen y remover fondo
      const blob = await removeBackground(file);
      const transparentUrl = URL.createObjectURL(blob);

      // Convertir a escala de grises (blanco/gris neutro) mediante Canvas temporal
      setStatusMessage('Convirtiendo producto a tono neutro (escala de grises)...');
      const desaturatedUrl = await convertToGrayscale(transparentUrl);

      // Liberar objeto URL temporal
      URL.revokeObjectURL(transparentUrl);

      setImageSrc(desaturatedUrl);
      setStatusMessage('');
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      setStatusMessage('Ocurrió un error al procesar la imagen. Intenta con otra.');
    } finally {
      setLoading(false);
    }
  };

  // Convertir imagen a Escala de Grises manteniendo transparencia
  const convertToGrayscale = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            // Si no es transparente
            if (data[i + 3] > 0) {
              const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
              // Aumentar ligeramente el brillo para que la cera se vea clara
              const brightAvg = Math.min(255, avg * 1.2 + 20);
              data[i] = brightAvg;     // R
              data[i + 1] = brightAvg; // G
              data[i + 2] = brightAvg; // B
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        }
      };
    });
  };

  // Redibujar Canvas con el tinte de color aplicado
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.src = imageSrc;
    imgElementRef.current = img;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dibujar imagen base en escala de grises
      ctx.drawImage(img, 0, 0);

      // Dibujar capa de color sobre la figura con modo 'multiply'
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = selectedColor;

      if (activeLayer === 'all') {
        // Pintar toda la figura recortada
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (activeLayer === 'duck1') {
        // Ejemplo de Máscara/Capa para la figura Superior Izquierda
        ctx.beginPath();
        ctx.ellipse(
          canvas.width * 0.35,
          canvas.height * 0.38,
          canvas.width * 0.28,
          canvas.height * 0.28,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      } else if (activeLayer === 'duck2') {
        // Ejemplo de Máscara/Capa para la figura Inferior Derecha
        ctx.beginPath();
        ctx.ellipse(
          canvas.width * 0.62,
          canvas.height * 0.65,
          canvas.width * 0.28,
          canvas.height * 0.28,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      ctx.restore();

      // Recortar con la silueta original de la imagen (destination-in) para preservar transparencia
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };
  }, [imageSrc, selectedColor, activeLayer]);

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#3d2b1f] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[#e8ded1]">
          <div>
            <h1 className="text-xl font-bold">Módulo Experimental: Editor de Capas y Quita-Fondo</h1>
            <p className="text-xs text-gray-500 mt-1">
              Prueba técnica para entintar figuras independientes con fondo transparente.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] transition-all"
          >
            ← Volver
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Columna Izquierda: Vista del Canvas */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm flex flex-col items-center justify-center min-h-[350px]">
            {loading ? (
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#3d2b1f] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-medium text-[#7a5c29]">{statusMessage}</p>
              </div>
            ) : imageSrc ? (
              <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] rounded-xl border border-gray-200 overflow-hidden">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center">
                Sube una imagen (ej. los dos patitos) para iniciar la prueba.
              </p>
            )}
          </div>

          {/* Columna Derecha: Panel de Administración y Selección */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm space-y-6">
            {/* 1. Subir Imagen */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#3d2b1f]">
                1. Subir Foto del Producto (Cualquier Fondo):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f4efe8] file:text-[#3d2b1f] hover:file:bg-[#e8ded1] cursor-pointer disabled:opacity-50"
              />
            </div>

            {imageSrc && (
              <>
                {/* 2. Selección de Capa / Figura */}
                <div>
                  <label className="block text-xs font-bold mb-2 text-[#3d2b1f]">
                    2. Seleccionar Capa / Figura a Entintar:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveLayer('all')}
                      className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
                        activeLayer === 'all'
                          ? 'bg-[#3d2b1f] text-white border-[#3d2b1f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#c9b596]'
                      }`}
                    >
                      Todas las Piezas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLayer('duck1')}
                      className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
                        activeLayer === 'duck1'
                          ? 'bg-[#3d2b1f] text-white border-[#3d2b1f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#c9b596]'
                      }`}
                    >
                      Pato 1 (Superior)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLayer('duck2')}
                      className={`py-2 px-3 text-xs rounded-xl font-medium border transition-all ${
                        activeLayer === 'duck2'
                          ? 'bg-[#3d2b1f] text-white border-[#3d2b1f]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#c9b596]'
                      }`}
                    >
                      Pato 2 (Inferior)
                    </button>
                  </div>
                </div>

                {/* 3. Selección de Color */}
                <div>
                  <label className="block text-xs font-bold mb-2 text-[#3d2b1f]">
                    3. Elegir Color de Cera:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-gray-600">
                      {selectedColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}