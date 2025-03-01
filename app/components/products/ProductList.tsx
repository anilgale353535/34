"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-4">
        {onExport && (
          <button
            onClick={() => onExport(products)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Excel'e Aktar
          </button>
        )}
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Ürün Adı
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Kategori
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Stok
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Satış Fiyatı
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
              Durum
            </th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-500">{product.barcode}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{product.category}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {product.currentStock} {product.unit}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">₺{product.sellingPrice}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                    product.currentStock <= product.minimumStock
                      ? 'text-red-800 bg-red-100'
                      : 'text-green-800 bg-green-100'
                  }`}
                >
                  {product.currentStock <= product.minimumStock ? 'Kritik Stok' : 'Normal'}
                </span>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-900"
                >
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="inline-flex items-center px-2 py-1 ml-2 text-sm text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Sil
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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