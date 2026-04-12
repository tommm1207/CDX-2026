import { useState, useEffect, FormEvent } from 'react';
import { Settings, Plus, Edit, Trash2, X, Package, Save, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Employee, Material, BOMConfig as IBOMConfig, BOMItem } from '@/types';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { ToastType } from '../shared/Toast';
import { CustomCombobox } from '../shared/CustomCombobox';
import { FAB } from '../shared/FAB';
import { Button } from '../shared/Button';
import { checkUsage } from '@/utils/dataIntegrity';

export const BOMConfig = ({
  user,
  onBack,
  addToast,
}: {
  user: Employee;
  onBack?: () => void;
  addToast?: (message: string, type?: ToastType) => void;
}) => {
  const [boms, setBoms] = useState<IBOMConfig[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    id?: string;
    bom_code: string;
    product_item_id: string;
    name: string;
    is_two_stage?: boolean;
    notes: string;
    items: { material_item_id: string; quantity_per_unit: number; unit: string }[];
  }>({
    bom_code: '',
    product_item_id: '',
    name: '',
    is_two_stage: false,
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bomRes, matRes] = await Promise.all([
        supabase
          .from('bom_configs')
          .select('*')
          .or('status.is.null,status.neq.Đã xóa')
          .order('created_at', { ascending: false }),
        supabase.from('materials').select('*').order('name'),
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
    const { data: items } = await supabase.from('bom_items').select('*').eq('bom_id', bom.id);

    setFormData({
      id: bom.id,
      bom_code: bom.bom_code || '',
      product_item_id: bom.product_item_id,
      name: bom.name,
      is_two_stage: bom.is_two_stage,
      notes: bom.notes || '',
      items: (items || []).map((it) => ({
        material_item_id: it.material_item_id,
        quantity_per_unit: it.quantity_per_unit,
        unit: it.unit,
      })),
    });
    setIsEditing(true);
    setShowModal(true);
    setLoading(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { material_item_id: '', quantity_per_unit: 0, unit: '' }],
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
      const mat = materials.find((m) => m.id === value);
      if (mat) newItems[index].unit = mat.unit || '';
    }

    setFormData({ ...formData, items: newItems });
  };

  const generateBOMCode = async (): Promise<string> => {
    const d = new Date();
    const today = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const prefix = `DM-${today}-`;
    const { data } = await supabase
      .from('bom_configs')
      .select('bom_code')
      .like('bom_code', `${prefix}%`)
      .order('bom_code', { ascending: false })
      .limit(1);
    if (data && data.length > 0 && data[0].bom_code) {
      const lastNum = parseInt(data[0].bom_code.split('-').pop() || '0');
      if (!isNaN(lastNum)) return `${prefix}${(lastNum + 1).toString().padStart(3, '0')}`;
    }
    return `${prefix}001`;
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
        await supabase
          .from('bom_configs')
          .update({
            bom_code: formData.bom_code,
            product_item_id: formData.product_item_id,
            name: formData.name,
            is_two_stage: formData.is_two_stage,
            notes: formData.notes,
          })
          .eq('id', bomId);

        // Delete old items and insert new ones
        await supabase.from('bom_items').delete().eq('bom_id', bomId);
      } else {
        // Insert header
        const code = formData.bom_code || (await generateBOMCode());
        const { data: newBom, error: headError } = await supabase
          .from('bom_configs')
          .insert([
            {
              bom_code: code,
              product_item_id: formData.product_item_id,
              name: formData.name,
              is_two_stage: formData.is_two_stage,
              notes: formData.notes,
            },
          ])
          .select();

        if (headError) throw headError;
        bomId = newBom[0].id;
      }

      // Insert items
      const itemsToInsert = formData.items.map((it) => ({
        bom_id: bomId,
        material_item_id: it.material_item_id,
        quantity_per_unit: it.quantity_per_unit,
        unit: it.unit,
      }));

      const { error: itemsError } = await supabase.from('bom_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      if (addToast)
        addToast(
          isEditing ? 'Cập nhật định mức thành công!' : 'Thêm định mức thành công!',
          'success',
        );
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);
      const usage = await checkUsage('bom', itemToDelete);
      if (usage.inUse) {
        if (addToast)
          addToast(
            `Không thể xóa vì dữ liệu đang được sử dụng ở: ${usage.tables.join(', ')}`,
            'warning',
          );
        setShowDeleteModal(false);
        return;
      }

      // For BOM items, we can keep them or hard delete if the BOM itself is soft-deleted.
      // Most consistent is to soft-delete the config and keep items as-is (hidden by association).
      const { error } = await supabase
        .from('bom_configs')
        .update({ status: 'Đã xóa' })
        .eq('id', itemToDelete);

      if (error) throw error;
      if (addToast) addToast('Đã đưa định mức vào Thùng rác!', 'success');
      fetchData();
    } catch (err: any) {
      if (addToast) addToast('Lỗi: ' + err.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <PageBreadcrumb title="Định mức sản xuất" onBack={onBack} />

      <FAB
        onClick={async () => {
          const newCode = await generateBOMCode();
          setFormData({ bom_code: newCode, product_item_id: '', name: '', notes: '', items: [] });
          setIsEditing(false);
          setShowModal(true);
        }}
      />

      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-hidden"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa định mức?</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">
                Bạn có chắc muốn xóa định mức{' '}
                <strong>{boms.find((b) => b.id === itemToDelete)?.name}</strong>?<br />
                Dữ liệu sẽ được đưa vào <strong>Thùng rác</strong> và có thể khôi phục.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-gray-100 hover:bg-gray-200"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={confirmDelete}
                  isLoading={loading}
                  className="shadow-lg shadow-red-500/20"
                >
                  Xóa ngay
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Tên định mức
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Thành phẩm
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">
                  Ghi chú
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-24">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                    Đang tải...
                  </td>
                </tr>
              ) : boms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">
                    Chưa có định mức nào
                  </td>
                </tr>
              ) : (
                boms.map((bom) => {
                  const product = materials.find((m) => m.id === bom.product_item_id);
                  return (
                    <tr
                      key={bom.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => handleEdit(bom)}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">{bom.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Package size={14} />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {product?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{bom.notes || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(bom);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(bom.id);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
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
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer"
                  >
                    <Calculator size={24} />
                  </button>
                  <h3 className="font-bold text-lg">
                    {isEditing ? 'Sửa định mức' : 'Thêm định mức mới'}
                  </h3>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Mã tham chiếu (Định mức)
                  </label>
                  <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                    {formData.bom_code || '(Hệ thống tự tạo)'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      Tên định mức *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="VD: Cọc 250 - Mác 300"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <CustomCombobox
                      label="Thành phẩm đầu ra *"
                      placeholder="-- Chọn thành phẩm --"
                      value={formData.product_item_id}
                      options={materials}
                      onChange={(val) => setFormData({ ...formData, product_item_id: val })}
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
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="is_two_stage"
                      checked={formData.is_two_stage}
                      onChange={(e) => setFormData({ ...formData, is_two_stage: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label
                      htmlFor="is_two_stage"
                      className="text-xs font-bold text-gray-700 select-none cursor-pointer"
                    >
                      Quy trình 2 giai đoạn
                    </label>
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
                      <div
                        key={idx}
                        className="flex gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100"
                      >
                        <div className="flex-1 space-y-1">
                          <CustomCombobox
                            label="Nguyên liệu"
                            placeholder="-- Chọn --"
                            value={item.material_item_id}
                            options={materials.map((m) => ({
                              ...m,
                              disabled: formData.items.some(
                                (it, i) => it.material_item_id === m.id && i !== idx,
                              ),
                            }))}
                            onChange={(val) => updateItem(idx, 'material_item_id', val)}
                            required
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Định mức
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={item.quantity_per_unit}
                            onChange={(e) =>
                              updateItem(idx, 'quantity_per_unit', parseFloat(e.target.value))
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="w-16 space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            ĐVT
                          </label>
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
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
