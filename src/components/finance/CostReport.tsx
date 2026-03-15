import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, ChevronRight, ArrowLeft, PlusCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { DetailItem } from '../shared/DetailItem';
import { NumericInput } from '../shared/NumericInput';
import { CreatableSelect } from '../shared/CreatableSelect';
import { formatCurrency, formatDate, numberToWords } from '../../utils/format';

export const CostReport = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
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

  const [masterForm, setMasterForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: user.id,
    employee_name: user.full_name,
    items: [] as any[]
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
    stock_status: 'Chưa nhập'
  });

  useEffect(() => {
    fetchCosts();
    fetchWarehouses();
    fetchMaterials();
    fetchCostTypes();
    fetchUnits();
  }, []);

  const fetchCosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('costs')
      .select('*, users(full_name), warehouses(name), materials(name)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching costs:', error);
    } else if (data) {
      setCosts(data);
    }
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name');
    if (data) setWarehouses(data);
  };

  const fetchMaterials = async () => {
    const { data } = await supabase.from('materials').select('id, name');
    if (data) setMaterials(data);
  };

  const fetchCostTypes = async () => {
    const { data } = await supabase.from('costs').select('cost_type');
    if (data) {
      const uniqueTypes = Array.from(new Set(data.map(item => item.cost_type)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
      setCostTypes(uniqueTypes);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('costs').select('unit');
    if (data) {
      const uniqueUnits = Array.from(new Set(data.map(item => item.unit)))
        .filter(Boolean)
        .map((name, index) => ({ id: index, name }));
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
      items: []
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
        stock_status: item.stock_status || 'Chưa nhập'
      }))
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
      stock_status: 'Chưa nhập'
    });
    setShowDetailModal(true);
  };

  const handleEditItem = (index: number) => {
    const item = masterForm.items[index];
    setDetailForm({
      index,
      ...item
    });
    setShowDetailModal(true);
  };

  const handleSaveDetail = () => {
    if (!detailForm.content || !detailForm.cost_type) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    const newItem = {
      ...detailForm,
      total_amount: detailForm.quantity * detailForm.unit_price
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
      alert('Vui lòng thêm ít nhất một hạng mục chi');
      return;
    }

    setSubmitting(true);
    try {
      const costCode = generateCostCode(masterForm.date, masterForm.employee_id);

      const itemsToInsert = await Promise.all(masterForm.items.map(async (item) => {
        let warehouse_id = null;
        if (item.warehouse_name) {
          const existingWh = warehouses.find(w => w.name.toLowerCase() === item.warehouse_name.toLowerCase());
          if (existingWh) {
            warehouse_id = existingWh.id;
          } else {
            const { data: newWh } = await supabase.from('warehouses').insert([{ name: item.warehouse_name }]).select();
            if (newWh) warehouse_id = newWh[0].id;
          }
        }

        let material_id = null;
        if (item.content) {
          const existingMat = materials.find(m => m.name.toLowerCase() === item.content.toLowerCase());
          if (existingMat) {
            material_id = existingMat.id;
          } else {
            const { data: newMat } = await supabase.from('materials').insert([{ name: item.content }]).select();
            if (newMat) material_id = newMat[0].id;
          }
        }

        const payload = {
          date: masterForm.date,
          cost_code: costCode,
          employee_id: masterForm.employee_id,
          cost_type: item.cost_type,
          content: item.content,
          warehouse_id,
          material_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_amount: item.total_amount,
          notes: item.notes,
          stock_status: item.stock_status
        };

        return item.id ? { ...payload, id: item.id } : payload;
      }));

      const newItems = itemsToInsert.filter(item => !item.id);
      const existingItems = itemsToInsert.filter(item => item.id);

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
      alert('Lưu báo cáo chi phí thành công!');
    } catch (err: any) {
      alert('Lỗi khi lưu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedData = costs.reduce((acc: any[], current: any) => {
    const date = current.date;
    const employeeId = current.employee_id;
    const employeeName = current.users?.full_name || 'N/A';

    const existingGroup = acc.find(g => g.date === date && g.employee_id === employeeId);

    if (existingGroup) {
      existingGroup.total_amount += current.total_amount;
      existingGroup.items.push(current);
    } else {
      acc.push({
        date,
        employee_id: employeeId,
        employee_name: employeeName,
        total_amount: current.total_amount,
        items: [current]
      });
    }
    return acc;
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageBreadcrumb title="Báo cáo chi phí" onBack={onBack} />
        <button
          onClick={handleAddReport}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Thêm báo cáo
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${selectedGroup ? 'hidden lg:block' : 'block'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày chi</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Người chi</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Tổng số tiền</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Đang tải dữ liệu...</td></tr>
                ) : groupedData.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Chưa có dữ liệu chi phí</td></tr>
                ) : (
                  groupedData.map((group, idx) => (
                    <tr
                      key={`${group.date}-${group.employee_id}-${idx}`}
                      onClick={() => { setSelectedGroup(group); setSelectedItem(null); }}
                      className={`hover:bg-primary/5 cursor-pointer transition-colors ${selectedGroup?.date === group.date && selectedGroup?.employee_id === group.employee_id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(group.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{group.employee_name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{formatCurrency(group.total_amount)}</td>
                      <td className="px-4 py-3 text-gray-400 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditReport(group); }}
                          className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedGroup && (
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedGroup(null)} className="lg:hidden p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <ArrowLeft size={18} className="text-gray-500" />
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Hạng mục chi</h3>
                    <p className="text-[10px] text-gray-500">{formatDate(selectedGroup.date)} - {selectedGroup.employee_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">{selectedGroup.items.length} mục</span>
                  <button onClick={() => setSelectedGroup(null)} className="hidden lg:block p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày chi</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loại chi phí</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedGroup.items.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 font-medium">{item.cost_type}</td>
                        <td className="px-4 py-3 text-xs font-bold text-red-600 text-right">{formatCurrency(item.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Chi tiết khoản chi</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{selectedItem.cost_code}-{String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <DetailItem label="ID_ChiTiet" value={`${selectedItem.cost_code}-${String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')}`} />
                  <DetailItem label="ID_ChiPhi" value={selectedItem.cost_code} />
                  <DetailItem label="Nội dung chi" value={selectedItem.content} />
                  <DetailItem label="Đơn giá" value={formatCurrency(selectedItem.total_amount / (selectedItem.quantity || 1))} />
                  <DetailItem label="Số lượng" value={selectedItem.quantity} />
                  <DetailItem label="Số tiền" value={formatCurrency(selectedItem.total_amount)} color="text-red-600 font-bold text-lg" />
                  <DetailItem label="Ngày chi" value={formatDate(selectedItem.date)} />
                  <DetailItem label="Loại chi phí" value={selectedItem.cost_type} />
                  <DetailItem label="Đơn vị tính" value={selectedItem.unit} />
                  <DetailItem label="Tên kho" value={selectedItem.warehouses?.name || 'N/A'} />
                  <DetailItem label="Người chi" value={selectedItem.users?.full_name} />
                  <DetailItem label="TT" value={String(selectedGroup.items.indexOf(selectedItem) + 1).padStart(2, '0')} />
                  <DetailItem label="Loại hình chi" value={selectedItem.cost_type || 'N/A'} />
                  <DetailItem label="Tình trạng nhập kho" value={selectedItem.stock_status || 'N/A'} />
                  <DetailItem label="Ghi chú" value={selectedItem.notes || 'Không có ghi chú'} className="col-span-full" />
                  <div className="col-span-full pt-4 border-t border-gray-50">
                    <DetailItem label="Số tiền bằng chữ" value={numberToWords(selectedItem.total_amount)} color="text-primary font-medium italic" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMasterModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><FileText size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Chi phí không xóa</h3>
                    <p className="text-xs text-white/70">Mã: {generateCostCode(masterForm.date, masterForm.employee_id)}</p>
                  </div>
                </div>
                <button onClick={() => setShowMasterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">ID_ChiPhi</label>
                    <input type="text" readOnly value={generateCostCode(masterForm.date, masterForm.employee_id)} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày chi</label>
                    <input
                      type="date"
                      value={masterForm.date}
                      onChange={(e) => setMasterForm({ ...masterForm, date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Người chi</label>
                    <input type="text" readOnly value={masterForm.employee_name} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Hạng mục chi</h4>
                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-primary hover:text-primary-hover font-bold text-sm transition-colors"
                    >
                      <PlusCircle size={18} /> Mới
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100/50">
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">TT</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Nội dung</th>
                          <th className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase text-right">Số tiền</th>
                          <th className="px-4 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {masterForm.items.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic text-xs">Chưa có hạng mục nào. Nhấn "Mới" để thêm.</td></tr>
                        ) : (
                          masterForm.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors group">
                              <td className="px-4 py-2 text-xs text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2 text-xs font-medium text-gray-700">{item.content}</td>
                              <td className="px-4 py-2 text-xs font-bold text-primary text-right">{formatCurrency(item.total_amount)}</td>
                              <td className="px-4 py-2 flex items-center justify-end gap-2">
                                <button onClick={() => handleEditItem(idx)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                                <button onClick={() => handleRemoveItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-primary/5 p-6 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Tổng số tiền</span>
                    <span className="text-xl font-black text-primary">
                      {formatCurrency(masterForm.items.reduce((sum, item) => sum + item.total_amount, 0))}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tổng tiền bằng chữ</p>
                    <p className="text-xs font-medium text-primary italic">
                      {numberToWords(masterForm.items.reduce((sum, item) => sum + item.total_amount, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowMasterModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                <button
                  onClick={handleSaveAll}
                  disabled={submitting}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu báo cáo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><PlusCircle size={24} /></div>
                  <h3 className="font-bold text-lg">Chi phí chi tiết</h3>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">ID_ChiPhi</label>
                      <input type="text" readOnly value={generateCostCode(masterForm.date, masterForm.employee_id)} className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500 outline-none" />
                    </div>

                    <CreatableSelect
                      label="Nội dung chi *"
                      value={detailForm.content}
                      options={materials}
                      onChange={(val) => setDetailForm({ ...detailForm, content: val })}
                      onCreate={(val) => setDetailForm({ ...detailForm, content: val })}
                      placeholder="Chọn nội dung..."
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <NumericInput
                        label="Đơn giá"
                        value={detailForm.unit_price}
                        onChange={(val) => setDetailForm({ ...detailForm, unit_price: val })}
                      />
                      <NumericInput
                        label="Số lượng"
                        value={detailForm.quantity}
                        onChange={(val) => setDetailForm({ ...detailForm, quantity: val })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Số tiền</label>
                      <div className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold text-primary">
                        {formatCurrency(detailForm.quantity * detailForm.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <CreatableSelect
                      label="Loại chi phí *"
                      value={detailForm.cost_type}
                      options={costTypes}
                      onChange={(val) => setDetailForm({ ...detailForm, cost_type: val })}
                      onCreate={(val) => setDetailForm({ ...detailForm, cost_type: val })}
                      placeholder="Chọn loại chi phí..."
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <CreatableSelect
                        label="Đơn vị tính"
                        value={detailForm.unit}
                        options={units}
                        onChange={(val) => setDetailForm({ ...detailForm, unit: val })}
                        onCreate={(val) => setDetailForm({ ...detailForm, unit: val })}
                        placeholder="Chọn/Nhập..."
                      />
                      <CreatableSelect
                        label="Tên kho"
                        value={detailForm.warehouse_name}
                        options={warehouses}
                        onChange={(val) => setDetailForm({ ...detailForm, warehouse_name: val })}
                        onCreate={(val) => setDetailForm({ ...detailForm, warehouse_name: val })}
                        placeholder="Chọn kho..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Loại hình chi</label>
                        <div className="flex gap-2">
                          {['Chi phí', 'Nhập kho'].map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setDetailForm({ ...detailForm, cost_type: cat })}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${detailForm.cost_type === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Tình trạng nhập kho</label>
                        <select
                          value={detailForm.stock_status}
                          onChange={(e) => setDetailForm({ ...detailForm, stock_status: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Chưa nhập">Chưa nhập</option>
                          <option value="Đã nhập">Đã nhập</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                      <textarea
                        rows={3}
                        value={detailForm.notes}
                        onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Số tiền bằng chữ</p>
                  <p className="text-xs font-medium text-gray-600 italic">
                    {numberToWords(detailForm.quantity * detailForm.unit_price)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDetailModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
