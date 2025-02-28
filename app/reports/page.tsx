"use client";

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

type ReportType = 'stock' | 'sales' | 'popular';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (type: ReportType) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = type === 'stock' ? '/reports/stock' 
        : type === 'sales' ? '/reports/sales'
        : '/reports/popular';

      const data = await fetchApi(endpoint);

      // Excel dosyası oluştur
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
      
      // Dosyayı indir
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `${type}-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
    } catch (error) {
      setError('Rapor oluşturulurken bir hata oluştu');
      console.error('Rapor hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Raporlar</h1>

      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Stok Durumu</h3>
              <p className="mt-1 text-sm text-gray-500">
                Mevcut stok durumu ve kritik seviyedeki ürünler
              </p>
            </div>
            <button
              onClick={() => generateReport('stock')}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:opacity-50"
            >
              {loading ? 'Hazırlanıyor...' : 'İndir'}
            </button>
          </div>
        </div>

        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Satış Geçmişi</h3>
              <p className="mt-1 text-sm text-gray-500">
                Günlük, haftalık ve aylık satış raporları
              </p>
            </div>
            <button
              onClick={() => generateReport('sales')}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:opacity-50"
            >
              {loading ? 'Hazırlanıyor...' : 'İndir'}
            </button>
          </div>
        </div>

        <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Popüler Ürünler</h3>
              <p className="mt-1 text-sm text-gray-500">
                En çok ve en az satan ürünlerin analizi
              </p>
            </div>
            <button
              onClick={() => generateReport('popular')}
              disabled={loading}
              className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 disabled:opacity-50"
            >
              {loading ? 'Hazırlanıyor...' : 'İndir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 