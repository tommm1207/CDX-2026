import React, { useState } from 'react';
import { PageBreadcrumb } from '../shared/PageBreadcrumb';
import { Employee } from '../../types';
import { 
  LayoutDashboard, Package, Wallet, UserCircle, Settings, Shield, 
  ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, ClipboardCheck, 
  FileText, Banknote, History, Bell, Trash2, Database, ChevronRight,
  Info, CheckCircle2, BookOpen, Printer
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

  const FeatureSection = ({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-12">
      <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">{icon}</div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
      </div>
      <div className="p-6 md:p-10 space-y-12">{children}</div>
    </div>
  );

  const Step = ({ number, title, text, image, subSteps }: { number: number; title: string; text: string; image?: string; subSteps?: string[] }) => (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-lg font-black">{number}</span>
        <div className="flex-1 space-y-4">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <p className="text-gray-600 leading-relaxed font-medium">{text}</p>
          {subSteps && (
            <ul className="space-y-2 ml-2">
              {subSteps.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {image && (
        <div className="relative group mt-6 ml-14">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary to-primary-hover rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <img src={image} alt={title} className="relative rounded-[1.5rem] border border-gray-100 shadow-2xl w-full object-cover" />
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 pb-44 animate-in fade-in duration-500 bg-gray-50/30 min-h-screen font-sans">
      <PageBreadcrumb title="Hướng dẫn sử dụng" onBack={onBack} />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Role Badge */}
        <div className="flex justify-center">
          <div className="px-6 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-3">
            <Shield className="text-primary" size={16} />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tài liệu dành cho: {user.role}</span>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar sticky top-0 md:top-2 z-20 bg-gray-50/80 backdrop-blur-md py-4 px-1">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                activeCategory === cat.id 
                ? 'bg-primary text-white shadow-primary/20 scale-105' 
                : 'bg-white text-gray-500 hover:bg-white hover:text-primary border border-gray-100'
              }`}
            >
              <cat.icon size={20} />
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
                <FeatureSection title="Hệ thống Quản lý CDX" icon={<LayoutDashboard />}>
                  <div className="space-y-4 max-w-3xl mx-auto text-center mb-12">
                    <h3 className="text-4xl font-black text-gray-900 leading-tight">Giao diện Tổng quan</h3>
                    <p className="text-lg text-gray-500 font-medium italic">"Mọi dữ liệu bạn cần, chỉ trong một cái nhìn."</p>
                  </div>
                  <Step 
                    number={1} 
                    title="Bảng điều khiển (Dashboard)" 
                    text={isAdmin ? "Dành cho Admin: Xem tổng giá trị kho, số nhân sự đang làm việc, biểu đồ chi phí và danh sách phiếu chờ duyệt ngay tức khắc." : "Dành cho Nhân viên: Lối tắt các tính năng nghiệp vụ chính như nhập/xuất kho và xem lịch chấm công cá nhân."} 
                    image={isAdmin ? "/manual/dashboard_admin.png" : "/manual/dashboard_user.png"}
                  />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-100" />
                      <Step 
                        number={2} 
                        title="Quy trình Thùng rác (Trash Bin)" 
                        text="Hệ thống sử dụng cơ chế 'Xóa mềm'. Khi xóa bất kỳ dữ liệu nào, chúng sẽ được chuyển vào Thùng rác để có thể khôi phục khi cần thiết." 
                        image="/manual/trash_admin.png" 
                      />
                    </>
                  )}
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'inventory' && (
              <div className="space-y-12">
                <FeatureSection title="Quy trình Quản lý Kho" icon={<Package />}>
                  <Step 
                    number={1} 
                    title="Lập phiếu Nhập/Xuất kho" 
                    text="Ghi nhận các biến động vật tư. Mọi phiếu mới tạo sẽ ở trạng thái 'Chờ duyệt' và chưa làm thay đổi số lượng tồn kho thực tế." 
                    image={isAdmin ? "/manual/stock_in_admin.png" : "/manual/stock_in_user.png"}
                  />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-100" />
                      <Step 
                        number={2} 
                        title="Phê duyệt phiếu (Admin)" 
                        text="Tất cả các nghiệp vụ kho chỉ có hiệu lực sau khi được Admin phê duyệt tại mục 'Phiếu duyệt'." 
                        image="/manual/approvals_list.png" 
                      />
                      <div className="h-px bg-gray-100" />
                      <Step 
                        number={3} 
                        title="Báo cáo Tồn kho thực tế" 
                        text="Hệ thống tự động tính toán tồn kho dựa trên các phiếu đã được phê duyệt." 
                        image="/manual/inventory_report_admin.png" 
                      />
                    </>
                  )}
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'finance' && (
              <div className="space-y-12">
                <FeatureSection title="Quản lý Chi phí" icon={<Wallet />}>
                  <Step 
                    number={1} 
                    title="Báo cáo chi phí" 
                    text="Xem tổng hợp và ghi nhận tình hình chi tiêu thực tế của các đầu việc. Giúp kiểm soát ngân sách một cách minh bạch." 
                    image={isAdmin ? "/manual/costs_admin.png" : "/manual/cost_report_admin.png"} 
                  />
                </FeatureSection>
              </div>
            )}

            {activeCategory === 'hr' && (
              <div className="space-y-12">
                <FeatureSection title="Nhân sự - Chấm công" icon={<UserCircle />}>
                  <Step 
                    number={1} 
                    title="Bảng Chấm công" 
                    text="Theo dõi công và tăng ca hàng ngày. Tích hợp Thứ và Ngày Âm lịch để thuận tiện theo dõi." 
                    image={isAdmin ? "/manual/attendance_admin.png" : "/manual/attendance_user.png"}
                  />
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-100" />
                      <Step 
                        number={2} 
                        title="Quản lý hồ sơ & Lương" 
                        text="Admin quản lý thông tin nhân sự, cài đặt mức lương và tổng hợp bảng lương hàng tháng." 
                        image="/manual/hr_records_admin.png" 
                      />
                    </>
                  )}
                </FeatureSection>
              </div>
            )}

            {isAdmin && activeCategory === 'system' && (
              <div className="space-y-12">
                <FeatureSection title="Hệ thống" icon={<Shield />}>
                  <Step 
                    number={1} 
                    title="Cấu hình & Nhật ký" 
                    text="Cài đặt lịch nhắc, cấu hình sao lưu dữ liệu tự động và xem nhật ký hoạt động hệ thống." 
                    image="/manual/backup_settings_admin.png" 
                  />
                </FeatureSection>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
