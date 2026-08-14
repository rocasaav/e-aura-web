'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const DEFAULT_AROMA_ID = 75; // ID correspondiente a 'Varios' tabla aroma
const DEFAULT_WAX_TYPE_ID = 3; // ID correspondiente a 'Parafina' tabla tipo de cera

// Función auxiliar para normalizar y crear el slug de forma limpia
const generateSlug = (text: string): string => {
  return text
    ? text
        .toLowerCase()
        .normalize('NFD') // Remueve acentos y diacríticos
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Date.now()
    : 'producto-' + Date.now();
};

interface Category {
  id: number;
  name: string;
}

interface Aroma {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  commentary?: string;
  price: number;
  dimensions?: string;
  images: string[];
  is_available: boolean;
  category_ids?: number[];
  aroma_ids?: number[];
}

interface RawProductCategory {
  category_id: number;
}

interface RawProductWaxAroma {
  aroma_id: number;
}

interface RawProductData extends Omit<Product, 'category_ids' | 'aroma_ids'> {
  product_categories?: RawProductCategory[];
  product_wax_aromas?: RawProductWaxAroma[];
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [aromas, setAromas] = useState<Aroma[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Estados del Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [commentary, setCommentary] = useState('');
  const [price, setPrice] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedAromaIds, setSelectedAromaIds] = useState<number[]>([DEFAULT_AROMA_ID]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      if (catData) setCategories(catData);

      // Traer aromas situando 'Varios' (75) al principio
      const { data: aromaData } = await supabase.from('aromas').select('*');
      if (aromaData) {
        const sortedAromas = [...aromaData].sort((a, b) => {
          if (a.id === DEFAULT_AROMA_ID) return -1;
          if (b.id === DEFAULT_AROMA_ID) return 1;
          return a.name.localeCompare(b.name);
        });
        setAromas(sortedAromas);
      }

      // Consulta relacional incluyendo product_wax_aromas
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          *,
          product_categories ( category_id ),
          product_wax_aromas ( aroma_id )
        `)
        .order('id', { ascending: false });

      if (prodError) console.error('Error al obtener productos:', prodError.message);

      if (prodData) {
        const rawProducts = prodData as unknown as RawProductData[];
        const formattedProducts: Product[] = rawProducts.map((prod) => ({
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          commentary: prod.commentary,
          price: prod.price,
          dimensions: prod.dimensions,
          images: prod.images || [],
          is_available: prod.is_available,
          category_ids: prod.product_categories?.map((pc) => pc.category_id) || [],
          aroma_ids: prod.product_wax_aromas?.map((pwa) => pwa.aroma_id) || []
        }));
        setProducts(formattedProducts);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndFetch = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (isMounted) router.push('/admin/login');
          return;
        }

        if (isMounted) {
          await fetchAdminData();
        }
      } catch (error) {
        console.error("Error al autenticar panel:", error);
        if (isMounted) {
          router.push('/admin/login');
        }
      }
    };

    checkSessionAndFetch();

    return () => {
      isMounted = false;
    };
  }, [router, fetchAdminData]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      router.push('/admin/login');
    }
  }, [router]);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCommentary(product.commentary || '');
      setPrice(product.price.toString());
      setDimensions(product.dimensions || '');
      setImages(product.images || []);
      setSelectedCategoryIds(product.category_ids || []);
      setSelectedAromaIds(
        product.aroma_ids && product.aroma_ids.length > 0
          ? product.aroma_ids
          : [DEFAULT_AROMA_ID]
      );
    } else {
      setEditingProduct(null);
      setName('');
      setCommentary('');
      setPrice('');
      setDimensions('');
      setImages([]);
      setSelectedCategoryIds([]);
      setSelectedAromaIds([DEFAULT_AROMA_ID]);
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    const newImages: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(`Error al subir ${file.name}:`, uploadError.message);
        alert(`Error al subir ${file.name}: ${uploadError.message}`);
      } else {
        const { data } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        if (data?.publicUrl) {
          newImages.push(data.publicUrl);
        }
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const finalSlug = editingProduct?.slug
      ? editingProduct.slug
      : generateSlug(name);

    const parsedPrice = parseFloat(price);
    const productPayload = {
      name: name.trim(),
      slug: finalSlug,
      commentary: commentary.trim(),
      price: isNaN(parsedPrice) ? 0 : parsedPrice,
      dimensions: dimensions.trim(),
      images,
      is_available: true,
    };

    try {
      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productPayload])
          .select('id')
          .single();

        if (error) throw error;
        if (data) productId = data.id;
      }

      if (!productId) {
        throw new Error('No se pudo obtener o determinar el ID del producto.');
      }

      // Guardar Categorías
      const { error: delCatErr } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', productId);

      if (delCatErr) throw delCatErr;

      if (selectedCategoryIds.length > 0) {
        const categoryRows = selectedCategoryIds.map((catId) => ({
          product_id: productId,
          category_id: catId,
        }));

        const { error: catError } = await supabase
          .from('product_categories')
          .insert(categoryRows);

        if (catError) throw catError;
      }

      // Guardar Aromas
      const { error: delAromaErr } = await supabase
        .from('product_wax_aromas')
        .delete()
        .eq('product_id', productId);

      if (delAromaErr) throw delAromaErr;

      const aromasToSave = selectedAromaIds.length > 0 
        ? selectedAromaIds 
        : [DEFAULT_AROMA_ID];

      const aromaRows = aromasToSave.map((aromaId, index) => ({
        product_id: productId,
        aroma_id: aromaId,
        wax_type_id: DEFAULT_WAX_TYPE_ID,
        layer_number: index + 1,
      }));

      const { error: aromaError } = await supabase
        .from('product_wax_aromas')
        .insert(aromaRows);

      if (aromaError) throw aromaError;

      setIsModalOpen(false);
      await fetchAdminData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error al guardar producto:', err);
      alert(`Error al guardar: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
      return;
    }
    fetchAdminData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center font-[var(--font-montserrat)] text-[#3d2b1f]">
        Cargando datos del panel...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fdfbf7] p-6 font-[var(--font-montserrat)] text-[#3d2b1f]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex justify-between items-center bg-white/80 p-6 rounded-2xl border border-[#e8ded1] shadow-sm">
          <div>
            <h1 className="text-2xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f]">
              Panel de Administración
            </h1>
            <p className="text-xs text-[#7a5c29]">Gestión de catálogo y productos E-Aura</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-xl border border-[#c9b596] text-[#3d2b1f] hover:bg-[#fdfbf7] transition-all font-semibold flex items-center"
            >
              Ver Tienda
            </a>
            <button
              type="button"
              onClick={() => openModal()}
              className="text-xs px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] transition-all font-semibold cursor-pointer"
            >
              + Agregar Producto
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition-all font-semibold cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Listado de Productos */}
        <div className="bg-white/80 p-6 rounded-2xl border border-[#e8ded1] shadow-sm">
          <h2 className="text-lg font-bold font-[var(--font-cinzel)] mb-4 text-[#3d2b1f]">
            Productos Registrados ({products.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="p-4 rounded-xl border border-[#e8ded1] bg-white hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {prod.images && prod.images.length > 0 && (
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-full h-32 object-cover rounded-lg mb-3 border border-[#f2eae1]"
                    />
                  )}
                  <h3 className="font-bold text-sm text-[#3d2b1f]">{prod.name}</h3>
                  <p className="text-xs text-[#7a5c29] italic mt-1">{prod.commentary || 'Sin comentario'}</p>
                  <div className="text-xs font-semibold mt-2 text-[#3d2b1f]">
                    ${prod.price} MXN {prod.dimensions && <span className="text-gray-400 font-normal">| {prod.dimensions}</span>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-[#f2eae1]">
                  <button
                    type="button"
                    onClick={() => openModal(prod)}
                    className="text-xs px-3 py-1 rounded-lg bg-[#fdfbf7] border border-[#c9b596] hover:bg-[#e8ded1] cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="text-xs px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Agregar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#e8ded1] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-[var(--font-cinzel)] text-[#3d2b1f]">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">Nombre de la Vela</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: TequileroS"
                  className="w-full px-4 py-2 rounded-xl border border-[#c9b596]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">Medida / Dimensiones</label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="Ej: 3 cm x 10.5 cm"
                  className="w-full px-4 py-2 rounded-xl border border-[#c9b596]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">Precio ($ MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ej: 40"
                  className="w-full px-4 py-2 rounded-xl border border-[#c9b596]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">Comentario / Frase del Producto</label>
                <textarea
                  rows={2}
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  placeholder="Frase descriptiva..."
                  className="w-full px-4 py-2 rounded-xl border border-[#c9b596]"
                />
              </div>

              {/* SECCIÓN DE CATEGORÍAS */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#3d2b1f] mb-2 font-[var(--font-cinzel)]">
                  Categorías / Clasificaciones (Selecciona una o varias)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-white/60 border border-[#c9b596]/60 rounded-xl">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id));
                          } else {
                            setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-[var(--font-cinzel)] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#c9b596] text-[#2d1f15] font-bold border border-[#b39e7d] shadow-sm'
                            : 'bg-white/70 text-[#5c4a38] border border-gray-200 hover:bg-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECCIÓN DE AROMAS */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#3d2b1f] mb-2 font-[var(--font-cinzel)]">
                  Aromas del Producto (Selecciona uno o varios)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-white/60 border border-[#c9b596]/60 rounded-xl max-h-40 overflow-y-auto">
                  {aromas.map((aroma) => {
                    const isSelected = selectedAromaIds.includes(aroma.id);
                    return (
                      <button
                        key={aroma.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAromaIds(selectedAromaIds.filter((id) => id !== aroma.id));
                          } else {
                            setSelectedAromaIds([...selectedAromaIds, aroma.id]);
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-[var(--font-cinzel)] transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#c9b596] text-[#2d1f15] font-bold border border-[#b39e7d] shadow-sm'
                            : 'bg-white/70 text-[#5c4a38] border border-gray-200 hover:bg-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {aroma.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* IMÁGENES */}
              <div>
                <label className="block font-semibold mb-1 text-[#3d2b1f]">Imágenes del Producto</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-[#3d2b1f] text-white rounded-xl text-xs font-semibold hover:bg-[#5a3e2b] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? 'Subiendo imágenes...' : '+ Agregar Imágenes desde tu Equipo'}
                  </button>
                </div>

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group w-16 h-16 border border-[#c9b596] rounded-lg overflow-hidden">
                        <img src={imgUrl} alt={`Vista previa ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] w-4 h-4 rounded-bl flex items-center justify-center opacity-80 hover:opacity-100 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] disabled:opacity-50 cursor-pointer font-bold"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}