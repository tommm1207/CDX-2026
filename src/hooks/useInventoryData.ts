import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isActiveWarehouse } from '@/utils/inventory';
import { getAllowedWarehouses } from '@/utils/helpers';

export const useInventoryData = (dataViewPermission?: string) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    try {
      let query = supabase.from('warehouses').select('*').or('status.is.null,status.neq.Đã xóa');
      
      const allowedWhIds = getAllowedWarehouses(dataViewPermission);
      if (allowedWhIds) {
        query = query.in('id', allowedWhIds);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      if (data) {
        setWarehouses(data.filter(isActiveWarehouse));
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  }, [dataViewPermission]);

  const fetchMaterials = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('materials').select('*').order('name');
      if (error) throw error;
      if (data) setMaterials(data);
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('material_groups').select('*').order('name');
      if (error) throw error;
      if (data) setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchWarehouses(), fetchMaterials(), fetchGroups()]);
    setLoading(false);
  }, [fetchWarehouses, fetchMaterials, fetchGroups]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return { warehouses, materials, groups, loading, refreshAll, fetchWarehouses, fetchMaterials, fetchGroups };
};
