"use client";

import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon
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
  Legend,
  ChartData
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

interface SalesData {
  date: string;
  amount: number;
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
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSales, setShowSales] = useState(false);
  const [showAmount, setShowAmount] = useState(false);
  const [showStockValue, setShowStockValue] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, criticalStocksData, salesChartData] = await Promise.all([
          fetchApi('/dashboard/stats', { useCache: false }),
          fetchApi('/dashboard/critical-stocks', { useCache: false }),
          fetchApi('/dashboard/sales-chart', { useCache: false })
        ]);
        
        setStats(statsData as DashboardStats);
        setCriticalStocks(criticalStocksData as CriticalStock[]);
        setSalesData(salesChartData as SalesData[]);
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

  // Chart verilerini hazırla
  const chartData: ChartData<'line'> = {
    labels: salesData.map(data => data.date),
    datasets: [
      {
        label: 'Günlük Satış Tutarı (₺)',
        data: salesData.map(data => data.amount),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

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
      value: showStockValue 
        ? `₺${stats.totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
        : '****** ₺',
      icon: BanknotesIcon,
      showHideButton: true,
      isHidden: !showStockValue,
      onToggle: () => setShowStockValue(!showStockValue)
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
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div
            key={stat.name}
            className="p-6 bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  {stat.showHideButton && (
                    <button
                      onClick={stat.onToggle}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      {stat.isHidden ? (
                        <EyeIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeSlashIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div 
            className="p-6 cursor-pointer select-none"
            onClick={() => setShowSales(!showSales)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Son 7 Günlük Satışlar</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAmount(!showAmount);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {showAmount ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <ChevronDownIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showSales ? 'rotate-180' : ''}`} 
                />
              </div>
            </div>
          </div>
          
          {showSales && (
            <>
              <div className="px-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Tarih
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                          Satış Tutarı
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...salesData].reverse().map((data) => (
                        <tr key={data.date} className={data.amount === 0 ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(data.date).toLocaleDateString('tr-TR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm ${data.amount === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {showAmount 
                                ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.amount)
                                : '****** ₺'
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="h-40 px-6 pb-6">
                <Line data={chartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      enabled: showAmount,
                      callbacks: {
                        label: function(context) {
                          if (!showAmount) return '****** ₺';
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(context.parsed.y);
                          }
                          return label;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false
                      },
                      ticks: {
                        display: false
                      }
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        display: false
                      },
                      ticks: {
                        display: false
                      }
                    }
                  }
                }} />
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-lg">
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