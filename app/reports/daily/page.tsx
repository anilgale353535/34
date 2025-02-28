"use client";

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';

// Tüm mevcut sütunları tanımlayalım
const AVAILABLE_COLUMNS = {
  name: { label: 'Ürün Adı', key: 'product.name' },
  type: { label: 'İşlem Türü', key: 'type' },
  quantity: { label: 'Miktar', key: 'quantity' },
  unit: { label: 'Birim', key: 'product.unit' },
  unitPrice: { label: 'Birim Fiyat', key: 'unitPrice' },
  totalPrice: { label: 'Toplam Tutar', key: 'totalPrice' },
  category: { label: 'Kategori', key: 'product.category' },
  supplier: { label: 'Tedarikçi', key: 'product.supplier' },
  description: { label: 'Açıklama', key: 'description' },
  createdAt: { label: 'Tarih/Saat', key: 'createdAt' },
} as const;

type ColumnKey = keyof typeof AVAILABLE_COLUMNS;

interface DailyReport {
  movements: {
    id: string;
    type: 'STOCK_IN' | 'STOCK_OUT';
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    description: string | null;
    createdAt: string;
    product: {
      name: string;
      unit: string;
      category: string;
      supplier: string | null;
    };
  }[];
  summary: {
    totalStockIn: number;
    totalStockOut: number;
    totalPurchase: number;
    totalSale: number;
    profit: number;
  };
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

export default function DailyReportPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([
    'name', 'type', 'quantity', 'unitPrice', 'totalPrice', 'createdAt'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<DailyReport>(`/reports/daily?date=${date}&page=${page}`);
      setReport(data);
    } catch (error) {
      setError('Rapor yüklenirken bir hata oluştu');
      console.error('Rapor yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetchApi<DailyReport>(`/reports/daily?date=${date}`, {
        method: 'GET',
        useCache: false,
      });

      // XLSX dosyası oluştur
      const workbook = XLSXUtils.book_new();
      
      // Seçili sütunlara göre veri hazırla
      const movementsData = response.movements.map(movement => {
        const row: Record<string, any> = {};
        selectedColumns.forEach(col => {
          const column = AVAILABLE_COLUMNS[col];
          if (col === 'type') {
            row[column.label] = movement.type === 'STOCK_IN' ? 'Giriş' : 'Çıkış';
          } else if (col === 'createdAt') {
            row['Tarih'] = format(new Date(movement.createdAt), 'dd.MM.yyyy');
            row['Saat'] = format(new Date(movement.createdAt), 'HH:mm');
          } else if (col === 'quantity') {
            row[column.label] = `${movement.quantity} ${movement.product.unit}`;
          } else if (col === 'unitPrice') {
            row[column.label] = movement.unitPrice ? `₺${movement.unitPrice.toFixed(2)}` : '-';
          } else if (col === 'totalPrice') {
            row[column.label] = movement.totalPrice ? `₺${movement.totalPrice.toFixed(2)}` : '-';
          } else {
            // Nested object properties (e.g., product.name)
            const value = column.key.split('.').reduce((obj, key) => obj?.[key], movement);
            row[column.label] = value || '-';
          }
        });
        return row;
      });

      // Özet verilerini hazırla
      const summaryData = [
        { 'Özet Bilgiler': 'Değer' },
        { 'Özet Bilgiler': 'Toplam Stok Girişi', 'Değer': response.summary.totalStockIn },
        { 'Özet Bilgiler': 'Toplam Stok Çıkışı', 'Değer': response.summary.totalStockOut },
        { 'Özet Bilgiler': 'Toplam Alış', 'Değer': `₺${response.summary.totalPurchase.toFixed(2)}` },
        { 'Özet Bilgiler': 'Toplam Satış', 'Değer': `₺${response.summary.totalSale.toFixed(2)}` },
        { 'Özet Bilgiler': 'Kar', 'Değer': `₺${response.summary.profit.toFixed(2)}` },
      ];

      // Hareketler sayfası
      const movementsSheet = XLSXUtils.json_to_sheet(movementsData);
      XLSXUtils.book_append_sheet(workbook, movementsSheet, 'Hareketler');

      // Özet sayfası
      const summarySheet = XLSXUtils.json_to_sheet(summaryData);
      XLSXUtils.book_append_sheet(workbook, summarySheet, 'Özet');

      // XLSX dosyasını oluştur
      const excelBuffer = XLSXWrite(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapor-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      setError('Rapor indirilemedi');
    }
  };

  const toggleColumn = (columnKey: ColumnKey) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  return (
    <div className="p-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Günlük Rapor</h1>
          <p className="mt-2 text-sm text-gray-700">
            Seçili gün için tüm stok hareketleri ve özet bilgiler.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
        />
        <button
          onClick={loadReport}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50"
        >
          {loading ? 'Yükleniyor...' : 'Raporu Getir'}
        </button>
        {report && (
          <>
            <button
              onClick={downloadReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
            >
              Raporu İndir
            </button>
            <div className="relative">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
              >
                Sütunları Düzenle
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {Object.entries(AVAILABLE_COLUMNS).map(([key, { label }]) => (
                      <label
                        key={key}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(key as ColumnKey)}
                          onChange={() => toggleColumn(key as ColumnKey)}
                          className="mr-2"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="mt-8 flex flex-col">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedColumns.map(columnKey => (
                          <th
                            key={columnKey}
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            {AVAILABLE_COLUMNS[columnKey].label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {report.movements.map((movement) => (
                        <tr key={movement.id}>
                          {selectedColumns.map(columnKey => (
                            <td key={columnKey} className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                              {columnKey === 'type' ? (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                  movement.type === 'STOCK_IN'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {movement.type === 'STOCK_IN' ? 'Giriş' : 'Çıkış'}
                                </span>
                              ) : columnKey === 'createdAt' ? (
                                format(new Date(movement.createdAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                              ) : columnKey === 'quantity' ? (
                                `${movement.quantity} ${movement.product.unit}`
                              ) : columnKey === 'unitPrice' ? (
                                movement.unitPrice ? `₺${movement.unitPrice.toFixed(2)}` : '-'
                              ) : columnKey === 'totalPrice' ? (
                                movement.totalPrice ? `₺${movement.totalPrice.toFixed(2)}` : '-'
                              ) : (
                                AVAILABLE_COLUMNS[columnKey].key.split('.').reduce((obj, key) => obj?.[key], movement) || '-'
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Stok Girişi</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{report.summary.totalStockIn}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Stok Çıkışı</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{report.summary.totalStockOut}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Alış</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">₺{report.summary.totalPurchase.toFixed(2)}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Satış</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">₺{report.summary.totalSale.toFixed(2)}</dd>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Kar</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">₺{report.summary.profit.toFixed(2)}</dd>
              </div>
            </div>
          </div>

          {report.pagination && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="text-sm text-gray-700">
                Sayfa {page} / {report.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === report.pagination.totalPages}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 