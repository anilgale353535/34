"use client";

import { useState, useRef } from 'react';
import { PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import ProductList from '../components/products/ProductList';
import ProductForm from '../components/products/ProductForm';
import { exportProductsToExcel, getExcelTemplate, parseExcelFile } from '@/lib/excel';
import { fetchApi } from '@/lib/api';

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productListRef = useRef<{ loadProducts: () => Promise<void> }>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const products = await parseExcelFile(file);
      
      await fetchApi('/products/import', {
        method: 'POST',
        data: { products },
      });

      productListRef.current?.loadProducts();
    } catch (error) {
      console.error('Import error:', error);
      alert('Ürünler içe aktarılırken bir hata oluştu');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Ürünler</h1>
        <div className="flex gap-2">
          <button
            onClick={() => getExcelTemplate()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Şablon İndir
          </button>
          
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
            {importing ? 'İçe Aktarılıyor...' : 'Excel\'den İçe Aktar'}
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />

          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Ürün listesi */}
      <ProductList ref={productListRef} onExport={exportProductsToExcel} />

      {/* Ürün ekleme/düzenleme modal */}
      {isFormOpen && (
        <ProductForm 
          open={isFormOpen} 
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            productListRef.current?.loadProducts();
          }}
        />
      )}
    </div>
  );
} 