"use client";

import {
  HomeIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Ürünler', href: '/products', icon: CubeIcon },
  { name: 'Stok Hareketleri', href: '/stock-movements', icon: ArrowsRightLeftIcon },
  { name: 'Satışlar', href: '/sales', icon: ShoppingCartIcon },
  {
    name: 'Raporlar',
    href: '/reports',
    icon: ChartBarIcon,
    children: [
      { name: 'Günlük Rapor', href: '/reports/daily', icon: CalendarIcon },
    ],
  },
  { name: 'Sistem Kayıtları', href: '/audit-logs', icon: ClipboardDocumentListIcon },
  { name: 'Ayarlar', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-0 z-40 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50" onClick={onClose}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-900">
          <SidebarContent pathname={pathname} expandedMenus={expandedMenus} toggleMenu={toggleMenu} onClose={onClose} />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-gray-900">
        <div className="flex flex-col flex-1 w-64">
          <SidebarContent pathname={pathname} expandedMenus={expandedMenus} toggleMenu={toggleMenu} />
        </div>
      </div>
    </>
  );
}

interface SidebarContentProps {
  pathname: string;
  expandedMenus: string[];
  toggleMenu: (menuName: string) => void;
  onClose?: () => void;
}

function SidebarContent({ pathname, expandedMenus, toggleMenu, onClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
      <nav className="flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const isExpanded = expandedMenus.includes(item.name);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.name}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={clsx(
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                    'group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.name}</span>
                  <svg
                    className={`ml-2 h-5 w-5 transform transition-transform duration-150 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.name}</span>
                </Link>
              )}
              
              {hasChildren && isExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={onClose}
                        className={clsx(
                          isChildActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                        )}
                      >
                        <child.icon
                          className={clsx(
                            isChildActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                            'mr-3 flex-shrink-0 h-5 w-5'
                          )}
                          aria-hidden="true"
                        />
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
} 