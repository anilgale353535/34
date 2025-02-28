"use client";

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { fetchApi } from '@/lib/api';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: {
    [key: string]: unknown;
  };
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface AuditLogListProps {
  entityType?: string;
  entityId?: string;
}

export default function AuditLogList({ entityType, entityId }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/audit-logs';
      const params = new URLSearchParams();

      if (entityType) {
        params.append('entityType', entityType);
      }
      if (entityId) {
        params.append('entityId', entityId);
      }

      // Pagination parametreleri
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetchApi<{ logs: AuditLog[]; total: number }>(url, {
        useCache: false // Cache'i devre dışı bırak
      });
      setLogs(response.logs);
      setTotalPages(Math.ceil(response.total / itemsPerPage));
    } catch (err) {
      setError('Sistem kayıtları yüklenirken bir hata oluştu.');
      console.error('Sistem kayıtları yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, entityType, entityId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    // SSE bağlantısını oluştur
    const eventSource = new EventSource('/api/events');

    // Event'leri dinle
    const handleEvent = async (event: MessageEvent) => {
      console.log('Event tetiklendi:', event.data);
      await fetchLogs();
      setCurrentPage(1);
    };

    // Tüm event'ler için tek bir handler kullan
    eventSource.onmessage = handleEvent;

    // Cleanup
    return () => {
      eventSource.close();
    };
  }, [fetchLogs]);

  if (loading) {
    return <div className="text-center py-4">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-4">Henüz kayıt bulunmuyor.</div>;
  }

  const getActionText = (action: string): string => {
    switch (action) {
      case 'CREATE':
        return 'Oluşturma';
      case 'UPDATE':
        return 'Güncelleme';
      case 'DELETE':
        return 'Silme';
      default:
        return action;
    }
  };

  const getEntityTypeText = (type: string): string => {
    switch (type) {
      case 'Product':
        return 'Ürün';
      case 'StockMovement':
        return 'Stok Hareketi';
      case 'Sale':
        return 'Satış';
      default:
        return type;
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarih
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlem
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kayıt Tipi
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detaylar
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.user.name || log.user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getActionText(log.action)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getEntityTypeText(log.entityType)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <button
                    onClick={() => toggleRow(log.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    {expandedRows.has(log.id) ? (
                      <>
                        <ChevronDownIcon className="h-4 w-4 mr-1" />
                        Detayları Gizle
                      </>
                    ) : (
                      <>
                        <ChevronRightIcon className="h-4 w-4 mr-1" />
                        Detayları Göster
                      </>
                    )}
                  </button>
                  {expandedRows.has(log.id) && (
                    <pre className="mt-2 p-2 bg-gray-50 rounded-md overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between w-full">
          <div>
            <p className="text-sm text-gray-700">
              Toplam <span className="font-medium">{totalPages}</span> sayfa
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                ${currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 