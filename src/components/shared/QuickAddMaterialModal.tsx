import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateNextMaterialCode, generateNextGroupCode } from '@/utils/inventory';
import { isUUID } from '@/utils/helpers';
import { CreatableSelect } from './CreatableSelect';

interface QuickAddMaterialModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (newMaterial: any) => void;
  addToast?: (message: string, type?: any) => void;
  groups: any[];
  color?: 'blue' | 'orange' | 'green';
}

export const QuickAddMaterialModal = ({
  show,
  onClose,
  onSuccess,
  addToast,
  groups,
  color = 'blue',
}: QuickAddMaterialModalProps) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState('');
  const [spec, setSpec] = useState('');
  const [desc, setDesc] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGroupChange = async (val: string) => {
    setGroupId(val);
    if (val && isUUID(val)) {
      const nextCode = await generateNextMaterialCode(val);
      setCode(nextCode);
    } else {
      setCode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast?.('Vui lòng nhập tên vật tư', 'error');
      return;
    }
    if (!groupId) {
      addToast?.('Vui lòng chọn nhóm vật tư', 'error');
      return;
    }

    setLoading(true);
    try {
      let finalGroupId = groupId;
      if (groupId && !isUUID(groupId)) {
        const groupByName = groups.find((g) => g.name.toLowerCase() === groupId.toLowerCase());
        if (groupByName) {
          finalGroupId = groupByName.id;
        } else {
          const generatedGroupCode = await generateNextGroupCode();
          const { data: newGroup, error: groupErr } = await supabase
            .from('material_groups')
            .insert([{ name: groupId, code: generatedGroupCode }])
            .select();
          if (groupErr) throw groupErr;
          if (newGroup) {
            finalGroupId = newGroup[0].id;
          }
        }
      }

      const finalCode = code || (await generateNextMaterialCode(finalGroupId));
      const payload = {
        name,
        code: finalCode,
        unit: unit || 'Cái',
        group_id: finalGroupId,
        specification: spec,
        description: desc,
        status: 'Đang sử dụng',
      };
      const { data, error } = await supabase.from('materials').insert([payload]).select();
      if (error) throw error;

      if (data && data[0]) {
        onSuccess(data[0]);
        addToast?.('Đã thêm vật tư mới!', 'success');
        onClose();
        // Reset state
        setName('');
        setUnit('');
        setGroupId('');
        setSpec('');
        setDesc('');
        setCode('');
      }
    } catch (err: any) {
      addToast?.('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-6 text-white flex items-center justify-between ${color === 'orange' ? 'bg-orange-500' : color === 'green' ? 'bg-green-600' : 'bg-blue-600'}`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer"
                >
                  <PackagePlus size={24} />
                </button>
                <h3 className="font-bold text-lg">Thêm vật tư nhanh</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <form
                id="quick-add-material-form"
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Nhóm vật tư *
                  </label>
                  <CreatableSelect
                    value={groupId}
                    options={groups}
                    onChange={(val) => handleGroupChange(val)}
                    onCreate={(val) => handleGroupChange(val)}
                    placeholder="Chọn hoặc nhập tên nhóm mới..."
                    required
                  />
                </div>
                <div className="md:col-span-2 space-y-2 mb-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Mã tham chiếu (Vật tư)
                  </label>
                  <div className="bg-primary/5 px-5 py-3.5 rounded-2xl border border-primary/10 text-sm font-black text-primary uppercase shadow-inner italic">
                    {code || (groupId ? 'Đang tính...' : '← Chọn nhóm vật tư trước')}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Tên vật tư *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Xi măng Hà Tiên..."
                    className={`w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 ${color === 'orange' ? 'focus:ring-orange-600/20' : color === 'green' ? 'focus:ring-green-600/20' : 'focus:ring-blue-600/20'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="VD: Cái, Kg, Bao..."
                    className={`w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 ${color === 'orange' ? 'focus:ring-orange-600/20' : color === 'green' ? 'focus:ring-green-600/20' : 'focus:ring-blue-600/20'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                  <input
                    type="text"
                    value={spec}
                    onChange={(e) => setSpec(e.target.value)}
                    placeholder="VD: 50kg, Φ12..."
                    className={`w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 ${color === 'orange' ? 'focus:ring-orange-600/20' : color === 'green' ? 'focus:ring-green-600/20' : 'focus:ring-blue-600/20'}`}
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={2}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Mô tả thêm về vật tư nếu cần..."
                    className={`w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 resize-none ${color === 'orange' ? 'focus:ring-orange-600/20' : color === 'green' ? 'focus:ring-green-600/20' : 'focus:ring-blue-600/20'}`}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                form="quick-add-material-form"
                type="submit"
                disabled={loading}
                className={`px-8 py-2 text-white rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-50 ${color === 'orange' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20' : color === 'green' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
              >
                {loading ? 'Đang lưu...' : 'Lưu vật tư'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
