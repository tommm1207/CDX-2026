import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackagePlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { generateNextMaterialCode } from '../../utils/inventory';

interface QuickAddMaterialModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (newMaterial: any) => void;
  addToast?: (message: string, type?: any) => void;
  groups: any[];
}

export const QuickAddMaterialModal = ({
  show,
  onClose,
  onSuccess,
  addToast,
  groups
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
    if (val) {
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
      const finalCode = code || await generateNextMaterialCode(groupId);
      const payload = { 
        name, 
        code: finalCode, 
        unit: unit || 'Cái',
        group_id: groupId,
        specification: spec,
        description: desc,
        status: 'Đang sử dụng'
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
            <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors cursor-pointer">
                  <PackagePlus size={24} />
                </button>
                <h3 className="font-bold text-lg">Thêm vật tư nhanh</h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <form id="quick-add-material-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nhóm vật tư *</label>
                  <select 
                    required 
                    value={groupId} 
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="">-- Chọn nhóm --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mã vật tư (Tự động)</label>
                  <input 
                    type="text" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Chọn nhóm để sinh mã..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-sm outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tên vật tư *</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="VD: Xi măng Hà Tiên..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-600/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Đơn vị tính</label>
                  <input 
                    type="text" 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)} 
                    placeholder="VD: Cái, Kg, Bao..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-600/20" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Quy cách</label>
                  <input 
                    type="text" 
                    value={spec} 
                    onChange={(e) => setSpec(e.target.value)} 
                    placeholder="VD: 50kg, Φ12..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-600/20" 
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mô tả chi tiết</label>
                  <textarea 
                    rows={2} 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)} 
                    placeholder="Mô tả thêm về vật tư nếu cần..."
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-600/20 resize-none" 
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
                className="px-8 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
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
