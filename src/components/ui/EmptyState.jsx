export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <p className="text-xs font-semibold text-slate-700 mb-0.5">{title}</p>
      {description && (
        <p className="text-[10px] text-slate-500">{description}</p>
      )}
    </div>
  );
}
