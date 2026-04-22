import { useState } from 'react';
import {
  FileText,
  Download,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  DollarSign,
  ArrowLeftRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '../shared/Button';
import { NumericInput } from '../shared/NumericInput';
import { exportSteelSheetContract } from '@/utils/contractExport';

const PARTY_A_DEFAULT = {
  companyName: 'CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU CON ĐƯỜNG XANH',
  representative: 'Nguyễn Đức Thắng',
  position: 'Giám đốc',
  address: 'Lầu 7, số 207 đường Hoàng Sa, Phường Tân Định, Tp Hồ Chí Minh.',
  taxCode: '0310385381',
  email: 'congtycdx@gmail.com',
  phone: '0931884886 (A Khang đại diện làm việc)',
};

export const LeaseSteelSheetForm = ({
  onBack,
  addToast,
}: {
  onBack: () => void;
  addToast: any;
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractCode: `HĐCT/CDX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    partyA: { ...PARTY_A_DEFAULT },
    partyB: {
      companyName: '',
      representative: '',
      position: 'Giám đốc',
      address: '',
      taxCode: '',
      phone: '',
    },
    content: {
      projectName: 'TRAM BIEN AP 500KV LONG THANH',
      category: 'CHO THUE THEP TON TAM',
      location: 'Long Thanh - Dong Nai',
    },
    items: [
      { id: 1, name: 'Cho thuê thép tôn tấm', unit: 'tấm/tháng', quantity: 40, price: 1200000 },
      { id: 2, name: 'Vận chuyển vật tư lượt đi về', unit: 'kg/lượt', quantity: 2, price: 9000000 },
    ],
  });

  const handleSwap = () => {
    const newA = { ...formData.partyB };
    const newB = { ...formData.partyA };
    setFormData({ ...formData, partyA: newA, partyB: newB });
    addToast('Đã hoán đổi vị trí Bên A và Bên B', 'info');
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), name: '', unit: '', quantity: 0, price: 0 }],
    });
  };

  const removeItem = (id: number) => {
    setFormData({ ...formData, items: formData.items.filter((item) => item.id !== id) });
  };

  const updateItem = (id: number, field: string, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    });
  };

  const isCDX_A = formData.partyA.companyName.includes('CON ĐƯỜNG XANH');

  const subTotal = formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const vat = subTotal * 0.08;
  const total = subTotal + vat;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('contracts').upsert(
        {
          contract_code: formData.contractCode,
          type: 'THUE_THEP_TAM',
          party_a_info: formData.partyA,
          party_b_info: formData.partyB,
          content: { ...formData.content, items: formData.items, total },
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
      await exportSteelSheetContract(formData);
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
              HĐ Thuê thép tấm
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

      <div className="p-4 space-y-6 max-w-5xl mx-auto">
        {/* THÔNG TIN DỰ ÁN */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Building2 size={18} />
            <h2 className="text-sm font-black uppercase tracking-tight">Thông tin dự án</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Tên công trình"
              value={formData.content.projectName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  content: { ...formData.content, projectName: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
            <input
              type="text"
              placeholder="Hạng mục"
              value={formData.content.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  content: { ...formData.content, category: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
            <input
              type="text"
              placeholder="Địa điểm"
              value={formData.content.location}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  content: { ...formData.content, location: e.target.value },
                })
              }
              className="px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </div>
        </section>

        {/* BÊN A & BÊN B (Tương tự form trước nhưng có CSS động) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section
            className={`bg-white rounded-3xl p-6 shadow-sm border ${isCDX_A ? 'border-blue-100' : 'border-orange-100'} space-y-4`}
          >
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
              BÊN A ({isCDX_A ? 'BÊN CHO THUÊ' : 'BÊN THUÊ'})
            </h2>
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
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold"
            />
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
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </section>
          <section
            className={`bg-white rounded-3xl p-6 shadow-sm border ${!isCDX_A ? 'border-blue-100' : 'border-orange-100'} space-y-4`}
          >
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
              BÊN B ({!isCDX_A ? 'BÊN CHO THUÊ' : 'BÊN THUÊ'})
            </h2>
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
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm font-bold"
            />
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
              className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm"
            />
          </section>
        </div>

        {/* BẢNG CHI TIẾT VẬT TƯ */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <DollarSign size={18} />
              <h2 className="text-sm font-black uppercase tracking-tight">Chi tiết đơn giá</h2>
            </div>
            <button
              onClick={addItem}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <Plus size={14} /> Thêm dòng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-3 text-left w-12">STT</th>
                  <th className="pb-3 text-left">Hạng mục</th>
                  <th className="pb-3 text-left w-24">ĐVT</th>
                  <th className="pb-3 text-right w-24">SL</th>
                  <th className="pb-3 text-right w-32">Đơn giá</th>
                  <th className="pb-3 text-right w-32">Thành tiền</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {formData.items.map((item, index) => (
                  <tr key={item.id} className="group">
                    <td className="py-3 text-gray-400 font-bold">{index + 1}</td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full bg-transparent outline-none font-bold text-gray-700"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full bg-transparent outline-none text-gray-500"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-full bg-transparent outline-none text-right font-bold"
                      />
                    </td>
                    <td className="py-3">
                      <NumericInput
                        value={item.price}
                        onChange={(val) => updateItem(item.id, 'price', val)}
                        className="text-right"
                      />
                    </td>
                    <td className="py-3 text-right font-black text-gray-800">
                      {(item.quantity * item.price).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-gray-50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-bold">Tổng cộng:</span>
              <span className="font-black text-gray-800">{subTotal.toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-bold">Thuế VAT (8%):</span>
              <span className="font-black text-gray-800">{vat.toLocaleString()} VNĐ</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-primary font-black uppercase italic">TỔNG THANH TOÁN:</span>
              <span className="font-black text-primary underline underline-offset-4">
                {total.toLocaleString()} VNĐ
              </span>
            </div>
          </div>
        </section>

        <Button
          variant="blue"
          className="w-full py-4 rounded-2xl shadow-xl"
          onClick={handleExport}
          isLoading={loading}
        >
          <FileText size={20} className="mr-2" /> XUẤT HỢP ĐỒNG THÉP TẤM (.DOCX)
        </Button>
      </div>
    </div>
  );
};
