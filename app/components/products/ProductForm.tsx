"use client";

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { fetchApi, invalidateApiCache } from '@/lib/api';
import StockMovementHistory from './StockMovementHistory';
import { UnitType, UNITS } from '@/lib/units';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: UnitType;
  description?: string;
  supplier?: string;
}

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
  onSuccess?: () => void;
}

export default function ProductForm({ open, onClose, product, onSuccess }: ProductFormProps) {
  const [apiError, setApiError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Product>({
    defaultValues: product || {
      name: '',
      barcode: '',
      category: '',
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      minimumStock: 0,
      unit: 'adet',
      description: '',
      supplier: '',
    },
  });

  useEffect(() => {
    if (product) {
      reset(product);
    }
  }, [product, reset]);

  const onSubmit = async (data: Product) => {
    try {
      setApiError('');
      if (product) {
        await fetchApi(`/products/${product.id}`, {
          method: 'PUT',
          data: data as unknown as Record<string, unknown>,
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          data: data as unknown as Record<string, unknown>,
        });
      }
      invalidateApiCache('/products');
      onSuccess?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ürün kaydedilirken bir hata oluştu';
      setApiError(message);
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
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-full p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative px-4 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                  <button
                    type="button"
                    className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Kapat</span>
                    <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                    </Dialog.Title>

                    {product && (
                      <div className="mt-4 border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                          <button
                            onClick={() => setActiveTab('details')}
                            className={`${
                              activeTab === 'details'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                          >
                            Ürün Detayları
                          </button>
                          <button
                            onClick={() => setActiveTab('history')}
                            className={`${
                              activeTab === 'history'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                          >
                            Stok Hareketleri
                          </button>
                        </nav>
                      </div>
                    )}

                    <div className="mt-4">
                      {activeTab === 'details' ? (
                        <>
                          {apiError && (
                            <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-md">
                              {apiError}
                            </div>
                          )}
                          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Ürün Adı *
                              </label>
                              <input
                                type="text"
                                {...register('name', { 
                                  required: 'Ürün adı zorunludur',
                                  minLength: { value: 2, message: 'Ürün adı en az 2 karakter olmalıdır' },
                                  maxLength: { value: 100, message: 'Ürün adı en fazla 100 karakter olabilir' }
                                })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              />
                              {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
                                Barkod
                              </label>
                              <input
                                type="text"
                                {...register('barcode', {
                                  pattern: {
                                    value: /^[A-Za-z0-9]*$/,
                                    message: 'Barkod sadece harf ve rakamlardan oluşmalıdır'
                                  },
                                  maxLength: { value: 50, message: 'Barkod en fazla 50 karakter olabilir' }
                                })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              />
                              {errors.barcode && (
                                <p className="mt-1 text-sm text-red-600">{errors.barcode.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                Kategori *
                              </label>
                              <input
                                type="text"
                                {...register('category', { 
                                  required: 'Kategori zorunludur',
                                  minLength: { value: 2, message: 'Kategori en az 2 karakter olmalıdır' },
                                  maxLength: { value: 50, message: 'Kategori en fazla 50 karakter olabilir' }
                                })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              />
                              {errors.category && (
                                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">
                                  Alış Fiyatı *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register('purchasePrice', {
                                    required: 'Alış fiyatı zorunludur',
                                    min: { value: 0, message: 'Alış fiyatı 0\'dan büyük olmalıdır' },
                                    valueAsNumber: true
                                  })}
                                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                                />
                                {errors.purchasePrice && (
                                  <p className="mt-1 text-sm text-red-600">{errors.purchasePrice.message}</p>
                                )}
                              </div>

                              <div>
                                <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
                                  Satış Fiyatı *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register('sellingPrice', {
                                    required: 'Satış fiyatı zorunludur',
                                    min: { value: 0, message: 'Satış fiyatı 0\'dan büyük olmalıdır' },
                                    validate: (value, formValues) => 
                                      value > formValues.purchasePrice || 'Satış fiyatı alış fiyatından büyük olmalıdır',
                                    valueAsNumber: true
                                  })}
                                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                                />
                                {errors.sellingPrice && (
                                  <p className="mt-1 text-sm text-red-600">{errors.sellingPrice.message}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">
                                  Mevcut Stok *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register('currentStock', {
                                    required: 'Mevcut stok zorunludur',
                                    min: { value: 0, message: 'Mevcut stok 0\'dan büyük olmalıdır' },
                                    valueAsNumber: true
                                  })}
                                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                                />
                                {errors.currentStock && (
                                  <p className="mt-1 text-sm text-red-600">{errors.currentStock.message}</p>
                                )}
                              </div>

                              <div>
                                <label htmlFor="minimumStock" className="block text-sm font-medium text-gray-700">
                                  Minimum Stok *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register('minimumStock', {
                                    required: 'Minimum stok zorunludur',
                                    min: { value: 0, message: 'Minimum stok 0\'dan büyük olmalıdır' },
                                    valueAsNumber: true
                                  })}
                                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                                />
                                {errors.minimumStock && (
                                  <p className="mt-1 text-sm text-red-600">{errors.minimumStock.message}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                                Birim *
                              </label>
                              <select
                                {...register('unit', { required: 'Birim seçimi zorunludur' })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              >
                                {Object.entries(UNITS).map(([value, { label }]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              {errors.unit && (
                                <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Açıklama
                              </label>
                              <textarea
                                {...register('description', {
                                  maxLength: { value: 500, message: 'Açıklama en fazla 500 karakter olabilir' }
                                })}
                                rows={3}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              />
                              {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                                Tedarikçi
                              </label>
                              <input
                                type="text"
                                {...register('supplier', {
                                  maxLength: { value: 100, message: 'Tedarikçi en fazla 100 karakter olabilir' }
                                })}
                                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm"
                              />
                              {errors.supplier && (
                                <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
                              )}
                            </div>

                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-accent border border-transparent rounded-md shadow-sm hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button
                                type="button"
                                className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 sm:mt-0 sm:w-auto sm:text-sm"
                                onClick={onClose}
                              >
                                İptal
                              </button>
                            </div>
                          </form>
                        </>
                      ) : (
                        product && <StockMovementHistory productId={product.id} />
                      )}
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