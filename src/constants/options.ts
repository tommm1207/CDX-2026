export const LOGO_URL = '/logo.png';

export const WEATHER_OPTIONS = [
  { value: 'sunny', label: '☀️ Nắng nóng gay gắt' },
  { value: 'sudden-rain', label: '⛈️ Mưa rào đột ngột' },
  { value: 'cloudy', label: '☁️ Trời âm u, oi bức' },
  { value: 'long-rain', label: '🌧️ Mưa dầm kéo dài' },
  { value: 'strong-wind', label: '💨 Gió giật mạnh trong cơn dông' },
  { value: 'thunderstorm', label: '🌩️ Sấm chớp dữ dội' },
  { value: 'flood', label: '🌊 Ngập lụt cục bộ' },
  { value: 'cool', label: '🌬️ Trời se lạnh vào sáng sớm' },
  { value: 'smog', label: '🌫️ Sương mù quang hóa' },
  { value: 'pleasant', label: '🌤️ Trời trong xanh, nắng dịu' },
];

export const ATTENDANCE_STATUSES = ['present', 'half-day', 'absent'] as const;
export const SLIP_STATUSES = ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã xóa'] as const;
export const USER_ROLES = ['Develop', 'Admin', 'User'] as const;
export const PARTNER_TYPES = ['Khách hàng', 'Nhà cung cấp', 'Cả hai'] as const;

export const LOW_STOCK_THRESHOLD = 10;
export const REMINDER_CHECK_INTERVAL = 30000; // 30 giây
export const PENDING_COUNT_INTERVAL = 30000; // 30 giây
