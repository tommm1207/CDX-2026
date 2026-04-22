import { useState } from 'react';
import {
  FileText,
  Download,
  ArrowLeft,
  Building2,
  User,
  Phone,
  Calendar,
  DollarSign,
  ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../shared/Button';
import { NumericInput } from '../shared/NumericInput';
import { exportLeaseVehicleContract } from '@/utils/contractExport';

const PARTY_A_DEFAULT = {
  companyName: 'CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU CON ĐƯỜNG XANH',
  representative: 'Nguyễn Đức Thắng',
  position: 'Giám đốc',
  address: 'Lầu 7, số 207 đường Hoàng Sa, Phường Tân Định, Tp Hồ Chí Minh.',
  taxCode: '0310385381',
  email: 'congtycdx@gmail.com',
  phone: '0931884886 (A Khang đại diện làm việc)',
  notes: 'Biên bản/giấy uỷ quyền cho thuê. người đại diện theo pháp luật',
};

export const LeaseVehicleForm = ({ onBack, addToast }: { onBack: () => void; addToast: any }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractCode: `HĐKT/CDX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    partyA: { ...PARTY_A_DEFAULT },
    partyB: {
      companyName: '',
      representative: '',
      position: 'Giám đốc',
      address: '',
      taxCode: '',
      email: '',
      phone: '',
      bankAccount: '',
    },
    content: {
      workContent:
        'Bên B đồng ý cho bên A thuê các thiết bị: 01 xe đào bánh xích (từ 05 trở lên); 01 chẹc vận chuyển và gồm cả (hợp đồng tài xế, tài công) điều khiển làm việc để phục vụ thi công công trình điện vị trí VT26, VT27 tại Xã Tân Chánh (thuộc dự án Trạm biến áp 220kV và đường dây đấu nối Gò Công – Cần Đước)',
      duration: '01 tháng',
      startDate: new Date().toISOString().split('T')[0],
      totalPrice: 64800000,
      paymentAmount: 34800000,
    },
  });

  const handleSwap = () => {
    const newA = { ...formData.partyB };
    const newB = { ...formData.partyA };
    setFormData({ ...formData, partyA: newA, partyB: newB });
    addToast('Đã hoán đổi vị trí Bên A và Bên B', 'info');
  };

  const isCDX_A = formData.partyA.companyName.includes('CON ĐƯỜNG XANH');

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('contracts').upsert(
        {
          contract_code: formData.contractCode,
          type: 'THUE_XE',
          party_a_info: formData.partyA,
          party_b_info: formData.partyB,
          content: formData.content,
          status: 'Đã ký',
        },
        { onConflict: 'contract_code' },
      );
      if (error) throw error;
      return true;
    } catch (error: any) {
      addToast('Lỗi lưu dữ liệu: ' + error.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const isSaved = await handleSave();
    if (!isSaved) return;
    setLoading(true);
    try {
      await exportLeaseVehicleContract(formData);
      addToast('Đã lưu và tạo file Word thành công!', 'success');
    } catch (error: any) {
      addToast('Lỗi xuất file: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-sm font-black text-gray-800 uppercase tracking-tight">
              Hợp đồng thuê xe cuốc
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {formData.contractCode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSwap}>
            <ArrowLeftRight size={16} className="mr-2" /> Hoán đổi A ↔ B
          </Button>
          <Button variant="blue" size="sm" onClick={handleExport} isLoading={loading}>
            <Download size={16} className="mr-2" /> Xuất file Word
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">Thông tin chung</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.contractCode}
              onChange={(e) => setFormData({ ...formData, contractCode: e.target.value })}
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold"
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </div>
        </section>

        {/* BÊN A */}
        <section
          className={`bg-white rounded-3xl p-6 shadow-sm border ${isCDX_A ? 'border-blue-100' : 'border-orange-100'} space-y-4`}
        >
          <div
            className={`flex items-center gap-2 ${isCDX_A ? 'text-blue-600' : 'text-orange-600'}`}
          >
            <Building2 size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">
              BÊN A ({isCDX_A ? 'BÊN THUÊ' : 'BÊN CHO THUÊ'})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <input
              type="text"
              placeholder="Tên đơn vị"
              value={formData.partyA.companyName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  partyA: { ...formData.partyA, companyName: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Đại diện"
                value={formData.partyA.representative}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partyA: { ...formData.partyA, representative: e.target.value },
                  })
                }
                className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
              />
              <input
                type="text"
                placeholder="Chức vụ"
                value={formData.partyA.position}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partyA: { ...formData.partyA, position: e.target.value },
                  })
                }
                className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Địa chỉ"
              value={formData.partyA.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  partyA: { ...formData.partyA, address: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </div>
        </section>

        {/* BÊN B */}
        <section
          className={`bg-white rounded-3xl p-6 shadow-sm border ${!isCDX_A ? 'border-blue-100' : 'border-orange-100'} space-y-4`}
        >
          <div
            className={`flex items-center gap-2 ${!isCDX_A ? 'text-blue-600' : 'text-orange-600'}`}
          >
            <User size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">
              BÊN B ({!isCDX_A ? 'BÊN THUÊ' : 'BÊN CHO THUÊ'})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <input
              type="text"
              placeholder="Tên đơn vị"
              value={formData.partyB.companyName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  partyB: { ...formData.partyB, companyName: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Đại diện"
                value={formData.partyB.representative}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partyB: { ...formData.partyB, representative: e.target.value },
                  })
                }
                className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
              />
              <input
                type="text"
                placeholder="Chức vụ"
                value={formData.partyB.position}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partyB: { ...formData.partyB, position: e.target.value },
                  })
                }
                className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Địa chỉ"
              value={formData.partyB.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  partyB: { ...formData.partyB, address: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <DollarSign size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">Nội dung & Đơn giá</h2>
          </div>
          <textarea
            rows={3}
            value={formData.content.workContent}
            onChange={(e) =>
              setFormData({
                ...formData,
                content: { ...formData.content, workContent: e.target.value },
              })
            }
            className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm outline-none resize-none"
          />
          <div className="grid grid-cols-2 gap-4">
            <NumericInput
              value={formData.content.totalPrice}
              onChange={(val) =>
                setFormData({ ...formData, content: { ...formData.content, totalPrice: val } })
              }
            />
            <NumericInput
              value={formData.content.paymentAmount}
              onChange={(val) =>
                setFormData({ ...formData, content: { ...formData.content, paymentAmount: val } })
              }
            />
          </div>
        </section>

        <Button
          variant="blue"
          className="w-full py-4 rounded-2xl"
          onClick={handleExport}
          isLoading={loading}
        >
          <FileText size={20} className="mr-2" /> TẠO VÀ TẢI FILE WORD (.DOCX)
        </Button>
      </div>
    </div>
  );
};
