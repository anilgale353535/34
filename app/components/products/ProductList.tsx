"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { PencilIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { fetchApi, invalidateApiCache } from '@/lib/api';
import ProductForm from './ProductForm';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: string;
  description?: string;
  supplier?: string;
}

interface ProductListProps {
  onExport?: (products: Product[]) => void;
}

const ProductList = forwardRef<{ loadProducts: () => Promise<void> }, ProductListProps>(function ProductList({ onExport }, ref) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'critical' | 'normal'>('all');

  // Kategorileri hesapla
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return uniqueCategories.sort();
  }, [products]);

  // Filtrelenmiş ürünleri hesapla
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'critical' && product.currentStock <= product.minimumStock) ||
        (stockFilter === 'normal' && product.currentStock > product.minimumStock);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products', { useCache: false });
      setProducts(data);
    } catch {
      setError('Ürünler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadProducts
  }));

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      invalidateApiCache('/products');
      setProducts(products.filter(p => p.id !== id));
    } catch {
      setError('Ürün silinirken bir hata oluştu');
    }
  };

  if (loading) {
    return <div className="text-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center">
        <p className="mt-1 text-sm text-gray-500">
          Ürün bulunamadı. Yeni bir ürün eklemek için &quot;Yeni Ürün&quot; butonunu kullanın.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtreler */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Arama */}
        <div>
          <input
            type="text"
            placeholder="Ürün adı veya barkod ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
          />
        </div>

        {/* Kategori filtresi */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Stok durumu filtresi */}
        <div>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as 'all' | 'critical' | 'normal')}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
          >
            <option value="all">Tüm Stok Durumları</option>
            <option value="critical">Kritik Stok</option>
            <option value="normal">Normal Stok</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Excel export butonu */}
        <div className="flex justify-end mb-4">
          {onExport && (
            <button
              onClick={() => onExport(filteredProducts)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Excel'e Aktar
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Aranan kriterlere uygun ürün bulunamadı.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Ürün Adı
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Kategori
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Stok
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Fiyat
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const isStockCritical = product.currentStock <= product.minimumStock;
                const stockClassName = isStockCritical ? 'text-red-600 font-medium' : 'text-gray-900';
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.barcode && (
                        <div className="text-xs text-gray-500 mt-0.5">{product.barcode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${stockClassName}`}>
                        <span className="tabular-nums">{product.currentStock}</span>
                        <span className="uppercase ml-1">{product.unit}</span>
                      </div>
                      {isStockCritical && (
                        <div className="text-xs text-red-500 mt-0.5">
                          Min: {product.minimumStock} {product.unit.toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900 tabular-nums">
                        ₺{product.sellingPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 tabular-nums">
                        Alış: ₺{product.purchasePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-accent hover:text-accent-dark transition-colors"
                          title="Düzenle"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Sil"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingProduct && (
        <ProductForm
          open={true}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          onSuccess={() => {
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
});

ProductList.displayName = 'ProductList';

export default ProductList; 