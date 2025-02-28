"use client";

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

interface StockMovement {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  reason: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  description: string | null;
  createdAt: string;
}

interface StockMovementHistoryProps {
  productId: string;
}

export default function StockMovementHistory({ productId }: StockMovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovements = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchApi<StockMovement[]>(`/products/${productId}/movements`);
        setMovements(data);
      } catch (error: unknown) {
        setError('Stok hareketleri yüklenirken bir hata oluştu');
        console.error('Stok hareketleri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, [productId]);

  if (loading) return <div className="p-4 text-gray-500">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (movements.length === 0) return <div className="p-4 text-gray-500">Stok hareketi bulunmuyor</div>;

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  Tarih
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  İşlem
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Miktar
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Birim Fiyat
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Toplam Tutar
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Açıklama
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                    {new Date(movement.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      movement.type === 'STOCK_IN' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {movement.type === 'STOCK_IN' ? 'Giriş' : 'Çıkış'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {movement.quantity}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {movement.unitPrice ? `₺${movement.unitPrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {movement.totalPrice ? `₺${movement.totalPrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {movement.description || movement.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 