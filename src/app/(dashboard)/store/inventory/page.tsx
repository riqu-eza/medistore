'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { InventoryTable } from '@/components/store/InventoryTable';
import { Inventory, Drug, Batch, Store } from '@prisma/client';

type InventoryWithDetails = Inventory & {
  drug: Drug;
  batch: Batch;
};

export default function StoreInventoryPage() {
  const [inventory, setInventory] = useState<InventoryWithDetails[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [invRes, storesRes] = await Promise.all([
        fetch('/api/store/inventory'),
        fetch('/api/admin/stores') // you'll need an endpoint to list stores for transfer destination
      ]);
      const invData = await invRes.json();
      const storesData = await storesRes.json();
      console.log('Inventory API response:', storesData);
      if (!invRes.ok) throw new Error(invData.error);
      setInventory(invData.data);
      if (storesRes.ok) setStores(storesData.stores);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Error: {error}</div>;

  return <InventoryTable inventory={inventory} stores={stores} onRefresh={fetchData} />;
}