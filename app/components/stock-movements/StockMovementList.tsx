"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { fetchApi } from '@/lib/api';

interface StockMovement {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT';
  reason: string;
  productId: string;
  product: {
    name: string;
    unit: string;
  };
  quantity: number;
  description?: string;
  createdAt: string;
}

// Hareket sebeplerinin etiketleri
const REASON_LABELS: Record<string, string> = {
  'PURCHASE': 'Satın Alma',
  'RETURN': 'İade',
  'COUNT': 'Sayım Farkı',
  'SALE': 'Satış',
  'WASTE': 'Fire/Zayi',
  'OTHER': 'Diğer',
};

const StockMovementList = forwardRef((props, ref) => {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStockMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/stock-movements');
      setStockMovements(data);
    } catch (error) {
      setError('Stok hareketleri yüklenirken bir hata oluştu');
      console.error('Stok hareketleri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadStockMovements
  }));

  useEffect(() => {
    loadStockMovements();
  }, []);

  if (loading) {
    return <div className="text-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (stockMovements.length === 0) {
    return <div className="text-center text-gray-500">Henüz stok hareketi bulunmuyor</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tarih</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ürün</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Hareket</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sebep</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Miktar</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Açıklama</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stockMovements.map((movement) => (
            <tr key={movement.id}>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {new Date(movement.createdAt).toLocaleString('tr-TR')}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {movement.product.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    movement.type === 'STOCK_IN'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {movement.type === 'STOCK_IN' ? 'Giriş' : 'Çıkış'}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {REASON_LABELS[movement.reason] || movement.reason}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {movement.quantity} {movement.product.unit}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {movement.description || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

StockMovementList.displayName = 'StockMovementList';

export default StockMovementList; 