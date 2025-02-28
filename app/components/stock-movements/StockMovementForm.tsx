"use client";

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { fetchApi, invalidateApiCache } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  barcode?: string;
}

type MovementType = 'STOCK_IN' | 'STOCK_OUT';

const MOVEMENT_TYPES = [
  { value: 'STOCK_IN', label: 'Stok Girişi' },
  { value: 'STOCK_OUT', label: 'Stok Çıkışı' },
];

const MOVEMENT_REASONS = {
  STOCK_IN: [
    { value: 'PURCHASE', label: 'Satın Alma' },
    { value: 'RETURN', label: 'Müşteri İadesi' },
    { value: 'COUNT', label: 'Sayım Farkı' },
    { value: 'OTHER', label: 'Diğer' },
  ],
  STOCK_OUT: [
    { value: 'SALE', label: 'Satış' },
    { value: 'RETURN', label: 'Tedarikçiye İade' },
    { value: 'WASTE', label: 'Fire/Zayi' },
    { value: 'OTHER', label: 'Diğer' },
  ],
};

interface StockMovementFormData {
  productId: string;
  type: MovementType;
  reason: string;
  quantity: number;
  description?: string;
}

interface StockMovementFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StockMovementForm({ open, onClose, onSuccess }: StockMovementFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<StockMovementFormData>();
  const watchType = watch('type');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products', { useCache: true, cacheTTL: 30000 }); // 30 saniye cache
      setProducts(data);
    } catch {
      setError('Ürünler yüklenirken bir hata oluştu');
    }
  };

  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!barcodeInput.trim()) return;

    // Önce cache'den kontrol et
    let product = products.find((p: Product) => p.barcode === barcodeInput.trim());
    
    if (!product) {
      // Cache'de yoksa API'den yeni veri al
      try {
        setLoading(true);
        const data = await fetchApi('/products', { useCache: false });
        setProducts(data);
        product = data.find((p: Product) => p.barcode === barcodeInput.trim());
      } catch {
        setError('Ürünler güncellenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

    if (product) {
      setValue('productId', product.id);
      setBarcodeInput('');
      setError('');
    } else {
      setError('Ürün bulunamadı');
    }
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Form submit'i engelle
      handleBarcodeSubmit();
    }
  };

  const handleBarcodeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const onSubmit = async (data: StockMovementFormData) => {
    try {
      setLoading(true);
      setError('');
      await fetchApi('/stock-movements', {
        method: 'POST',
        data: {
          ...data,
          quantity: parseFloat(data.quantity.toString())
        },
        useCache: false
      });
      
      // Stok hareketi başarılı olduğunda ürünler cache'ini temizle
      invalidateApiCache('/products');
      
      onSuccess?.();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Stok hareketi kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const watchProductId = watch('productId');
  const selectedProductDetails = products.find(p => p.id === watchProductId);

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6" data-modal="stock-movement">
                <div>
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
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Yeni Stok Hareketi
                    </Dialog.Title>
                    <div className="mt-4">
                      <div className="mb-4">
                        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                          Barkod ile Ürün Seç
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="text"
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            onKeyPress={handleBarcodeKeyPress}
                            onFocus={handleBarcodeFocus}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
                            placeholder="Barkodu okutun veya girin"
                          />
                          <button
                            type="button"
                            onClick={() => handleBarcodeSubmit()}
                            className="ml-4 inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            Ara
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit(onSubmit)}>
                        {error && (
                          <div className="mb-4 rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-700">{error}</div>
                          </div>
                        )}

                        {/* Ürün seçimi */}
                        <div className="mb-4">
                          <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
                            Ürün
                          </label>
                          <select
                            {...register('productId', { required: 'Ürün seçimi zorunludur' })}
                            className="mt-1 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-accent sm:text-sm sm:leading-6"
                          >
                            <option value="">Ürün seçin</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} (Stok: {product.currentStock} {product.unit})
                              </option>
                            ))}
                          </select>
                          {errors.productId && (
                            <p className="mt-2 text-sm text-red-600">{errors.productId.message}</p>
                          )}
                        </div>

                        {/* Hareket tipi */}
                        <div className="mb-4">
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                            Hareket Tipi
                          </label>
                          <select
                            {...register('type', { required: 'Hareket tipi seçimi zorunludur' })}
                            className="mt-1 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-accent sm:text-sm sm:leading-6"
                          >
                            <option value="">Hareket tipi seçin</option>
                            {MOVEMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {errors.type && (
                            <p className="mt-2 text-sm text-red-600">{errors.type.message}</p>
                          )}
                        </div>

                        {/* Hareket sebebi */}
                        {watchType && (
                          <div className="mb-4">
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                              Hareket Sebebi
                            </label>
                            <select
                              {...register('reason', { required: 'Hareket sebebi seçimi zorunludur' })}
                              className="mt-1 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-accent sm:text-sm sm:leading-6"
                            >
                              <option value="">Hareket sebebi seçin</option>
                              {MOVEMENT_REASONS[watchType].map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.label}
                                </option>
                              ))}
                            </select>
                            {errors.reason && (
                              <p className="mt-2 text-sm text-red-600">{errors.reason.message}</p>
                            )}
                          </div>
                        )}

                        {/* Miktar */}
                        <div className="mb-4">
                          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Miktar
                          </label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <input
                              type="number"
                              step="0.01"
                              {...register('quantity', {
                                required: 'Miktar zorunludur',
                                min: { value: 0.01, message: 'Miktar 0\'dan büyük olmalıdır' },
                              })}
                              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
                            />
                            {selectedProductDetails && (
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">
                                  {selectedProductDetails.unit}
                                </span>
                              </div>
                            )}
                          </div>
                          {errors.quantity && (
                            <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>
                          )}
                        </div>

                        {/* Açıklama */}
                        <div className="mb-4">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Açıklama
                          </label>
                          <textarea
                            {...register('description')}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm sm:leading-6"
                          />
                        </div>

                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                          <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:col-start-2"
                          >
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
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