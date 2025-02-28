"use client";

import { Fragment, useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon } from '@heroicons/react/24/outline';
import { fetchApi } from '@/lib/api';

interface Alert {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<Alert[]>('/alerts');
      setAlerts(data);
    } catch (error: unknown) {
      setError('Bildirimler yüklenirken bir hata oluştu');
      console.error('Bildirimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/alerts/${id}/read`, { method: 'PUT' });
      setAlerts(alerts.map(alert => 
        alert.id === id ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
      console.error('Bildirim okundu işaretlenirken hata:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
    // Her 5 dakikada bir bildirimleri güncelle
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative p-1 text-gray-400 bg-white rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
        <span className="sr-only">Bildirimleri görüntüle</span>
        <BellIcon className="w-6 h-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 w-96 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
              Bildirimler
            </div>

            {loading && (
              <div className="px-4 py-2 text-sm text-gray-500">
                Yükleniyor...
              </div>
            )}

            {error && (
              <div className="px-4 py-2 text-sm text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && alerts.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-500">
                Bildirim bulunmuyor
              </div>
            )}

            {alerts.map((alert) => (
              <Menu.Item key={alert.id}>
                {({ active }) => (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className={`
                      ${active ? 'bg-gray-100' : ''}
                      ${!alert.isRead ? 'bg-blue-50' : ''}
                      w-full px-4 py-2 text-sm text-left
                    `}
                  >
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(alert.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 