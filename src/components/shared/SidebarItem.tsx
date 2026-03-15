export const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${active
        ? 'bg-primary-light text-primary font-semibold'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    <Icon size={20} className={active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'} />
    <span className="text-sm flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md shadow-red-500/20 border border-white/50">
        {badge}
      </span>
    )}
  </button>
);
