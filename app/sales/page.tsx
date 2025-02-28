"use client";

import { useState, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import SaleList from '../components/sales/SaleList';
import SaleForm from '../components/sales/SaleForm';

export default function SalesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const saleListRef = useRef<{ loadSales: () => Promise<void> }>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Satışlar</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Yeni Satış
        </button>
      </div>

      {/* Satış listesi */}
      <SaleList ref={saleListRef} />

      {/* Satış formu modal */}
      {isFormOpen && (
        <SaleForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            saleListRef.current?.loadSales();
          }}
        />
      )}
    </div>
  );
} 