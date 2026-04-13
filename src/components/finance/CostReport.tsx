import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  ChevronRight,
  ArrowLeft,
  PlusCircle,
  FileText,
  Download,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  ImageIcon,
  Check,
  Filter,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import * as xlsx from 'xlsx';
import { useRef } from 'react';
import { exportTableImage } from '../../utils/reportExport';

import { Employee } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { isActiveWarehouse } from '@/utils/inventory';
import { DetailItem } from '../shared/DetailItem';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { ToastType } from '../shared/Toast';
import { formatCurrency, formatDate, numberToWords } from '@/utils/format';
import { isUUID, getAllowedWarehouses } from '@/utils/helpers';
import { Button } from '../shared/Button';
import { FAB } from '../shared/FAB';
import { ExcelButton } from '../shared/ExcelButton';
import { SortButton } from '../shared/SortButton';
import { SaveImageButton } from '../shared/SaveImageButton';
import { ReportPreviewModal } from '../shared/ReportPreviewModal';

export const CostReport = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [costTypes, setCostTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    search: '',
  });

  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'date'>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [isCapturingTable, setIsCapturingTable] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const logoBase64 = '/logo.png';

  const [masterForm, setMasterForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: user.id,
    employee_name: user.full_name,
    items: [] as any[],
  });

  const [detailForm, setDetailForm] = useState({
    index: -1,
    content: '',
    unit_price: 0,
    quantity: 1,
    total_amount: 0,
    unit: '',
    warehouse_name: '',
    notes: '',
    cost_type: 'Chi phí',
    stock_status: 'Chưa nhập',
    transaction_type: 'Chi',
  });

  useEffect(() => {
    fetchCosts();
    fetchWarehouses();
    fetchCostItems();
    fetchCostTypes();
    fetchUnits();
  }, []);

  const fetchCosts = async () => {
    setLoading(true);
    let query = supabase
      .from('costs')
      .select('*, users(full_name), warehouses(name), materials(name)')
      .or('status.is.null,status.neq.Đã xóa');

    const allowedWhIds = getAllowedWarehouses(user.data_view_permission);
    if (allowedWhIds) {
      query = query.in('warehouse_id', allowedWhIds);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching costs:', error);
    } else if (data) {
      setCosts(data);
    }
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('id, name, status')
      .or('status.is.null,status.neq.Đã xóa');
    if (data) {
      setWarehouses(data.filter(isActiveWarehouse));
    }
  };

  const fetchCostItems = async (group?: string) => {
    let query = supabase.from('costs').select('content');
    if (group) {
      query = query.eq('cost_type', group);
    }
    const { data } = await query;
    if (data) {
      const unique = Array.from(new Set(data.map((item) => item.content)))
        .filter(Boolean)
        .map((name) => ({ id: name as string, name: name as string }));
      setMaterials(unique); // Reusing materials state for Item suggestions
    }
  };

  const fetchCostTypes = async () => {
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map((item) => item.cost_type)))
        .filter(Boolean)
        .map((name) => ({ id: name, name }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map((item) => item.unit)))
        .filter(Boolean)
        .map((name) => ({ id: name, name }));
      setUnits(uniqueUnits);
    }
  };

  const generateCostCode = (dateStr: string, empId: string) => {
    const dateObj = new Date(dateStr);
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear()).slice(-2);
    return `${empId.toUpperCase()}-${d}${m}${y}`;
  };

  const handleAddReport = () => {
    setMasterForm({
      date: new Date().toISOString().split('T')[0],
      employee_id: user.id,
      employee_name: user.full_name,
      items: [],
    });
    setShowMasterModal(true);
  };

  const handleEditReport = (group: any) => {
    setMasterForm({
      date: group.date,
      employee_id: group.employee_id,
      employee_name: group.employee_name,
      items: group.items.map((item: any) => ({
        ...item,
        warehouse_name: item.warehouses?.name || '',
        cost_type: item.cost_type || 'Chi phí',
        stock_status: item.stock_status || 'Chưa nhập',
      })),
    });
    setShowMasterModal(true);
  };

  const handleAddItem = () => {
    setDetailForm({
      index: -1,
      content: '',
      unit_price: 0,
      quantity: 1,
      total_amount: 0,
      unit: '',
      warehouse_name: '',
      notes: '',
      cost_type: 'Chi phí',
      stock_status: 'Chưa nhập',
    });
    setShowDetailModal(true);
  };

  const handleEditItem = (index: number) => {
    const item = masterForm.items[index];
    setDetailForm({
      index,
      ...item,
    });
    setShowDetailModal(true);
  };

  const handleSaveDetail = () => {
    if (!detailForm.content || !detailForm.cost_type) {
      if (addToast) addToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      else alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const newItem = {
      ...detailForm,
      total_amount: detailForm.quantity * detailForm.unit_price,
    };

    if (detailForm.index >= 0) {
      const newItems = [...masterForm.items];
      newItems[detailForm.index] = newItem;
      setMasterForm({ ...masterForm, items: newItems });
    } else {
      setMasterForm({ ...masterForm, items: [...masterForm.items, newItem] });
    }
    setShowDetailModal(false);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = masterForm.items.filter((_, i) => i !== index);
    setMasterForm({ ...masterForm, items: newItems });
  };

  const handleSaveAll = async () => {
    if (masterForm.items.length === 0) {
      if (addToast) addToast('Vui lòng thêm ít nhất một hạng mục chi', 'error');
      else alert('Vui lòng thêm ít nhất một hạng mục chi');
      return;
    }

    setSubmitting(true);
    try {
      const costCode = generateCostCode(masterForm.date, masterForm.employee_id);

      const itemsToInsert = await Promise.all(
        masterForm.items.map(async (item) => {
          let warehouse_id = null;
          if (item.warehouse_name) {
            if (isUUID(item.warehouse_name)) {
              warehouse_id = item.warehouse_name;
            } else {
              const existingWh = warehouses.find(
                (w) => w.name.toLowerCase() === item.warehouse_name.toLowerCase(),
              );
              if (existingWh) {
                warehouse_id = existingWh.id;
              } else {
                const { data: newWh } = await supabase
                  .from('warehouses')
                  .insert([{ name: item.warehouse_name }])
                  .select();
                if (newWh) warehouse_id = newWh[0].id;
              }
            }
          }

          const payload = {
            date: masterForm.date,
            cost_code: costCode,
            employee_id: masterForm.employee_id,
            transaction_type: item.transaction_type || 'Chi',
            cost_type: item.cost_type,
            content: item.content,
            warehouse_id,
            material_id: null,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_amount: item.quantity * item.unit_price,
            notes: item.notes,
            stock_status: item.stock_status,
            status: 'Chờ duyệt',
          };

          return item.id ? { ...payload, id: item.id } : payload;
        }),
      );

      const newItems = itemsToInsert.filter((item) => !item.id);
      const existingItems = itemsToInsert.filter((item) => item.id);

      if (newItems.length > 0) {
        const { error } = await supabase.from('costs').insert(newItems);
        if (error) throw error;
      }

      if (existingItems.length > 0) {
        for (const item of existingItems) {
          const { error } = await supabase.from('costs').update(item).eq('id', item.id);
          if (error) throw error;
        }
      }

      setShowMasterModal(false);
      fetchCosts();
      if (addToast) addToast('Lưu báo cáo chi phí thành công!', 'success');
    } catch (err: any) {
      if (addToast) addToast('Lỗi khi lưu: ' + err.message, 'error');
      else alert('Lỗi khi lưu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedDataObj = costs.reduce((acc: any, current: any) => {
    const code = current.cost_code || generateCostCode(current.date, current.employee_id);
    const employeeName = current.users?.full_name || 'N/A';

    if (acc[code]) {
      if (current.transaction_type === 'Thu') {
        acc[code].total_amount -= current.total_amount;
      } else {
        acc[code].total_amount += current.total_amount;
      }
      acc[code].items.push(current);

      // Update overall status if any item is pending or rejected
      if (current.status === 'Chờ duyệt') acc[code].status = 'Chờ duyệt';
      else if (current.status === 'Từ chối' && acc[code].status !== 'Chờ duyệt')
        acc[code].status = 'Từ chối';

      // Update date to latest if applicable
      if (new Date(current.date) > new Date(acc[code].date)) {
        acc[code].date = current.date;
      }
    } else {
      acc[code] = {
        cost_code: code,
        date: current.date,
        employee_id: current.employee_id,
        employee_name: employeeName,
        total_amount:
          current.transaction_type === 'Thu' ? -current.total_amount : current.total_amount,
        status: current.status || 'Chờ duyệt',
        items: [current],
      };
    }
    return acc;
  }, {});

  const filteredHistory = Object.values(groupedDataObj)
    .filter((group: any) => {
      if (filters.fromDate && group.date < filters.fromDate) return false;
      if (filters.toDate && group.date > filters.toDate) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        return (
          (group.cost_code || '').toLowerCase().includes(query) ||
          (group.employee_name || '').toLowerCase().includes(query) ||
          group.items.some(
            (item: any) =>
              (item.content || '').toLowerCase().includes(query) ||
              (item.cost_type || '').toLowerCase().includes(query) ||
              (item.notes || '').toLowerCase().includes(query),
          )
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'price') return b.total_amount - a.total_amount;
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return (
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        (b.cost_code || '').localeCompare(a.cost_code || '')
      );
    });

  const handleExportImage = () => {
    setShowReportPreview(true);
  };

  const handleExportExcel = () => {
    if (costs.length === 0) {
      if (addToast) addToast('Không có dữ liệu để xuất', 'warning');
      return;
    }

    try {
      const exportData = costs.map((item) => ({
        Mã: item.cost_code || '',
        Ngày: formatDate(item.date),
        'Nhân viên': item.users?.full_name || '',
        'Loại chi phí': item.cost_type || '',
        'Nội dung': item.content || item.materials?.name || '',
        Kho: item.warehouses?.name || '',
        'Vật tư': item.materials?.name || '',
        SL: item.quantity || 1,
        'Đơn giá': item.unit_price || 0,
        'Thành tiền': item.transaction_type === 'Thu' ? item.total_amount : -item.total_amount,
        'Ghi chú': item.notes || '',
      }));

      const ws = xlsx.utils.json_to_sheet(exportData);

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const fileName = `ChiPhi_${month}_${year}.xlsx`;

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'ChiPhi');
      xlsx.writeFile(wb, fileName);

      if (addToast) addToast('Xuất Excel thành công!', 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      if (addToast) addToast('Lỗi xuất Excel: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageBreadcrumb title="Báo cáo chi phí" onBack={onBack} />
        <div className="flex items-center gap-1.5 justify-end flex-1">
          <ExcelButton onClick={handleExportExcel} />

          <div className="flex items-center gap-1.5 ml-1">
            <SortButton
              currentSort={sortBy}
              onSortChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'newest', label: 'Sắp xếp: Mới nhất' },
                { value: 'price', label: 'Sắp xếp: Thành tiền' },
                { value: 'date', label: 'Sắp xếp: Ngày chi' },
              ]}
            />
            <Button
              size="icon"
              variant={showFilter ? 'primary' : 'outline'}
              onClick={() => setShowFilter((f) => !f)}
              icon={Search}
              className={showFilter ? '' : 'border-gray-200'}
            />
            <SaveImageButton
              onClick={handleExportImage}
              isCapturing={isCapturingTable}
              title="Lưu ảnh báo cáo chi phí"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="z-20"
            style={{ overflow: showFilter ? 'visible' : 'hidden' }}
          >
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Chọn thời gian */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                  <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest text-center">
                    Khoảng thời gian
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                        Từ ngày
                      </label>
                      <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                        Đến ngày
                      </label>
                      <input
                        type="date"
                        value={filters.toDate}
                        onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Tìm kiếm */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                      Tìm kiếm báo cáo
                    </label>
                    <div className="relative group">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
                        size={16}
                      />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        placeholder="Mã phí, tên nhân viên, nội dung..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Dashboard - Moved from Costs.tsx */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {[
          {
            label: 'Tổng Thu',
            val: formatCurrency(
              costs
                .filter((c) => c.transaction_type === 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'green',
            icon: ArrowDownCircle,
          },
          {
            label: 'Tổng Chi',
            val: formatCurrency(
              costs
                .filter((c) => c.transaction_type !== 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'red',
            icon: ArrowUpCircle,
          },
          {
            label: 'Lợi Nhuận',
            val: formatCurrency(
              costs
                .filter((c) => c.transaction_type === 'Thu')
                .reduce((s, c) => s + Number(c.total_amount), 0) -
                costs
                  .filter((c) => c.transaction_type !== 'Thu')
                  .reduce((s, c) => s + Number(c.total_amount), 0),
            ),
            color: 'blue',
            icon: Wallet,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-4 rounded-2xl shadow-sm border border-${stat.color}-100 flex items-center gap-4`}
          >
            <div
              className={`w-12 h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-full flex items-center justify-center shrink-0`}
            >
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">{stat.label}</p>
              <p className={`text-xl font-black text-${stat.color}-600`}>{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px] whitespace-nowrap">
            <thead>
              <tr className="bg-primary/5 text-primary border-b border-primary/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5 w-16 text-center">
                  STT
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Mã phí
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Ngày ghi
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Nhân sự
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Nội dung chính
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5 text-center">
                  Hạng mục
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic border-r border-primary/5 text-right">
                  Tổng tiền
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest italic text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                    Đang tải báo cáo...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold italic">
                    Chưa có dữ liệu nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredHistory.map((group: any, idx) => (
                  <tr
                    key={group.cost_code}
                    className="hover:bg-primary/5 transition-all group cursor-pointer"
                    onClick={() => handleEditReport(group)}
                  >
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black text-gray-300 group-hover:text-primary/40 transition-colors">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                        {group.cost_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600 italic">
                      {formatDate(group.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black uppercase border border-primary/20">
                          {group.employee_name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-xs font-black text-gray-800 tracking-tight">
                          {group.employee_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500 break-words whitespace-normal max-w-xs line-clamp-1">
                      {group.items[0]?.content || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md text-[10px] font-black">
                        {group.items.length} mục
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm font-black text-right ${group.total_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {formatCurrency(group.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReport(group);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors border border-primary/10"
                        >
                          <Search size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); /* TODO: Delete report logic */
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Ref for Report Capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={reportRef} className="p-8 bg-white" style={{ width: '1400px' }}>
          {/* Premium Branding Header */}
          <div className="flex items-center gap-6 mb-10">
            <img
              src={logoBase64}
              alt="Logo"
              className="w-24 h-24 rounded-3xl object-contain shadow-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                CDX - CON ĐƯỜNG XANH
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">
                Hệ thống quản lý kho và nhân sự
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#2D5A27] tracking-tighter mb-1">
              BÁO CÁO CHI PHÍ
            </h1>
            <p className="text-sm font-bold text-gray-500 italic">
              Dữ liệu vận hành hệ thống CDX-2026 • {new Date().toLocaleDateString('vi-VN')}
            </p>
          </div>

          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Mã phí</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ngày</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Nội dung
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Chứng từ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((group: any) => (
                <tr key={group.cost_code} className="border-b border-gray-100">
                  <td className="px-4 py-3.5 text-xs font-black text-primary uppercase">
                    {group.cost_code}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-600">
                    {formatDate(group.date)}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-800 truncate max-w-xs">
                    {group.items[0]?.content}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                    {group.items.length} hạng mục
                  </td>
                  <td
                    className={`px-4 py-3.5 text-xs font-black text-right ${group.total_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {formatCurrency(group.total_amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="px-4 py-4 text-xs text-right italic">
                  TỔNG CHI PHÍ THỰC TẾ:
                </td>
                <td className="px-4 py-4 text-sm text-red-600 text-right">
                  {formatCurrency(filteredHistory.reduce((s, g) => s + g.total_amount, 0))}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} •{' '}
              {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">
                CDX ERP SYSTEM
              </span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">
                Financial Integrity
              </span>
            </div>
          </div>
        </div>
      </div>
      <ReportPreviewModal
        isOpen={showReportPreview}
        onClose={() => setShowReportPreview(false)}
        title="Báo cáo chi phí tổng hợp"
        isCapturing={isCapturingTable}
        onExport={() => {
          if (reportRef.current) {
            exportTableImage({
              element: reportRef.current,
              fileName: `Bao_Cao_Chi_Phi_Tong_Hop_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`,
              addToast,
              onStart: () => setIsCapturingTable(true),
              onEnd: () => {
                setIsCapturingTable(false);
                setShowReportPreview(false);
              },
            });
          }
        }}
      >
        <div className="p-12 bg-white">
          {/* Logo & Header */}
          <div className="flex items-center gap-6 mb-10">
            <img
              src={logoBase64}
              alt="Logo"
              className="w-24 h-24 rounded-3xl object-contain shadow-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                CDX - CON ĐƯỜNG XANH
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">
                Hệ thống quản lý kho và nhân sự
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black italic text-[#245D51] tracking-tighter mb-1 uppercase">
              BÁO CÁO TỔNG HỢP
            </h1>
            <p className="text-sm font-bold text-gray-500 italic uppercase">
              Operational Cost Summary • CDX ERP v2026
            </p>
          </div>

          {/* Filters Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  Cấu hình báo cáo
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-gray-500 font-bold">Từ ngày:</p>
                  <p className="text-md font-black text-gray-900">
                    {filters.fromDate ? formatDate(filters.fromDate) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 font-bold">Đến ngày:</p>
                  <p className="text-md font-black text-gray-900">
                    {filters.toDate ? formatDate(filters.toDate) : '—'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gray-800 rounded-full" />
                <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">
                  Thông số hệ thống
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-gray-500 font-bold">Tổng lô:</p>
                  <p className="text-md font-black text-primary italic">
                    {filteredHistory.length} cụm phí
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 font-bold">Người xuất:</p>
                  <p className="text-md font-black text-gray-900">{user.full_name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse min-w-[1000px] whitespace-nowrap">
            <thead>
              <tr className="bg-primary/5 text-primary border-b-2 border-primary/20">
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5 w-16 text-center">
                  STT
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Mã phí
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Ngày ghi
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Nhân sự
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5">
                  Nội dung chính
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic border-r border-primary/5 text-center">
                  Hạng mục
                </th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest italic text-right">
                  Tổng tiền
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.map((group: any, idx) => (
                <tr key={group.cost_code} className="hover:bg-primary/5 transition-all group">
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-black text-gray-300">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[11px] font-black uppercase tracking-widest border border-primary/10">
                      {group.cost_code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-600 italic">
                    {formatDate(group.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-gray-900 uppercase">
                      {group.employee_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500 truncate max-w-[200px] block">
                      {group.items[0]?.content || 'Chi phí hệ thống'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-black font-mono">
                      {group.items.length} mục
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-black text-gray-900 tabular-nums">
                      {formatCurrency(group.total_amount)}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-primary/5 font-black border-t-2 border-primary/20">
                <td
                  colSpan={6}
                  className="px-6 py-4 text-xs uppercase tracking-widest italic text-right"
                >
                  Tổng phát sinh ròng:
                </td>
                <td className="px-6 py-4 text-sm text-right tabular-nums text-primary underline decoration-double">
                  {formatCurrency(filteredHistory.reduce((s, g) => s + g.total_amount, 0))}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 font-bold">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN')} •{' '}
              {new Date().toLocaleTimeString('vi-VN')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-300 uppercase italic">
                CDX ERP SYSTEM
              </span>
              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-300 uppercase">
                Operational Excellence
              </span>
            </div>
          </div>
        </div>
      </ReportPreviewModal>
    </div>
  );
};
