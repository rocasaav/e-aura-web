'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [aromas, setAromas] = useState<Aroma[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [commentary, setCommentary] = useState('');
  const [price, setPrice] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      if (catData) setCategories(catData);

      const { data: aromaData } = await supabase.from('aromas').select('*').order('name');
      if (aromaData) setAromas(aromaData);

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

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCommentary(product.commentary || '');
      setPrice(product.price.toString());
      setDimensions(product.dimensions || '');
      setImages(product.images || []);
    } else {
      setEditingProduct(null);
      setName('');
      setCommentary('');
      setPrice('');
      setDimensions('');
      setImages([]);
    }
    setIsModalOpen(true);
  };

  // Carga de múltiples archivos al bucket 'products'
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    const newImages: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      // Subida a la raíz del bucket 'products' o a una subcarpeta
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') // Apuntando al bucket correcto: products
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
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const generatedSlug = name
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now()
      : 'producto-' + Date.now();

    const productPayload = {
      name,
      slug: editingProduct ? editingProduct.slug : generatedSlug,
      commentary,
      price: parseFloat(price) || 0,
      dimensions,
      images,
      is_available: true,
    };

    try {
      let error = null;

      if (editingProduct) {
        const res = await supabase.from('products').update(productPayload).eq('id', editingProduct.id);
        error = res.error;
      } else {
        const res = await supabase.from('products').insert([productPayload]);
        error = res.error;
      }

      if (error) {
        alert(`Error de Supabase: ${error.message}`);
      } else {
        setIsModalOpen(false);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error al guardar producto:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
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
              className="text-xs px-4 py-2 rounded-xl border border-[#c9b596] text-[#3d2b1f] hover:bg-[#fdfbf7] transition-all font-semibold flex items-center"
            >
              Ver Tienda
            </a>
            <button
              onClick={() => openModal()}
              className="text-xs px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] transition-all font-semibold"
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
                    onClick={() => openModal(prod)}
                    className="text-xs px-3 py-1 rounded-lg bg-[#fdfbf7] border border-[#c9b596] hover:bg-[#e8ded1]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="text-xs px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
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

              {/* Botón para seleccionar múltiples imágenes */}
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
                    className="px-4 py-2 bg-[#3d2b1f] text-white rounded-xl text-xs font-semibold hover:bg-[#5a3e2b] transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Subiendo imágenes...' : '+ Agregar Imágenes desde tu Equipo'}
                  </button>
                </div>

                {/* Previsualización de imágenes agregadas */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group w-16 h-16 border border-[#c9b596] rounded-lg overflow-hidden">
                        <img src={imgUrl} alt={`Vista previa ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] w-4 h-4 rounded-bl flex items-center justify-center opacity-80 hover:opacity-100"
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
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-4 py-2 rounded-xl bg-[#3d2b1f] text-white hover:bg-[#5a3e2b] disabled:opacity-50"
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