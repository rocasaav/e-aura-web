'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from "../../lib/supabase";
import Image from 'next/image';

interface ColorItem {
  id: number;
  name: string;
  image_url?: string | null;
}

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorAdded?: () => void;
}

export default function ColorModal({ isOpen, onClose, onColorAdded }: ColorModalProps) {
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para formulario de creación/edición
  const [editingColor, setEditingColor] = useState<ColorItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Cargar lista de colores desde Supabase
  const fetchColors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) {
      setColors(data);
    } else if (error) {
      console.error('Error al cargar colores:', error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchColors();
    }
  }, [isOpen, fetchColors]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingColor(null);
    setName('');
    setFile(null);
  };

  const handleStartEdit = (color: ColorItem) => {
    setEditingColor(color);
    setIsCreating(false);
    setName(color.name);
    setFile(null);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingColor(null);
    setName('');
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = editingColor ? editingColor.image_url : null;

      // Subir nueva textura si se seleccionó un archivo
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(`colors/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(`colors/${fileName}`);

        imageUrl = publicUrlData.publicUrl;
      }

      if (isCreating) {
        // Insertar nuevo color
        const { error: insertError } = await supabase
          .from('colors')
          .insert([{ name, image_url: imageUrl }]);

        if (insertError) throw insertError;
      } else if (editingColor) {
        // Actualizar color existente
        const { error: updateError } = await supabase
          .from('colors')
          .update({ name, image_url: imageUrl })
          .eq('id', editingColor.id);

        if (updateError) throw updateError;
      }

      handleCancelForm();
      fetchColors();
      if (onColorAdded) onColorAdded();
    } catch (error: any) {
      alert(`Error al guardar el color: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteColor = async (id: number, colorName: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el color "${colorName}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    const { error } = await supabase.from('colors').delete().eq('id', id);

    if (!error) {
      setColors((prev) => prev.filter((c) => c.id !== id));
      if (onColorAdded) onColorAdded();
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FDFBF7] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 border border-[#E5D9C5] shadow-2xl relative flex flex-col justify-between">
        
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center border-b border-[#E5D9C5] pb-4 mb-5">
          <div>
            <h2 className="text-xl font-bold font-[var(--font-cinzel)] text-[#4A3E3D]">
              Configuración de Colores
            </h2>
            <p className="text-xs text-[#8C6D46] mt-0.5">
              Administra las muestras y texturas de color para las velas
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EFE6D8] hover:bg-[#E5D9C5] text-[#4A3E3D] flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Sección: Crear / Editar Color */}
        {(isCreating || editingColor) ? (
          <div className="bg-[#F8F3EA] rounded-2xl p-5 border border-[#E5D9C5] mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6D46] mb-3">
              {isCreating ? 'Agregar Nuevo Color' : `Editar Color: ${editingColor?.name}`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#4A3E3D]">
                  Nombre del Color
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Black Gray"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D5C2A5] bg-white text-[#4A3E3D] focus:outline-none focus:ring-2 focus:ring-[#8C6D46]/40"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#4A3E3D]">
                  Textura / Muestra de Color (Imagen)
                </label>
                {editingColor?.image_url && !file && (
                  <div className="flex items-center gap-3 mb-2 bg-white p-2 rounded-xl border border-[#E5D9C5]">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={editingColor.image_url}
                        alt="Textura actual"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-[11px] text-[#6E5D5A]">Textura actual registrada</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6E5D5A] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EFE6D8] file:text-[#4A3E3D] hover:file:bg-[#E5D9C5]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6E5D5A] hover:bg-[#EFE6D8] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#4A3E3D] text-white hover:bg-[#382E2D] transition disabled:opacity-50"
                >
                  {uploading ? 'Guardando...' : isCreating ? 'Guardar Color' : 'Actualizar Color'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-6 flex justify-between items-center">
            <span className="text-xs font-bold text-[#4A3E3D]">
              Colores Registrados ({colors.length})
            </span>
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-4 py-2 bg-[#8C6D46] hover:bg-[#785b37] text-white text-xs font-semibold rounded-full shadow-sm transition"
            >
              + Agregar Color
            </button>
          </div>
        )}

        {/* Lista de Colores Registrados */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-center text-xs text-[#8C6D46] py-6">Cargando colores...</p>
          ) : colors.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6 bg-white/60 rounded-xl border border-dashed border-[#E5D9C5]">
              No hay colores registrados aún.
            </p>
          ) : (
            colors.map((color) => (
              <div
                key={color.id}
                className="bg-white rounded-2xl p-3 border border-[#E5D9C5] flex justify-between items-center shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#F8F3EA] border border-[#E5D9C5] flex items-center justify-center shrink-0">
                    {color.image_url ? (
                      <Image
                        src={color.image_url}
                        alt={color.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-[#8C6D46]">S/I</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#4A3E3D]">{color.name}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartEdit(color)}
                    className="px-3 py-1.5 bg-[#EFE6D8] hover:bg-[#E5D9C5] text-[#4A3E3D] text-[11px] font-semibold rounded-lg transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteColor(color.id, color.name)}
                    disabled={deletingId === color.id}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {deletingId === color.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pie del Modal */}
        <div className="border-t border-[#E5D9C5] pt-4 mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#4A3E3D] hover:bg-[#382E2D] text-white text-xs font-semibold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}