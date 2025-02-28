"use client";

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { fetchApi } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  barcode?: string;
}

interface SaleFormData {
  productId: string;
  quantity: number;
  unitPrice: number;
  description?: string;
}

interface SaleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SaleForm({ open, onClose, onSuccess }: SaleFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SaleFormData>();
  const watchProductId = watch('productId');

  // Ürünleri yükle
  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products');
      setProducts(data);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      setError('Ürünler yüklenirken bir hata oluştu');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Barkod ile ürün ara
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const product = products.find(p => p.barcode === barcodeInput.trim());
      if (product) {
        setValue('productId', product.id);
        setValue('unitPrice', product.sellingPrice);
        setSelectedProduct(product);
        setBarcodeInput('');
      } else {
        setError('Ürün bulunamadı');
      }
    } catch (error) {
      console.error('Ürün aranırken hata:', error);
      setError('Ürün aranırken bir hata oluştu');
    }
  };

  // Barkod inputu odaklandığında içeriği seç
  const handleBarcodeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Seçilen ürün değiştiğinde birim fiyatı güncelle
  useEffect(() => {
    if (watchProductId) {
      const product = products.find(p => p.id === watchProductId);
      if (product) {
        setValue('unitPrice', product.sellingPrice);
        setSelectedProduct(product);
      }
    }
  }, [watchProductId, products, setValue]);

  const onSubmit = async (data: SaleFormData) => {
    try {
      setLoading(true);
      setError('');

      // Seçili ürünü kontrol et
      if (!selectedProduct) {
        setError('Lütfen bir ürün seçin');
        return;
      }

      // Toplam tutarı hesapla
      const totalPrice = data.quantity * data.unitPrice;

      // Satış kaydı oluştur
      await fetchApi('/sales', {
        method: 'POST',
        data: {
          ...data,
          totalPrice,
        },
      });

      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Satış kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Kapat</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Yeni Satış
                    </Dialog.Title>

                    <div className="mt-4">
                      {error && (
                        <div className="mb-4 p-2 text-sm text-red-500 bg-red-50 rounded">
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleBarcodeSubmit} className="mb-4">
                        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                          Barkod
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="barcode"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onFocus={handleBarcodeFocus}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
                          />
                        </div>
                      </form>

                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                          <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
                            Ürün
                          </label>
                          <select
                            id="productId"
                            {...register('productId', { required: 'Ürün seçimi zorunludur' })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
                          >
                            <option value="">Ürün Seçin</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} ({product.currentStock} {product.unit})
                              </option>
                            ))}
                          </select>
                          {errors.productId && (
                            <p className="mt-1 text-sm text-red-500">{errors.productId.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Miktar
                          </label>
                          <input
                            type="number"
                            id="quantity"
                            min="1"
                            step="1"
                            {...register('quantity', {
                              required: 'Miktar zorunludur',
                              min: { value: 1, message: 'Miktar 1 veya daha büyük olmalıdır' },
                              valueAsNumber: true,
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
                          />
                          {errors.quantity && (
                            <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">
                            Birim Fiyat
                          </label>
                          <input
                            type="number"
                            id="unitPrice"
                            min="0"
                            step="0.01"
                            {...register('unitPrice', {
                              required: 'Birim fiyat zorunludur',
                              min: { value: 0, message: 'Birim fiyat 0 veya daha büyük olmalıdır' },
                              valueAsNumber: true,
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
                          />
                          {errors.unitPrice && (
                            <p className="mt-1 text-sm text-red-500">{errors.unitPrice.message}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Açıklama
                          </label>
                          <textarea
                            id="description"
                            rows={3}
                            {...register('description')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
                          />
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={onClose}
                          >
                            İptal
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 