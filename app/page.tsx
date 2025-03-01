"use client";

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { fetchApi } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  todaySalesCount: number;
  todaySalesAmount: number;
  criticalStockCount: number;
}

interface CriticalStock {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStockValue: 0,
    todaySalesCount: 0,
    todaySalesAmount: 0,
    criticalStockCount: 0
  });
  const [criticalStocks, setCriticalStocks] = useState<CriticalStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, criticalStocksData] = await Promise.all([
          fetchApi('/dashboard/stats', { useCache: false }),
          fetchApi('/dashboard/critical-stocks', { useCache: false })
        ]);
        
        setStats(statsData);
        setCriticalStocks(criticalStocksData);
      } catch (error) {
        setError('Veriler yüklenirken bir hata oluştu');
        console.error('Dashboard veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Her 30 saniyede bir verileri güncelle
    const interval = setInterval(loadDashboardData, 30000);

    // Component unmount olduğunda interval'i temizle
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  const dashboardStats = [
    {
      name: 'Toplam Ürün',
      value: stats.totalProducts.toString(),
      icon: CubeIcon,
    },
    {
      name: 'Toplam Stok Değeri',
      value: `₺${stats.totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
      icon: BanknotesIcon,
    },
    {
      name: "Bugünkü Satışlar",
      value: `₺${stats.todaySalesAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (${stats.todaySalesCount} adet)`,
      icon: ShoppingCartIcon,
    },
    {
      name: 'Kritik Stok Uyarıları',
      value: stats.criticalStockCount.toString(),
      icon: ExclamationTriangleIcon,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden bg-white rounded-lg shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </div>
                  <div className="flex items-baseline">
                    <div className="text-2xl font-semibold text-primary">
                      {stat.value}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-primary-100">
                  <stat.icon
                    className="w-6 h-6 text-primary"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Son 7 Günlük Satışlar</h3>
          <div className="h-80">
            {/* Grafik komponenti buraya eklenecek */}
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Kritik Stok Seviyeleri</h3>
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Ürün Adı
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Mevcut Stok
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Minimum Stok
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {criticalStocks.map((stock) => (
                    <tr key={stock.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stock.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {stock.currentStock} {stock.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {stock.minimumStock} {stock.unit}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 