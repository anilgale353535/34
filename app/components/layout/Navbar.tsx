"use client";

import { Fragment, useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Cookies from 'js-cookie';
import NotificationDropdown from '../notifications/NotificationDropdown';
import QuickStockModal from '../modals/QuickStockModal';

function getInitials(username: string): string {
  return username
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Navbar({ onMobileMenuClick }: { onMobileMenuClick?: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [showQuickStock, setShowQuickStock] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeypressTime, setLastKeypressTime] = useState(0);

  useEffect(() => {
    // Kullanıcı adını localStorage'dan al
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Barkod okuyucu için global keypress listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Stok hareketi modalı açıksa barkod okuyucuyu devre dışı bırak
      const stockMovementModal = document.querySelector('[data-modal="stock-movement"]');
      if (stockMovementModal) return;

      const currentTime = new Date().getTime();
      
      // Eğer son tuş basımından 100ms geçtiyse yeni bir barkod taraması başlat
      if (currentTime - lastKeypressTime > 200) {
        setBarcodeBuffer('');
      }
      
      // Enter tuşuna basıldıysa barkodu işle
      if (e.key === 'Enter' && barcodeBuffer) {
        e.preventDefault();
        handleBarcodeComplete(barcodeBuffer);
        setBarcodeBuffer('');
      } else if (e.key.length === 1) { // Sadece tek karakterli tuşları al
        setBarcodeBuffer(prev => prev + e.key);
      }
      
      setLastKeypressTime(currentTime);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [barcodeBuffer, lastKeypressTime]);

  const handleBarcodeComplete = async (barcode: string) => {
    setScannedBarcode(barcode);
    setShowQuickStock(true);
  };

  const handleLogout = () => {
    // Token ve kullanıcı bilgilerini temizle
    Cookies.remove('token');
    localStorage.removeItem('username');
    
    // Login sayfasına yönlendir
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={onMobileMenuClick}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Barkod Input Alanı */}
          <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-start">
            <div className="max-w-lg w-full lg:max-w-xs">
              <label htmlFor="barcode" className="sr-only">Barkod</label>
              <div className="relative">
                <input
                  id="barcode"
                  type="text"
                  value={barcodeBuffer}
                  onChange={(e) => setBarcodeBuffer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeComplete(barcodeBuffer);
                      setBarcodeBuffer('');
                    }
                  }}
                  className="block w-full rounded-md border-0 bg-gray-700 py-1.5 pl-3 pr-3 text-white placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="Barkod okutun veya girin..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <NotificationDropdown />

            <div className="flex items-center ml-4">
              <Menu as="div" className="relative ml-3">
                <Menu.Button className="flex items-center max-w-xs text-sm bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                  <span className="sr-only">Kullanıcı menüsünü aç</span>
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {getInitials(username)}
                    </span>
                  </div>
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
                  <Menu.Items className="absolute right-0 z-10 w-48 py-1 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                        >
                          Çıkış Yap
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stock Modal */}
      {showQuickStock && (
        <QuickStockModal
          barcode={scannedBarcode}
          onClose={() => {
            setShowQuickStock(false);
            setScannedBarcode('');
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </nav>
  );
} 