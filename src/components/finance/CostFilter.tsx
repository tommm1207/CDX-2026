import { useState, useEffect } from 'react';
import { Filter, RotateCcw, Search, Download, Printer, User, Warehouse, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';
import { Employee } from '../../types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { CustomCombobox } from '../shared/CustomCombobox';
import { DetailItem } from '../shared/DetailItem';
import { formatCurrency, formatDate, numberToWords } from '../../utils/format';

export const CostFilter = ({ user, onBack }: { user: Employee, onBack?: () => void }) => {
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    category: '',
    warehouse: '',
    employee: '',
    content: ''
  });

  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);

  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    handleFilter();
  }, []);

  const fetchFilterOptions = async () => {
    // Fetch unique categories
    const { data: catData } = await supabase.from('costs').select('cost_type');
    if (catData) {
      const unique = Array.from(new Set(catData.map(i => i.cost_type).filter(Boolean)))
        .map((name, id) => ({ id, name }));
      setCategories(unique);
    }

    // Fetch warehouses
    const { data: whData } = await supabase.from('warehouses').select('id, name');
    if (whData) setWarehouses(whData);

    // Fetch employees
    let empQuery = supabase.from('users').select('id, full_name');
    if (user.role !== 'Admin App') {
      empQuery = empQuery.neq('role', 'Admin App');
    }
    const { data: empData } = await empQuery;
    if (empData) setEmployees(empData.map(e => ({ id: e.id, name: e.full_name })));

    // Fetch unique contents
    const { data: contentData } = await supabase.from('costs').select('content');
    if (contentData) {
      const unique = Array.from(new Set(contentData.map(i => i.content).filter(Boolean)))
        .map((name, id) => ({ id, name }));
      setContents(unique);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('costs')
        .select('*, users(full_name), warehouses(name), materials(name)')
        .gte('date', filters.fromDate)
        .lte('date', filters.toDate);

      if (filters.category) query = query.ilike('cost_type', `%${filters.category}%`);
      if (filters.warehouse) {
        const wh = warehouses.find(w => w.name === filters.warehouse);
        if (wh) query = query.eq('warehouse_id', wh.id);
      }
      if (filters.employee) {
        const emp = employees.find(e => e.name === filters.employee);
        if (emp) query = query.eq('employee_id', emp.id);
      }
      if (filters.content) query = query.ilike('content', `%${filters.content}%`);

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      setCosts(data || []);
    } catch (error) {
      console.error('Error filtering costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setIsResetting(true);
    setFilters({
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      category: '',
      warehouse: '',
      employee: '',
      content: ''
    });
    setTimeout(() => {
      handleFilter();
      setIsResetting(false);
    }, 500);
  };

  const totalAmount = costs.reduce((sum, item) => sum + (item.total_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-32">
      <PageBreadcrumb
        title="Lọc chi phí"
        onBack={onBack}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Filter Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Filter size={18} className="text-primary" /> Lọc chi phí
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetFilters}
                className="flex flex-col items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-primary transition-colors group"
              >
                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-primary/10 transition-colors">
                  <motion.div
                    animate={{ rotate: isResetting ? -360 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <RotateCcw size={16} />
                  </motion.div>
                </div>
                Reset bộ lọc
              </motion.button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <CustomCombobox
                label="Nhóm chi phí"
                value={filters.category}
                onChange={(val) => setFilters({ ...filters, category: val })}
                options={categories}
                placeholder="Chọn nhóm chi phí..."
              />

              <CustomCombobox
                label="Chọn kho"
                value={filters.warehouse}
                onChange={(val) => setFilters({ ...filters, warehouse: val })}
                options={warehouses}
                placeholder="Chọn kho..."
              />

              <CustomCombobox
                label="Chọn nhân viên"
                value={filters.employee}
                onChange={(val) => setFilters({ ...filters, employee: val })}
                options={employees}
                placeholder="Chọn nhân viên..."
              />

              <CustomCombobox
                label="Nội dung chi"
                value={filters.content}
                onChange={(val) => setFilters({ ...filters, content: val })}
                options={contents}
                placeholder="Chọn nội dung chi..."
              />

              <div className="pt-4 border-t border-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Tổng số tiền</span>
                  <span className="text-xl font-black text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Bằng chữ</p>
                  <p className="text-xs font-medium text-primary italic">{numberToWords(totalAmount)}</p>
                </div>
              </div>

              <button
                onClick={handleFilter}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RotateCcw size={18} className="animate-spin" /> : <Search size={18} />}
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Kết quả lọc chi phí</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Download size={18} /></button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors"><Printer size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                  <RotateCcw size={32} className="animate-spin" />
                  <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                </div>
              ) : costs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                  <Search size={32} />
                  <p className="text-sm font-medium">Không tìm thấy kết quả nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {costs.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setSelectedCost(item);
                        setShowDetailModal(true);
                      }}
                      className="p-4 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">
                          {item.cost_code || item.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">{formatDate(item.date)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-primary transition-colors">{item.content}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                          <User size={12} /> {item.users?.full_name}
                          {item.warehouses?.name && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <Warehouse size={12} /> {item.warehouses.name}
                            </>
                          )}
                        </div>
                        <span className="text-sm font-black text-primary">{formatCurrency(item.total_amount)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCost && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl"><FileText size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Chi tiết chi phí</h3>
                    <p className="text-xs text-white/70">Mã: {selectedCost.cost_code || selectedCost.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <DetailItem label="Ngày chi" value={formatDate(selectedCost.date)} />
                  <DetailItem label="Người chi" value={selectedCost.users?.full_name} />
                  <DetailItem label="Nội dung" value={selectedCost.content} className="col-span-2" />
                  <DetailItem label="Nhóm chi phí" value={selectedCost.cost_type} />
                  <DetailItem label="Loại hình" value={selectedCost.cost_type} />
                  <DetailItem label="Kho" value={selectedCost.warehouses?.name || 'N/A'} />
                  <DetailItem label="Đơn vị tính" value={selectedCost.unit} />
                  <DetailItem label="Số lượng" value={selectedCost.quantity} />
                  <DetailItem label="Đơn giá" value={formatCurrency(selectedCost.unit_price || 0)} />
                  <DetailItem label="Tổng tiền" value={formatCurrency(selectedCost.total_amount)} color="text-primary font-black text-lg" />
                  <DetailItem label="Trạng thái nhập kho" value={selectedCost.stock_status} />
                  <DetailItem label="Ghi chú" value={selectedCost.notes} className="col-span-2" />
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bằng chữ</p>
                  <p className="text-sm font-bold text-primary italic">{numberToWords(selectedCost.total_amount)}</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-8 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
