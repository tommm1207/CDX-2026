import { Plus } from 'lucide-react';
import { Employee } from '../../types';
import { getDayOfWeekStr, convertSolarToLunar } from '../../utils/lunar';

interface AttendanceTableProps {
  employees: Employee[];
  days: number[];
  attendance: any[];
  loading: boolean;
  user: Employee;
  selectedMonth: number;
  selectedYear: number;
  onToggleAttendance?: (empId: string, day: number) => void;
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
  onOpenEditModal
}: AttendanceTableProps) => {

  const getStatus = (empId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(a => a.employee_id === empId && a.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500 text-white';
      case 'half-day': return 'bg-amber-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      default: return 'bg-gray-100 text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'X';
      case 'half-day': return '1/2';
      case 'absent': return 'V';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider sticky left-0 z-[50] bg-primary border-r border-white/10 w-48">Nhân viên</th>
              {days.map(d => {
                const dow = getDayOfWeekStr(d, selectedMonth, selectedYear);
                const lunar = convertSolarToLunar(d, selectedMonth, selectedYear);
                const isWeekend = dow === 'Sat' || dow === 'Sun';
                return (
                  <th key={d} className={`px-1 py-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-white/10 w-10 ${isWeekend ? 'bg-black/10' : ''}`}>
                    <div className="flex flex-col items-center justify-center leading-[1.1]">
                      <span className="text-[12px] font-black">{d}</span>
                      <span className="text-[8px] font-medium opacity-90">{dow}</span>
                      <span className="text-[7px] font-medium italic opacity-60 mt-0.5">{lunar}</span>
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center w-20">Tổng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-12 text-center text-gray-400 italic">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm">Đang tải bảng chấm công...</p>
                  </div>
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const empAtt = attendance.filter(a => a.employee_id === emp.id);
                const totalDays = empAtt.reduce((sum, a) => sum + Number(a.hours_worked || 0), 0) / 8;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 sticky left-0 z-[50] bg-white group-hover:bg-gray-50 border-r border-gray-100">
                      <p className="text-xs font-bold text-gray-800 leading-tight">{emp.full_name}</p>
                      <p className="text-[9px] text-gray-400">{emp.code || emp.id.slice(0, 8)}</p>
                    </td>
                    {days.map(d => {
                      const att = getStatus(emp.id, d);
                      return (
                        <td key={d} className="p-0.5 border-r border-gray-50 relative group/cell">
                          <button
                            onClick={() => onToggleAttendance?.(emp.id, d)}
                            onContextMenu={(e) => { e.preventDefault(); onOpenEditModal?.(emp.id, d); }}
                            disabled={user.role === 'User'}
                            className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-black transition-all ${getStatusColor(att?.status)} ${user.role === 'User' ? 'cursor-default' : 'cursor-pointer hover:brightness-95 active:scale-95'}`}
                          >
                            <span>{getStatusLabel(att?.status)}</span>
                            {att?.overtime_hours > 0 && <span className="text-[7px] leading-none mt-0.5">+{att.overtime_hours}h</span>}
                          </button>
                          {user.role !== 'User' && onOpenEditModal && (
                            <button
                              onClick={() => onOpenEditModal(emp.id, d)}
                              className="absolute -top-1.5 -right-1.5 bg-white shadow-md border border-gray-100 rounded-full p-1 transition-all z-20 hover:scale-110 active:scale-90"
                            >
                              <Plus size={10} className="text-primary" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-center text-xs font-black text-primary">{totalDays.toFixed(1)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
