import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '@/types';
import { getDayOfWeekStr, convertSolarToLunar } from '@/utils/lunar';
import { ConfirmModal } from '@/components/shared';

interface AttendanceTableProps {
  employees: Employee[];
  days: number[];
  attendance: any[];
  loading: boolean;
  user: Employee;
  selectedMonth: number;
  selectedYear: number;
  onToggleAttendance?: (
    empId: string,
    day: number,
    action?: 'present' | 'half-day' | 'absent' | 'remove',
    otHours?: number | '',
    notes?: string,
  ) => void;
  onOpenEditModal?: (empId: string, day: number) => void;
}

export const AttendanceTable = ({
  employees,
  days,
  attendance,
  loading,
  user,
  selectedMonth,
  selectedYear,
  onToggleAttendance,
  onOpenEditModal,
}: AttendanceTableProps) => {
  const [confirmPopup, setConfirmPopup] = useState<{
    empId: string;
    day: number;
    employeeName: string;
    x: number;
    y: number;
  } | null>(null);

  const [otInput, setOtInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'present' | 'half-day' | 'absent' | null>(
    null,
  );
  const [showOtConfirm, setShowOtConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find((a) => a.employee_id === empId && a.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-primary text-white';
      case 'half-day':
        return 'bg-amber-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-100 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'X';
      case 'half-day':
        return '1/2';
      case 'absent':
        return 'V';
      default:
        return '';
    }
  };

  const handleCellClick = (empId: string, empName: string, day: number, e: React.MouseEvent) => {
    if (user.role === 'User') return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const currentAtt = getStatus(empId, day);
    setOtInput(currentAtt?.overtime_hours ? String(currentAtt.overtime_hours) : '');
    setNotesInput(currentAtt?.notes || '');
    setSelectedAction(currentAtt?.status || null);
    setConfirmPopup({
      empId,
      day,
      employeeName: empName,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleConfirm = (action: 'present' | 'half-day' | 'absent' | 'remove') => {
    if (confirmPopup && onToggleAttendance) {
      let numericOt = 0;
      if (otInput !== '') {
        numericOt = parseFloat(otInput.replace(',', '.'));
        if (isNaN(numericOt)) numericOt = 0;
      }
      onToggleAttendance(
        confirmPopup.empId,
        confirmPopup.day,
        action,
        numericOt === 0 ? '' : numericOt,
        notesInput,
      );
    }
    setConfirmPopup(null);
    setSelectedAction(null);
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar overflow-y-auto max-h-[75vh]">
          <table className="w-full text-left border-collapse min-w-[1200px] whitespace-nowrap table-fixed">
            <thead className="sticky top-0 z-[40] bg-primary shadow-sm">
              <tr className="bg-primary text-white">
                <th className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-[50] bg-primary border-r border-white/10 w-36 shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                  Nhân viên
                </th>
                {days.map((d) => {
                  const dow = getDayOfWeekStr(d, selectedMonth, selectedYear);
                  const lunar = convertSolarToLunar(d, selectedMonth, selectedYear);
                  const isWeekend = dow === 'Sat' || dow === 'Sun';
                  return (
                    <th
                      key={d}
                      className={`px-0 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-[28px] ${isWeekend ? 'bg-black/10' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center leading-[1.1]">
                        <span className="text-[11px] font-black">{d}</span>
                        <span className="text-[7px] font-medium opacity-90">{dow}</span>
                        <span className="text-[6px] font-medium italic opacity-60 mt-0.5">
                          {lunar}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="px-4 py-12 text-center text-gray-400 italic"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm">Đang tải bảng chấm công...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const groupedEmployees: Record<string, Employee[]> = {};
                  employees.forEach((emp) => {
                    const dept = emp.department || 'Khác / Chưa phân bộ phận';
                    if (!groupedEmployees[dept]) groupedEmployees[dept] = [];
                    groupedEmployees[dept].push(emp);
                  });

                  return Object.entries(groupedEmployees)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([dept, deptEmployees]) => (
                      <React.Fragment key={dept}>
                        {/* Dòng phân cách bộ phận */}
                        <tr className="bg-gray-50/30 sticky top-[36px] z-[35]">
                          <td className="px-3 py-1.5 border-y border-gray-100 sticky left-0 bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                {dept}
                              </span>
                            </div>
                          </td>
                          <td
                            colSpan={days.length + 1}
                            className="border-y border-gray-50 bg-gray-50/10"
                          />
                        </tr>

                        {deptEmployees
                          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
                          .map((emp) => {
                            const empAtt = attendance.filter((a) => a.employee_id === emp.id);
                            const totalDays =
                              empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
                            return (
                              <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-3 py-2.5 sticky left-0 z-[30] bg-white group-hover:bg-gray-50 border-r border-gray-100 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                  <p
                                    className="text-[11px] font-bold text-gray-800 leading-tight truncate w-full"
                                    title={emp.full_name}
                                  >
                                    {emp.full_name}
                                  </p>
                                  <p className="text-[8px] text-gray-400">
                                    {emp.code || emp.id.slice(0, 8)}
                                  </p>
                                </td>
                                {days.map((d) => {
                                  const att = getStatus(emp.id, d);
                                  return (
                                    <td
                                      key={d}
                                      className="p-0.5 border-r border-gray-50 relative group/cell"
                                    >
                                      <button
                                        onClick={(e) =>
                                          handleCellClick(emp.id, emp.full_name, d, e)
                                        }
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          onOpenEditModal?.(emp.id, d);
                                        }}
                                        disabled={user.role === 'User'}
                                        className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition-all ${getStatusColor(att?.status)} ${user.role === 'User' ? 'cursor-default' : 'cursor-pointer hover:brightness-95 active:scale-95'}`}
                                      >
                                        <span>{getStatusLabel(att?.status)}</span>
                                        {(() => {
                                          if (att?.notes) {
                                            return (
                                              <div
                                                className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/40 rounded-full shadow-sm"
                                                title={att.notes}
                                              />
                                            );
                                          }
                                          return null;
                                        })()}
                                        {(() => {
                                          if (att?.overtime_hours > 0) {
                                            return (
                                              <span className="text-[7px] leading-none mt-0.5">
                                                +{att.overtime_hours}h
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="px-2 py-3 text-center text-xs font-black text-primary">
                                  {totalDays.toFixed(1)}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    ));
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Edit Modal (Nâng cấp từ Popup) */}
      <AnimatePresence>
        {confirmPopup && (
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-hidden"
            onClick={() => setConfirmPopup(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden max-h-[90dvh] flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary p-6 text-white flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <h3 className="font-bold text-lg">
                    Ngày {confirmPopup.day} - {confirmPopup.employeeName}
                  </h3>
                </div>
                <button
                  onClick={() => setConfirmPopup(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Trạng thái công */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                    Trạng thái công
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['present', 'half-day', 'absent'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedAction(s)}
                        className={`py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                          selectedAction === s
                            ? s === 'present'
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : s === 'half-day'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200'
                                : 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                            : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-sm font-black">
                          {s === 'present' ? 'X' : s === 'half-day' ? '½' : 'V'}
                        </span>
                        <span className="text-[9px] opacity-80 uppercase tracking-wider">
                          {s === 'present' ? '1 Công' : s === 'half-day' ? '½ Công' : 'Vắng'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Giờ tăng ca (TC) */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                    Giờ tăng ca (TC)
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((num) => (
                      <button
                        key={num}
                        onClick={() => setOtInput(String(num))}
                        className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                          parseFloat(otInput) === num
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                        }`}
                      >
                        {`+${num}h`}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập giờ TC khác..."
                      value={otInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setOtInput(val);
                      }}
                      className="w-full pl-4 pr-12 py-2.5 rounded-2xl border border-gray-100 text-sm font-bold text-amber-600 outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300 uppercase">
                      Giờ
                    </span>
                  </div>
                  {(() => {
                    const numOt = parseFloat(String(otInput).replace(',', '.'));
                    if (numOt > 6) {
                      return (
                        <div className="mt-1.5 p-2 bg-red-50 border border-red-100 rounded-xl">
                          <p className="text-[10px] text-red-600 font-bold uppercase leading-tight">
                            ⚠ GIỜ TĂNG CA CAO ({otInput}h) — xác nhận trước khi lưu
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Ghi chú công việc */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
                    Ghi chú công việc
                  </label>
                  <textarea
                    rows={2}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Ví dụ: Lắp cốt pha dầm sàn, xây tường..."
                    className="w-full p-3 rounded-2xl border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50 resize-none"
                  />
                </div>

                {/* Nút lưu */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => {
                      const numOt = parseFloat(String(otInput).replace(',', '.'));
                      if (numOt > 6) {
                        setShowOtConfirm(true);
                      } else {
                        if (selectedAction) handleConfirm(selectedAction);
                      }
                    }}
                    disabled={!selectedAction}
                    className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg ${
                      selectedAction
                        ? 'bg-primary text-white shadow-primary/20 hover:brightness-110'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {selectedAction ? '✓ Lưu chấm công' : 'Chưa chọn trạng thái'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 py-2.5 rounded-2xl bg-gray-100 text-gray-500 text-[10px] font-bold hover:bg-gray-200 active:scale-95 transition-all uppercase"
                    >
                      Xóa chấm công
                    </button>
                    <button
                      onClick={() => setConfirmPopup(null)}
                      className="flex-1 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-400 text-[10px] font-bold hover:bg-gray-50 active:scale-95 transition-all uppercase"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        show={showOtConfirm}
        title="Xác nhận giờ tăng ca"
        message={`Giờ tăng ca hiện đang là ${otInput}h. Bạn có chắc chắn con số này là chính xác không?`}
        type="warning"
        confirmText="Đúng, lưu ngay"
        cancelText="Để mình xem lại"
        onConfirm={() => {
          setShowOtConfirm(false);
          if (selectedAction) handleConfirm(selectedAction);
        }}
        onCancel={() => setShowOtConfirm(false)}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa dữ liệu chấm công ngày ${confirmPopup?.day} của ${confirmPopup?.employeeName}? Hành động này không thể hoàn tác.`}
        type="danger"
        confirmText="Xác nhận xóa"
        cancelText="Quay lại"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleConfirm('remove');
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
