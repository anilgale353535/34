"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { fetchApi } from '@/lib/api';

interface Sale {
  id: string;
  productId: string;
  product: {
    name: string;
    unit: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  createdAt: string;
}

const SaleList = forwardRef((props, ref) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/sales');
      setSales(data);
    } catch (error) {
      setError('Satışlar yüklenirken bir hata oluştu');
      console.error('Satışlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadSales
  }));

  useEffect(() => {
    loadSales();
  }, []);

  if (loading) {
    return <div className="text-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (sales.length === 0) {
    return <div className="text-center text-gray-500">Henüz satış kaydı bulunmuyor</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tarih</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ürün</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Miktar</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Birim Fiyat</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Toplam Tutar</th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Açıklama</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {new Date(sale.createdAt).toLocaleString('tr-TR')}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {sale.product.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {sale.quantity} {sale.product.unit}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {sale.unitPrice ? sale.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {sale.totalPrice ? sale.totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {sale.description || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

SaleList.displayName = 'SaleList';

export default SaleList; 