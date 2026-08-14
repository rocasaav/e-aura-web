'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  wax_type: string;
  aroma: string;
  dimensions: string;
  image_url: string;
  images?: string[];
  is_available: boolean;
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    wax_type: '',
    aroma: '',
    dimensions: '',
    category_id: '',
    image_url: '',
    images: [] as string[],
    is_available: true,
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  async function checkAuthAndFetch() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/admin/login';
      return;
    }
    fetchAdminData();
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  async function fetchAdminData() {
    setLoading(true);
    try {
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });
      if (prodData) setProducts(prodData);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }

  // Carga de imágenes múltiples a Supabase Storage
  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newUploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        newUploadedUrls.push(publicUrlData.publicUrl);
      }

      setFormData((prev) => {
        const updatedImages = [...prev.images, ...newUploadedUrls];
        return {
          ...prev,
          images: updatedImages,
          image_url: updatedImages[0] || prev.image_url, // Asigna la primera como principal
        };
      });
    } catch (err) {
      alert('Error al subir una o más imágenes a Supabase Storage');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Eliminar una imagen de la lista en el formulario
  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const updatedImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updatedImages,
        image_url: updatedImages[0] || '',
      };
    });
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      wax_type: '',
      aroma: '',
      dimensions: '',
      category_id: categories[0]?.id.toString() || '',
      image_url: '',
      images: [],
      is_available: true,
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    // Si product.images existe y tiene elementos los usa; si no, toma product.image_url como array inicial
    const existingImages =
      product.images && product.images.length > 0
        ? product.images
        : product.image_url
        ? [product.image_url]
        : [];

    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ? product.price.toString() : '',
      wax_type: product.wax_type || '',
      aroma: product.aroma || '',
      dimensions: product.dimensions || '',
      category_id: product.category_id ? product.category_id.toString() : '',
      image_url: product.image_url || '',
      images: existingImages,
      is_available: product.is_available ?? true,
    });
    setIsModalOpen(true);
  };

  // Guardar (Insertar o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('El nombre y el precio son obligatorios.');
      return;
    }

    const generateSlug = (text: string) => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const mainImageUrl = formData.images[0] || formData.image_url || '/bg-texture.png';

    const payload = {
      name: formData.name,
      slug: generateSlug(formData.name),
      description: formData.description,
      price: parseFloat(formData.price),
      wax_type: formData.wax_type,
      aroma: formData.aroma,
      dimensions: formData.dimensions,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      image_url: mainImageUrl,
      images: formData.images,
      is_available: formData.is_available,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (error) {
        alert('Error al actualizar el producto');
        console.error(error);
      } else {
        setIsModalOpen(false);
        fetchAdminData();
      }
    } else {
      const { error } = await supabase.from('products').insert([payload]);

      if (error) {
        alert('Error al crear el producto');
        console.error(error);
      } else {
        setIsModalOpen(false);
        fetchAdminData();
      }
    }
  };

  // Eliminar producto
  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar el producto');
        console.error(error);
      } else {
        fetchAdminData();
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#fdfbf7] text-[#4a3b2c] p-4 md:p-8 font-[var(--font-montserrat)]">
      <div className="max-w-6xl mx-auto">
        
        {/* ENCABEZADO DEL PANEL */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#e8ded1] shadow-sm mb-6">
          <div>
            <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold">
              Panel de Control
            </span>
            <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f]">
              Administrador de Productos
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="text-xs px-4 py-2 rounded-xl border border-[#c9b596] text-[#5c4a38] hover:bg-white transition-all font-semibold"
            >
              ← Ver Tienda
            </Link>
            <button
              onClick={handleOpenCreate}
              className="text-xs px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] transition-all font-semibold shadow-sm"
            >
              + Agregar Producto
            </button>
            
            <button
              onClick={handleLogout}
              className="text-xs px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-all font-semibold"
              >
                Cerrar Sesión
            </button>

          </div>
        </header>

        {/* TABLA DE PRODUCTOS */}
        <section className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#e8ded1] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-[var(--font-cinzel)] text-[#7a5c29] animate-pulse">
              Cargando productos de Supabase...
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6b5235]">
              No hay productos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f5efe6] font-[var(--font-cinzel)] text-[#3d2b1f] border-b border-[#e8ded1]">
                    <th className="p-4">Imagen</th>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4">Aroma</th>
                    <th className="p-4">Cera</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8ded1]">
                  {products.map((product) => {
                    const totalImages = product.images?.length || (product.image_url ? 1 : 0);
                    return (
                      <tr key={product.id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4">
                          <div className="relative w-12 h-12 rounded-lg border border-[#e8ded1] overflow-hidden bg-[#fdfbf7]">
                            <Image
                              src={product.image_url || '/bg-texture.png'}
                              alt={product.name}
                              fill
                              className="object-contain"
                            />
                            {totalImages > 1 && (
                              <span className="absolute bottom-0 right-0 bg-[#3d2b1f] text-white text-[9px] px-1 rounded-tl-md font-bold">
                                +{totalImages}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-[#2d1f15]">{product.name}</td>
                        <td className="p-4 font-bold">${product.price.toFixed(2)} MXN</td>
                        <td className="p-4">{product.aroma || '-'}</td>
                        <td className="p-4">{product.wax_type || '-'}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              product.is_available
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {product.is_available ? 'Disponible' : 'Agotado'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(product)}
                              className="px-3 py-1 rounded-lg bg-[#7a5c29]/10 text-[#7a5c29] hover:bg-[#7a5c29]/20 font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* MODAL CREAR / EDITAR */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#fdfbf7] border border-[#e8ded1] w-full max-w-lg rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="font-[var(--font-cinzel)] font-bold text-lg text-[#3d2b1f] mb-4">
                {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-[#3d2b1f]">Nombre del producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#3d2b1f]">Precio ($ MXN) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#3d2b1f]">Categoría</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#3d2b1f]">Descripción</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-[#3d2b1f]">Cera</label>
                    <input
                      type="text"
                      placeholder="Ej: Soya"
                      value={formData.wax_type}
                      onChange={(e) => setFormData({ ...formData, wax_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#3d2b1f]">Aroma</label>
                    <input
                      type="text"
                      placeholder="Ej: Vainilla"
                      value={formData.aroma}
                      onChange={(e) => setFormData({ ...formData, aroma: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-[#3d2b1f]">Medidas</label>
                    <input
                      type="text"
                      placeholder="Ej: 8 x 8 cm"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                    />
                  </div>
                </div>

                {/* GALERÍA E IMÁGENES MÚLTIPLES */}
                <div>
                  <label className="block font-semibold mb-1 text-[#3d2b1f]">
                    Imágenes del Producto (Puedes seleccionar varias)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleImagesUpload}
                    disabled={uploadingImage}
                    className="w-full text-xs text-[#5c4a38] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#3d2b1f] file:text-white hover:file:bg-[#5a3e2b] cursor-pointer"
                  />

                  {uploadingImage && (
                    <p className="text-[11px] text-[#7a5c29] mt-2 animate-pulse">
                      Subiendo imagen(es) a Supabase Storage...
                    </p>
                  )}

                  {/* VISTA PREVIA DE MINIATURAS */}
                  {formData.images.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold text-[#5c4a38] mb-1">
                        Fotos cargadas ({formData.images.length}):
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {formData.images.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative group w-full h-16 rounded-lg border border-[#c9b596] overflow-hidden bg-white"
                          >
                            <Image
                              src={url}
                              alt={`Imagen ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                            {/* Insignia para la imagen principal */}
                            {idx === 0 && (
                              <span className="absolute top-0 left-0 bg-[#7a5c29] text-white text-[8px] px-1 rounded-br font-bold">
                                Principal
                              </span>
                            )}
                            {/* Botón para quitar imagen */}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-0.5 right-0.5 bg-rose-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-80 hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="rounded text-[#3d2b1f] focus:ring-[#7a5c29]"
                  />
                  <label htmlFor="is_available" className="font-semibold text-[#3d2b1f]">
                    Producto disponible en el catálogo
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#e8ded1]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#c9b596] text-[#5c4a38] hover:bg-white font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingImage}
                    className="px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] font-semibold disabled:opacity-50"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}