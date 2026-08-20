'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import ColorModal from './ColorModal';

interface Product {
  id: number;
  name: string;
  slug: string;
  commentary?: string;
  price: number;
  dimensions?: string;
  images: string[];
  categories?: string[];
  mask_image_url?: string | null;
}

const CATEGORIES_LIST = [
  'Todas',
  '3 años',
  'Aniversario Luctuoso',
  'Baby Shower',
  'Bautizo',
  'Boda',
  'Celebración 50 años',
  'Día de la Candelaría',
  'Día de la primavera',
  'Día de las madres',
  'Día de muertos',
  'Día del niño',
  'Día del padre',
  'Festividades patrias de México',
  'Graduación',
  'Halloween',
  'Inauguración',
  'Navidad',
  'Primera comunión',
  'Profesiones',
  'Religioso',
  'Revelación de género',
  'XV años',
];

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [selectedMaskUrl, setSelectedMaskUrl] = useState<string | null>(null);

  // Estado para controlar la apertura del modal de administración de colores
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          categories (
            name
          )
        )
      `)
      .order('id', { ascending: true });

    if (!error && data) {
      const formattedProducts: Product[] = data.map((item: any) => {
        const catNames = item.product_categories
          ? item.product_categories
              .map((pc: any) => pc.categories?.name)
              .filter(Boolean)
          : [];

        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          commentary: item.commentary,
          price: item.price,
          dimensions: item.dimensions,
          images: item.images || [],
          mask_image_url: item.mask_image_url,
          categories: catNames,
        };
      });

      setProducts(formattedProducts);
    } else if (error) {
      console.error('Error al cargar productos:', error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_categories' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  const filteredProducts =
    selectedCategory === 'Todas'
      ? products
      : products.filter((p) => p.categories?.includes(selectedCategory));

  const handleEditClick = (product: Product) => {
    setIsCreating(false);
    setEditingProduct(product);
    setNewImages(product.images || []);
    setSelectedMaskUrl(product.mask_image_url || null);
  };

  const handleCreateNewClick = () => {
    setIsCreating(true);
    setEditingProduct({
      id: 0,
      name: '',
      slug: '',
      commentary: '',
      price: 0,
      dimensions: '',
      images: [],
      categories: [],
      mask_image_url: null,
    });
    setNewImages([]);
    setSelectedMaskUrl(null);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsCreating(false);
    setNewImages([]);
    setSelectedMaskUrl(null);
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el producto "${name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(`Error al eliminar: ${error.message}`);
    }
    setDeletingId(null);
  };

  const handleCategoryToggle = (cat: string) => {
    if (!editingProduct) return;
    const currentCats = editingProduct.categories || [];
    const updated = currentCats.includes(cat)
      ? currentCats.filter((c) => c !== cat)
      : [...currentCats, cat];

    setEditingProduct({ ...editingProduct, categories: updated });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingProduct) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const sanitizedBaseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}_${sanitizedBaseName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      } else {
        console.error('Error subiendo imagen a Supabase Storage:', uploadError.message);
        alert(`Error al subir ${file.name}: Verifica los permisos o el bucket.`);
      }
    }

    if (uploadedUrls.length > 0) {
      const updatedList = [...newImages, ...uploadedUrls];
      setNewImages(updatedList);

      setEditingProduct({
        ...editingProduct,
        images: updatedList,
      });
    }

    setUploading(false);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (!editingProduct) return;
    const urlToRemove = newImages[indexToRemove];
    const updated = newImages.filter((_, idx) => idx !== indexToRemove);

    setNewImages(updated);
    setEditingProduct({
      ...editingProduct,
      images: updated,
    });

    if (selectedMaskUrl === urlToRemove) {
      setSelectedMaskUrl(null);
    }
  };

  const handleToggleMaskImage = (url: string) => {
    setSelectedMaskUrl((prev) => (prev === url ? null : url));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSaving(true);

    const generatedSlug = editingProduct.slug
      ? editingProduct.slug
      : editingProduct.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');

    const payload = {
      name: editingProduct.name,
      slug: generatedSlug,
      dimensions: editingProduct.dimensions,
      price: editingProduct.price,
      commentary: editingProduct.commentary,
      images: newImages,
      mask_image_url: selectedMaskUrl,
    };

    let productId = editingProduct.id;
    let saveError = null;

    if (isCreating) {
      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select('id')
        .single();

      saveError = error;
      if (data) {
        productId = data.id;
      }
    } else {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      saveError = error;
    }

    if (!saveError && productId) {
      const selectedCatNames = editingProduct.categories || [];

      // Borrar relaciones existentes para este producto
      await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      if (selectedCatNames.length > 0) {
        // Consultar los IDs correspondientes en la tabla categories
        const { data: catData, error: catFetchError } = await supabase
          .from('categories')
          .select('id, name')
          .in('name', selectedCatNames);

        if (!catFetchError && catData && catData.length > 0) {
          const categoryRows = catData.map((cat) => ({
            product_id: productId,
            category_id: cat.id,
          }));

          const { error: insertCatError } = await supabase
            .from('product_categories')
            .insert(categoryRows);

          if (insertCatError) {
            console.error('Error insertando product_categories:', insertCatError.message);
          }
        }
      }

      await fetchProducts();
      handleCloseModal();
    } else {
      alert(`Error al guardar en Supabase: ${saveError?.message}`);
    }

    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-[url('/bg-texture.png')] bg-cover bg-center bg-fixed p-4 md:p-8 font-[var(--font-montserrat)] text-[#3d2b1f]">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-[#f8f5f0]/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#e8ded1] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-[#7a5c29] font-medium block mb-1">
              Recuerdos Exclusivos & Velas Artesanales
            </span>
            <h1 className="font-cursive text-5xl md:text-6xl text-[#5a3e2b] leading-tight my-0">
                E-Aura
            </h1>
            <p className="text-xs text-[#7a5c29] mt-1 font-semibold">
              Panel de Administración / Gestión de Catálogo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="px-5 py-2.5 bg-[#e8ded1] hover:bg-[#d8cebe] text-[#3d2b1f] text-xs font-semibold rounded-full shadow-sm transition-all duration-200 flex items-center gap-1.5"
            >
              🎨 Configuración de colores
            </button>
            <button
              onClick={handleCreateNewClick}
              className="px-5 py-2.5 bg-[#c9b596] hover:bg-[#b8a281] text-white text-xs font-semibold rounded-full shadow-sm transition-all duration-200 flex items-center gap-1.5"
            >
              + Nuevo Producto
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 bg-[#3d2b1f] hover:bg-[#5a3e2b] text-white text-xs font-semibold rounded-full shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              ← Volver a la Página Principal
            </Link>
          </div>
        </header>

        <div className="bg-[#f8f5f0]/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#e8ded1] shadow-sm space-y-6">
          <div className="border-b border-[#e8ded1] pb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7a5c29] mb-3">
              Filtrar por Clasificación
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {CATEGORIES_LIST.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-[#c9b596] text-white shadow-sm font-semibold'
                        : 'bg-white/80 hover:bg-white text-[#3d2b1f] border border-[#e8ded1] hover:border-[#c9b596]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-[#7a5c29]">
              Cargando catálogo...
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-bold text-[#3d2b1f]">
                  Productos Registrados ({filteredProducts.length}
                  {selectedCategory !== 'Todas' && ` en "${selectedCategory}"`})
                </h2>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500 bg-white/50 rounded-2xl border border-dashed border-[#e8ded1]">
                  No hay productos registrados en la clasificación &quot;{selectedCategory}&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-[#f4efe8]/80 rounded-3xl p-4 border border-[#e8ded1] shadow-sm flex flex-col justify-between backdrop-blur-sm"
                    >
                      <div>
                        <div className="bg-white rounded-2xl p-2 mb-3 shadow-inner">
                          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[#f7f3ee]">
                            {product.images && product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-[#c9b596]">
                                Sin Imagen
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="px-1">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="font-cursive text-3xl md:text-4xl text-[#3d2b1f] mb-1 leading-snug">
                                {product.name}
                            </h3>
                            {product.mask_image_url && (
                              <span
                                className="text-[10px] bg-[#3d2b1f] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium"
                                title="Tiene imagen bosquejo asignada"
                              >
                                🎨 Bosquejo
                              </span>
                            )}
                          </div>
                          <p className="text-xs italic text-[#7a5c29] mb-3 line-clamp-1">
                            {product.commentary || 'Sin descripción'}
                          </p>

                          <div className="bg-white/90 rounded-xl p-2.5 mb-4 border border-[#e8ded1]/60">
                            <div className="text-xs font-semibold text-[#3d2b1f]">
                              ${product.price} MXN{' '}
                              <span className="font-normal text-gray-500">
                                | {product.dimensions || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="w-1/2 py-2 bg-[#e8ded1]/80 hover:bg-[#e8ded1] text-[#3d2b1f] text-xs font-semibold rounded-xl transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteProduct(product.id, product.name)
                          }
                          disabled={deletingId === product.id}
                          className="w-1/2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                        >
                          {deletingId === product.id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Administración de Colores */}
      <ColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        onColorAdded={() => {
          fetchProducts();
        }}
      />

      {/* Modal de Crear / Editar Producto */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#f8f5f0] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-[#e8ded1] shadow-2xl relative">
            <h2 className="text-xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f] mb-6 text-center">
              {isCreating ? 'Crear Nuevo Producto' : 'Editar Producto'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">
                  Nombre de la Vela
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">
                  Medida / Dimensiones
                </label>
                <input
                  type="text"
                  value={editingProduct.dimensions || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      dimensions: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">
                  Precio ($ MXN)
                </label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">
                  Comentario / Frase del Producto
                </label>
                <textarea
                  value={editingProduct.commentary || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      commentary: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-[#3d2b1f]">
                  Categorías / Clasificaciones
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES_LIST.filter((c) => c !== 'Todas').map((cat) => {
                    const isSelected = editingProduct.categories?.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleCategoryToggle(cat)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                          isSelected
                            ? 'bg-[#c9b596] text-white border-[#c9b596]'
                            : 'bg-white text-[#3d2b1f] border-[#e8ded1] hover:border-[#c9b596]'
                        }`}
                      >
                        {isSelected ? `✓ ${cat}` : `+ ${cat}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-semibold text-[#3d2b1f]">
                    Imágenes del Producto
                  </label>
                  <span className="text-[10px] text-[#7a5c29] italic">
                    Haz clic en la paleta 🎨 para marcar la imagen como bosquejo
                  </span>
                </div>

                <div className="mb-3">
                  <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2.5 bg-[#3d2b1f] text-white font-medium rounded-xl hover:bg-[#5a3e2b] transition-all text-xs">
                    {uploading ? 'Subiendo imágenes...' : 'Subir Imágenes desde tu equipo'}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {newImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/60 p-3 rounded-2xl border border-[#e8ded1]">
                    {newImages.map((imgUrl, idx) => {
                      const isMask = selectedMaskUrl === imgUrl;
                      return (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#e8ded1] bg-white">
                          <div className="relative w-full h-24">
                            <Image
                              src={imgUrl}
                              alt={`Imagen ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {isMask && (
                            <div className="absolute top-1 left-1 bg-[#3d2b1f] text-white text-[9px] px-1.5 py-0.5 rounded-md font-semibold">
                              🎨 Bosquejo
                            </div>
                          )}

                          <div className="p-1.5 flex justify-between items-center gap-1 bg-[#f8f5f0]">
                            <button
                              type="button"
                              onClick={() => handleToggleMaskImage(imgUrl)}
                              className={`p-1 rounded text-[10px] ${
                                isMask ? 'bg-[#c9b596] text-white' : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              title="Marcar/Desmarcar como bosquejo"
                            >
                              🎨
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 rounded text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-700"
                              title="Eliminar imagen"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#e8ded1]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-1/2 py-2.5 bg-gray-200 hover:bg-gray-300 text-[#3d2b1f] font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-[#c9b596] hover:bg-[#b8a281] text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}