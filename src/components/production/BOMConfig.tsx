import { useState, useEffect, FormEvent } from 'react';
import { Settings, Plus, Edit, Trash2, X, Package, Save, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, Material, BOMConfig as IBOMConfig, BOMItem } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { CustomCombobox } from '../shared/CustomCombobox';
import { FAB } from '../shared/FAB';

export const BOMConfig = ({ user, onBack, addToast }: {
  user: Employee,
  onBack?: () => void,
  addToast?: (message: string, type?: ToastType) => void
}) => {
  const [boms, setBoms] = useState<IBOMConfig[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    id?: string;
    product_item_id: string;
    name: string;
    is_two_stage?: boolean;
    notes: string;
    items: { material_item_id: string; quantity_per_unit: number; unit: string }[];
  }>({
    product_item_id: '',
    name: '',
    is_two_stage: false,
    notes: '',
    items: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bomRes, matRes] = await Promise.all([
        supabase.from('bom_configs').select('*').order('created_at', { ascending: false }),
        supabase.from('materials').select('*').order('name')
      ]);

      if (bomRes.data) setBoms(bomRes.data);
      if (matRes.data) setMaterials(matRes.data);
    } catch (err) {
      console.error('Error fetching BOM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (bom: IBOMConfig) => {
    setLoading(true);
    const { data: items } = await supabase
      .from('bom_items')
      .select('*')
      .eq('bom_id', bom.id);
    
    setFormData({
      id: bom.id,
      product_item_id: bom.product_item_id,
      name: bom.name,
      is_two_stage: bom.is_two_stage,
      notes: bom.notes || '',
      items: (items || []).map(it => ({
        material_item_id: it.material_item_id,
        quantity_per_unit: it.quantity_per_unit,
        unit: it.unit
      }))
    });
    setIsEditing(true);
    setShowModal(true);
    setLoading(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { material_item_id: '', quantity_per_unit: 0, unit: '' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    
    // Auto-fill unit if material is selected
    if (field === 'material_item_id') {
      const mat = materials.find(m => m.id === value);
      if (mat) newItems[index].unit = mat.unit || '';
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.product_item_id || formData.items.length === 0) {
      if (addToast) addToast('Vui lòng chọn thành phẩm và ít nhất 1 nguyên liệu', 'info');
      return;
    }

    setSubmitting(true);
    try {
      let bomId = formData.id;
      
      if (isEditing && bomId) {
        // Update header
        await supabase.from('bom_configs').update({
          product_item_id: formData.product_item_id,
          name: formData.name,
          is_two_stage: formData.is_two_stage,
          notes: formData.notes
        }).eq('id', bomId);
        
        // Delete old items and insert new ones
        await supabase.from('bom_items').delete().eq('bom_id', bomId);
      } else {
        // Insert header
        const { data: newBom, error: headError } = await supabase.from('bom_configs').insert([{
          product_item_id: formData.product_item_id,
          name: formData.name,
          is_two_stage: formData.is_two_stage,
          notes: formData.notes
        }]).select();
        
        if (headError) throw headError;
        bomId = newBom[0].id;
      }

      // Insert items
      const itemsToInsert = formData.items.map(it => ({
        bom_id: bomId,
        material_item_id: it.material_item_id,
        quantity_per_unit: it.quantity_per_unit,
        unit: it.unit
      }));

      const { error: itemsError } = await supabase.from('bom_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      if (addToast) addToast(isEditing ? 'Cập nhật định mức thành công!' : 'Thêm định mức thành công!', 'success');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa định mức này?')) return;
    try {
      const { error } = await supabase.from('bom_configs').delete().eq('id', id);
      if (error) throw error;
      if (addToast) addToast('Đã xóa định mức', 'success');
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-44">
      <PageBreadcrumb title="Định mức sản xuất" onBack={onBack} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-primary" /> Định mức sản xuất (BOM)
          </h2>
          <p className="text-xs text-gray-500 mt-1">Cấu hình nguyên vật liệu tiêu hao cho mỗi loại thành phẩm</p>
        </div>
      </div>

      <FAB onClick={() => {
        setFormData({ product_item_id: '', name: '', notes: '', items: [] });
        setIsEditing(false);
        setShowModal(true);
      }} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Tên định mức</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Thành phẩm</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Đang tải...</td></tr>
              ) : boms.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Chưa có định mức nào</td></tr>
              ) : (
                boms.map((bom) => {
                  const product = materials.find(m => m.id === bom.product_item_id);
                  return (
                    <tr 
                      key={bom.id} 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => handleEdit(bom)}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{bom.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Package size={14} /></div>
                          <span className="text-xs font-medium text-gray-700">{product?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{bom.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(bom); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(bom.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between rounded-t-3xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowModal(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                    <Calculator size={24} />
                  </button>
                  <h3 className="font-bold text-lg">{isEditing ? 'Sửa định mức' : 'Thêm định mức mới'}</h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tên định mức *</label>
                    <input
                      required
                      type="text"
                      placeholder="VD: Cọc 250 - Mác 300"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <CustomCombobox
                      label="Thành phẩm đầu ra *"
                      placeholder="-- Chọn thành phẩm --"
                      value={formData.product_item_id}
                      options={materials}
                      onChange={val => setFormData({ ...formData, product_item_id: val })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Ghi chú</label>
                    <textarea
                      rows={2}
                      placeholder="Mô tả thêm về định mức này..."
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="is_two_stage"
                      checked={formData.is_two_stage}
                      onChange={e => setFormData({ ...formData, is_two_stage: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="is_two_stage" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Quy trình 2 giai đoạn</label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Plus size={14} className="text-primary" /> Chi tiết nguyên liệu tiêu hao
                    </h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      + Thêm nguyên liệu
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex-1 space-y-1">
                          <CustomCombobox
                            label="Nguyên liệu"
                            placeholder="-- Chọn --"
                            value={item.material_item_id}
                            options={materials.map(m => ({
                              ...m,
                              disabled: formData.items.some((it, i) => it.material_item_id === m.id && i !== idx)
                            }))}
                            onChange={val => updateItem(idx, 'material_item_id', val)}
                            required
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Định mức</label>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity_per_unit}
                            onChange={e => updateItem(idx, 'quantity_per_unit', parseFloat(e.target.value))}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="w-16 space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">ĐVT</label>
                          <input
                            readOnly
                            value={item.unit}
                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-gray-100 text-[10px] text-gray-500 text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {formData.items.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-xs italic">
                        Chưa có nguyên liệu nào. Nhấn "Thêm nguyên liệu" để bắt đầu.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors">Hủy</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-8 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Save size={18} /> {submitting ? 'Đang lưu...' : 'Lưu định mức'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
