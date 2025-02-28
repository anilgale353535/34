"use client";

import { useState, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import StockMovementList from '../components/stock-movements/StockMovementList';
import StockMovementForm from '../components/stock-movements/StockMovementForm';

export default function StockMovementsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const stockMovementListRef = useRef<{ loadStockMovements: () => Promise<void> }>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stok Hareketleri</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Yeni Stok Hareketi
        </button>
      </div>

      {/* Stok hareketleri listesi */}
      <StockMovementList ref={stockMovementListRef} />

      {/* Stok hareketi ekleme modal */}
      {isFormOpen && (
        <StockMovementForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            stockMovementListRef.current?.loadStockMovements();
          }}
        />
      )}
    </div>
  );
} 