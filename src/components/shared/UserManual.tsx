import React, { useState } from 'react';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { Employee } from '../../types';
import { 
  Book, Shield, User, FileText, CheckCircle2, ChevronRight, Info, Plus, LogIn, Calendar, 
  ClipboardCheck, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Wallet, 
  BarChart3, RefreshCw, Layers, Package, Bell, BellRing, Settings, Download, Camera,
  Search, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Category = 'overview' | 'inventory' | 'finance' | 'hr' | 'system';

export const UserManual = ({ user, onBack }: { user: Employee; onBack?: () => void }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('overview');
  const isAdmin = user.role.includes('Admin');

  const categories: { id: Category; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'inventory', label: 'Kho vật tư', icon: Package },
    { id: 'finance', label: 'Tài chính', icon: Wallet },
    { id: 'hr', label: 'Nhân sự & Lương', icon: UserCircle },
    { id: 'system', label: 'Hệ thống', icon: Settings, adminOnly: true },
  ];

  const filteredCategories = categories.filter(c => !c.adminOnly || isAdmin);

  // Helper component for detail sections
  const FeatureSection = ({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-12">
      <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">{icon}</div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
      </div>
      <div className="p-6 md:p-10 space-y-8">{children}</div>
    </div>
  );

  const Step = ({ number, title, text, image }: { number: number; title: string; text: string; image?: string }) => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
        <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-black">{number}</span>
        {title}
      </h3>
      <div className={`grid grid-cols-1 ${image ? 'md:grid-cols-2' : ''} gap-8 items-center`}>
        <p className="text-gray-600 leading-relaxed font-medium">{text}</p>
        {image && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-hover rounded-2xl blur opacity-10"></div>
            <img src={image} alt={title} className="relative rounded-2xl border border-gray-100 shadow-lg w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-44 animate-in fade-in duration-500 bg-gray-50/30 min-h-screen font-sans">
      <PageBreadcrumb title="Hướng dẫn sử dụng" onBack={onBack} />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Category Navigation */}
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar sticky top-0 md:top-2 z-20 bg-gray-50/80 backdrop-blur-md py-2 px-1">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                activeCategory === cat.id 
                ? 'bg-primary text-white shadow-primary/20 scale-105' 
                : 'bg-white text-gray-500 hover:bg-white hover:text-primary border border-gray-100'
              }`}
            >
              <cat.icon size={18} />
              {cat.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeCategory === 'overview' && (
              <div className="space-y-12">
                <FeatureSection title="Chào mừng đến với CDX-2026" icon={<LayoutDashboard />}>
                  <div className="text-center space-y-4 max-w-3xl mx-auto pb-8">
                    <h3 className="text-3xl font-black text-gray-900">Giao diện Tổng quan (Dashboard)</h3>
                    <p className="text-gray-500 font-medium">Dashboard là nơi tập hợp tất cả lối tắt và thông tin quan trọng nhất của dự án.</p>
                  </div>
                  <Step 
                    number={1} 
                    title="Truy cập Dashboard" 
                    text="Sau khi đăng nhập, Dashboard sẽ hiển thị các chỉ số quan trọng, lịch chấm công và các nút truy cập nhanh. Bạn có thể nhấn vào 'Hướng dẫn app' để quay lại trang này." 
                    image="/manual/dashboard_overview.png"
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Quy trình Thùng rác (Trash)" 
                    text="Mọi hành động xóa (trừ trong Thùng rác) sẽ chuyển dữ liệu vào trạng thái 'Đã xóa'. Bạn có thể khôi phục dữ liệu bất cứ lúc nào từ mục Thùng rác." 
                    image="/manual/trash_overview.png" 
                  />
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'inventory' && (
              <div className="space-y-12">
                <FeatureSection title="Nhập & Xuất kho" icon={<Package />}>
                  <Step 
                    number={1} 
                    title="Lập phiếu Nhập kho" 
                    text="Chọn vật tư, số lượng và kho đích. Phiếu sau khi lập sẽ ở trạng thái 'Chờ duyệt' cho đến khi Admin phê duyệt." 
                    image="/manual/stock_in_form_filled.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Lập phiếu Xuất kho" 
                    text="Tương tự như nhập kho, chọn vật tư và số lượng cần xuất. Hệ thống sẽ kiểm tra tồn kho xem có đủ để xuất hay không." 
                    image="/manual/stock_out_form.png" 
                  />
                </FeatureSection>

                <FeatureSection title="Luân chuyển & Tồn kho" icon={<ArrowLeftRight />}>
                  <Step 
                    number={1} 
                    title="Luân chuyển vật tư" 
                    text="Sử dụng tính năng này khi cần chuyển vật tư từ kho này sang kho khác nội bộ trong dự án." 
                    image="/manual/transfer_form.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Kiểm tra tồn kho (Báo cáo)" 
                    text="Tính năng quan trọng giúp bạn kiểm soát lượng vật tư thực tế tại các kho. Hệ thống tự động tính toán 'Tồn kho' dựa trên các phiếu nhập/xuất đã duyệt." 
                    image="/manual/inventory_check.png" 
                  />
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'finance' && (
              <div className="space-y-12">
                <FeatureSection title="Quản lý Tài chính & Phê duyệt" icon={<Wallet />}>
                  {isAdmin && (
                    <div className="mb-12 space-y-8">
                      <Step 
                        number={1} 
                        title="Duyệt phiếu (Dành cho Quản lý)" 
                        text="Tất cả các phiếu nhập, xuất, luân chuyển và chi phí do nhân viên lập sẽ tập trung tại đây. Bạn cần kiểm tra kỹ trước khi phê duyệt." 
                        image="/manual/approvals_list.png" 
                      />
                      <div className="h-px bg-gray-50" />
                      <Step 
                        number={2} 
                        title="Chi tiết & Xác nhận" 
                        text="Nhấn 'Duyệt' hoặc 'Từ chối'. Hệ thống sẽ yêu cầu xác nhận lại một lần nữa để đảm bảo tính chính xác của dữ liệu tồn kho và tài chính." 
                        image="/manual/approval_detail.png" 
                      />
                      <div className="h-px bg-gray-50" />
                    </div>
                  )}
                  <Step 
                    number={isAdmin ? 3 : 1} 
                    title="Ghi nhận Chi phí" 
                    text="Tất cả các khoản chi tiêu thực tế của dự án cần được ghi nhận tại đây. Chọn loại chi phí, ngày tháng và đính kèm thông tin hóa đơn." 
                    image="/manual/costs_form.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={isAdmin ? 4 : 2} 
                    title="Báo cáo Chi phí" 
                    text="Xem tổng hợp chi phí theo thời gian, theo loại hoặc theo kho. Bạn có thể xuất báo cáo này ra Excel." 
                    image="/manual/cost_report.png" 
                  />
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'hr' && (
              <div className="space-y-12">
                <FeatureSection title="Nhân sự & Chấm công" icon={<UserCircle />}>
                  <Step 
                    number={1} 
                    title="Hồ sơ Nhân viên" 
                    text="Quản lý thông tin chi tiết của từng nhân sự, bao gồm mã nhân viên, chức vụ và thông tin liên hệ." 
                    image="/manual/hr_form.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Theo dõi Chấm công" 
                    text="Bảng chấm công chi tiết cho phép theo dõi sát sao ngày công. Admin có quyền chỉnh sửa trạng thái công trực tiếp trên bảng." 
                    image="/manual/attendance_full_page.png" 
                  />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-50" />
                      <Step 
                        number={3} 
                        title="Chỉnh sửa công (Admin)" 
                        text="Nhấn vào ô ngày công để điều chỉnh trạng thái (Dưới 1 công, Nửa công, Vắng...) và ghi chú lý do thay đổi." 
                        image="/manual/attendance_edit_modal.png" 
                      />
                      <div className="h-px bg-gray-50" />
                      <Step 
                        number={4} 
                        title="Chấm công hàng loạt" 
                        text="Tính năng mạnh mẽ giúp Admin nhanh chóng chấm công cho toàn bộ hoặc một nhóm nhiều nhân viên cùng lúc chỉ với vài lần nhấn." 
                        image="/manual/attendance_bulk.png" 
                      />
                    </>
                  )}
                </FeatureSection>

                <FeatureSection title="Tiền lương & Phụ cấp" icon={<Banknote />}>
                   <Step 
                    number={1} 
                    title="Phụ cấp & Tạm ứng" 
                    text="Ghi nhận các khoản chi phát sinh cho nhân viên như tiền cơm, xăng xe hoặc tạm ứng lương. Lưu ý: Tiền tạm ứng sẽ bị trừ vào lương thực lĩnh cuối tháng." 
                    image="/manual/salary_advances.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Tổng hợp lương tháng" 
                    text="Bảng lương tự động tổng hợp dựa trên số ngày công, giờ tăng ca, phụ cấp và các khoản tạm ứng. Bạn có thể in bảng lương chi tiết cho từng cá nhân." 
                    image="/manual/salary_summary.png" 
                  />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-50" />
                      <Step 
                        number={3} 
                        title="Cài đặt mức lương" 
                        text="Admin thiết lập mức lương ngày hoặc lương cơ bản cho từng nhân viên. Đây là thông số gốc để hệ thống tự động tính toán 'Tiền lương trừ chấm công'." 
                        image="/manual/salary_settings.png" 
                      />
                    </>
                  )}
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'system' && (
              <div className="space-y-12">
                <FeatureSection title="Tiện ích Hệ thống" icon={<Settings />}>
                  <Step 
                    number={1} 
                    title="Ghi chú (Notes)" 
                    text="Ghi lại các sự việc quan trọng tại hiện trường. Ghi chú giúp lưu vết các vấn đề phát sinh hàng ngày." 
                    image="/manual/notes_view.png" 
                  />
                  <div className="h-px bg-gray-50" />
                  <Step 
                    number={2} 
                    title="Lịch nhắc (Reminders)" 
                    text="Thiết lập các mốc thời gian quan trọng. Hệ thống sẽ thông báo cho bạn khi đến hạn công việc." 
                    image="/manual/reminders_view.png" 
                  />
                </FeatureSection>

                {isAdmin && (
                  <FeatureSection title="Cấu hình & Sao lưu" icon={<Shield />}>
                    <Step 
                      number={1} 
                      title="Sao lưu Dữ liệu" 
                      text="Thiết lập lịch sao lưu tự động gửi qua Email. Đảm bảo dữ liệu của dự án luôn an toàn và có thể khôi phục." 
                      image="/manual/backup_settings.png" 
                    />
                  </FeatureSection>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Contact Footer */}
        <div className="text-center space-y-4 pt-12 pb-20 border-t border-gray-100 italic text-gray-400">
          <p className="text-sm">Bạn vừa xem hướng dẫn chi tiết toàn bộ tính năng của CDX-2026.</p>
          <p className="text-xs">Mọi thắc mắc kỹ thuật vui lòng liên hệ Bộ phận Kỹ thuật Hệ thống CDX.</p>
        </div>
      </div>
    </div>
  );
};

// Add missing sub-components for cleaner imports
const LayoutDashboard = ({ size }: { size?: number }) => <Book size={size} />;
const UserCircle = ({ size }: { size?: number }) => <User size={size} />;
const Banknote = ({ size }: { size?: number }) => <Wallet size={size} />;
