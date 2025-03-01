import { Fragment, useEffect, useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { fetchApi } from '@/lib/api';

interface QuickStockModalProps {
  barcode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Product {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
}

interface ApiError {
  message: string;
}

export default function QuickStockModal({ barcode, onClose, onSuccess }: QuickStockModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1.00);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchApi<Product>(`/products/barcode/${barcode}`);
      setProduct(response);
    } catch (error: unknown) {
      console.error('Ürün arama hatası:', error);
      const apiError = error as ApiError;
      setError(apiError?.message || 'Ürün bulunamadı');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [barcode]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleQuantityChange = (value: string) => {
    const newValue = parseFloat(value);
    if (!isNaN(newValue) && newValue >= 0) {
      setQuantity(Math.min(newValue, product?.currentStock || 0));
    }
  };

  const adjustQuantity = (amount: number) => {
    const newValue = Math.round((quantity + amount) * 100) / 100;
    if (newValue >= 0 && newValue <= (product?.currentStock || 0)) {
      setQuantity(newValue);
    }
  };

  const handleStockOut = async () => {
    if (!product) return;

    try {
      setProcessing(true);
      setError('');
      
      await fetchApi('/stock-movements', {
        method: 'POST',
        data: {
          productId: product.id,
          type: 'STOCK_OUT',
          reason: 'SALE',
          quantity: quantity,
          description: 'Hızlı stok çıkışı'
        }
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: unknown) {
      console.error('Stok çıkışı hatası:', error);
      const apiError = error as ApiError;
      setError(apiError?.message || 'Stok çıkışı yapılamadı');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Kapat</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Hızlı Stok Çıkışı
                    </Dialog.Title>

                    {loading ? (
                      <div className="mt-4">Yükleniyor...</div>
                    ) : error ? (
                      <div className="mt-4 text-red-600">{error}</div>
                    ) : product ? (
                      <div className="mt-4">
                        <div className="mb-4">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Ürün:</span> {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Mevcut Stok:</span> {product.currentStock.toFixed(2)} {product.unit}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Barkod:</span> {barcode}
                          </p>
                        </div>

                        <div className="mb-4">
                          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                            Çıkış Miktarı ({product.unit})
                          </label>
                          <div className="mt-1 flex items-center space-x-2">
                            <input
                              type="number"
                              id="quantity"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(e.target.value)}
                              step="0.01"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              min="0"
                              max={product.currentStock}
                            />
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => adjustQuantity(-1)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustQuantity(-0.5)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                -0.5
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustQuantity(0.5)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                +0.5
                              </button>
                              <button
                                type="button"
                                onClick={() => adjustQuantity(1)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                +1
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="button"
                            className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleStockOut}
                            disabled={processing || quantity > product.currentStock || quantity <= 0}
                          >
                            {processing ? 'İşleniyor...' : 'Stok Çıkışı Yap'}
                          </button>
                          <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={onClose}
                            disabled={processing}
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : null}
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