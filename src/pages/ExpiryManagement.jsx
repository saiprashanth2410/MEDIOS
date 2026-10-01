import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, AlertTriangle, ShieldCheck,
  Trash2, Download, ArrowUpDown, ChevronLeft, ChevronRight, 
  Package, ShieldAlert, RotateCcw, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/dashboard/Navbar';
import { useExpiryData } from '../utils/expiryStore';

const STATUS_STYLES = {
  'Expired': 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  'Critical': 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold',
  'Warning': 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold',
  'Review': 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 font-medium',
  'Safe': 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'Quarantined': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium',
  'Returned': 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 font-medium',
};

function StatusBadge({ status, daysLeft }) {
  const icons = {
    'Expired': <AlertTriangle size={13} className="mr-1 shrink-0" />,
    'Critical': <AlertTriangle size={13} className="mr-1 shrink-0" />,
    'Warning': <AlertTriangle size={13} className="mr-1 shrink-0" />,
    'Review': <Clock size={13} className="mr-1 shrink-0" />,
    'Safe': <ShieldCheck size={13} className="mr-1 shrink-0" />,
    'Quarantined': <ShieldAlert size={13} className="mr-1 shrink-0" />,
    'Returned': <RotateCcw size={13} className="mr-1 shrink-0" />,
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || STATUS_STYLES['Safe']}`}>
      {icons[status] || icons['Safe']}
      <span>{status}</span>
      <span className="ml-1 opacity-80 text-[11px]">
        {status === 'Quarantined' ? '(Blocked)' : status === 'Returned' ? '(Credited)' : daysLeft < 0 ? `(${Math.abs(daysLeft)}d ago)` : `(${daysLeft}d)`}
      </span>
    </span>
  );
}

function SortableHeader({ label, sortKey, sortConfig, onSort }) {
  return (
    <th 
      className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <ArrowUpDown size={13} className={sortConfig.key === sortKey ? 'text-[#0284c7] dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'} />
      </div>
    </th>
  );
}

export default function ExpiryManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('status') || 'All';

  const {
    items,
    stats,
    quarantineItem,
    returnItem,
    deleteItem,
  } = useExpiryData();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'expiryDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Handlers ---
  const handleFilterChange = (status) => {
    setCurrentPage(1);
    setSearchParams(status === 'All' ? {} : { status }, { replace: true });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to remove this item from the expiry tracking list?")) {
      deleteItem(id);
      toast.success("Item removed from expiry list");
    }
  };

  const handleQuarantine = (id) => {
    if (window.confirm("Move this item to Quarantine? It will be blocked from being dispensed.")) {
      quarantineItem(id);
      toast.success("Batch successfully moved to Quarantine");
    }
  };

  const handleReturnToSupplier = (id) => {
    if (window.confirm("Initiate return to wholesaler/supplier for credit processing?")) {
      returnItem(id);
      toast.success("Return workflow initiated with supplier");
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = ['Medicine Name', 'Batch No', 'Quantity', 'Unit Price (INR)', 'At Risk Value (INR)', 'Expiry Date', 'Days Left', 'Supplier', 'Location', 'Status'];
    const csvData = items.map(i => [
      `"${i.medicineName}"`,
      `"${i.batchNumber}"`,
      i.quantity,
      i.price || 0,
      ((i.quantity || 0) * (i.price || 0)),
      i.expiryDate,
      i.daysLeft,
      `"${i.supplier || 'N/A'}"`,
      `"${i.location || 'N/A'}"`,
      i.status
    ]);
    const csvContent = [headers.join(","), ...csvData.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `meditrack_fefo_expiry_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expiry report downloaded as CSV");
  };

  // --- Filtering & Sorting ---
  const processedItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    let result = items.filter(item => {
      const matchesSearch = 
        !q ||
        item.medicineName.toLowerCase().includes(q) || 
        item.batchNumber.toLowerCase().includes(q) ||
        (item.supplier && item.supplier.toLowerCase().includes(q));
      const matchesFilter = filterStatus === 'All' || item.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processedItems.length / itemsPerPage));
  const currentItems = processedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Expiry Management (FEFO)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live tracking across 90/60/30 day escalation tiers (Total: {stats.total} items, ₹{(stats.totalAtRiskVal || 237300).toLocaleString('en-IN')} at risk)
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Download size={16} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* 6 FEFO Escalation KPI Cards (Interactive Filter Triggers synced with Dashboard) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          
          {/* Total */}
          <button
            type="button"
            onClick={() => handleFilterChange('All')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'All'
                ? 'border-[#0284c7] ring-2 ring-[#0284c7]/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center">
                <Package size={15} className="text-[#0284c7] dark:text-sky-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">All FEFO tracked</p>
          </button>

          {/* Critical (≤30d) */}
          <button
            type="button"
            onClick={() => handleFilterChange('Critical')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'Critical'
                ? 'border-rose-500 ring-2 ring-rose-500/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Critical</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/25 flex items-center justify-center">
                <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.critical}</p>
            <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80 mt-0.5 font-medium">≤ 30 days (₹{(stats.criticalVal || 24500).toLocaleString('en-IN')})</p>
          </button>

          {/* Warning (31-60d) */}
          <button
            type="button"
            onClick={() => handleFilterChange('Warning')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'Warning'
                ? 'border-amber-500 ring-2 ring-amber-500/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Warning</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
                <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.warning}</p>
            <p className="text-[10px] text-amber-500/80 dark:text-amber-400/80 mt-0.5 font-medium">31–60 days (₹{(stats.warningVal || 67800).toLocaleString('en-IN')})</p>
          </button>

          {/* Review (61-90d) */}
          <button
            type="button"
            onClick={() => handleFilterChange('Review')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'Review'
                ? 'border-yellow-500 ring-2 ring-yellow-500/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-yellow-200 dark:hover:border-yellow-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">Review</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/15 border border-yellow-200/60 dark:border-yellow-500/25 flex items-center justify-center">
                <Clock size={15} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.review}</p>
            <p className="text-[10px] text-yellow-600/80 dark:text-yellow-400/80 mt-0.5 font-medium">61–90 days (₹{(stats.reviewVal || 145000).toLocaleString('en-IN')})</p>
          </button>

          {/* Quarantined */}
          <button
            type="button"
            onClick={() => handleFilterChange('Quarantined')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'Quarantined'
                ? 'border-slate-600 ring-2 ring-slate-600/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Quarantined</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <ShieldAlert size={15} className="text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stats.quarantined}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Blocked from sale</p>
          </button>

          {/* Returned */}
          <button
            type="button"
            onClick={() => handleFilterChange('Returned')}
            className={`text-left bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-xs ${
              filterStatus === 'Returned'
                ? 'border-violet-500 ring-2 ring-violet-500/25 shadow-sm'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Returned</span>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/15 border border-violet-200/60 dark:border-violet-500/25 flex items-center justify-center">
                <RotateCcw size={15} className="text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.returned}</p>
            <p className="text-[10px] text-violet-500/80 dark:text-violet-400/80 mt-0.5 font-medium">Supplier credit</p>
          </button>

        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={17} />
            <input 
              type="text" 
              placeholder="Search by medicine, batch no, or supplier..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284c7] text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-slate-400 dark:text-slate-500" />
            <select 
              value={filterStatus} 
              onChange={(e) => handleFilterChange(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All FEFO Batches ({stats.total})</option>
              <option value="Critical">Critical ≤30d ({stats.critical})</option>
              <option value="Warning">Warning 31-60d ({stats.warning})</option>
              <option value="Review">Review 61-90d ({stats.review})</option>
              <option value="Quarantined">Quarantined ({stats.quarantined})</option>
              <option value="Returned">Returned ({stats.returned})</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                  <SortableHeader label="Medicine Name" sortKey="medicineName" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Batch No" sortKey="batchNumber" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Quantity" sortKey="quantity" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Expiry Date" sortKey="expiryDate" sortConfig={sortConfig} onSort={handleSort} />
                  <th className="px-5 py-3.5">Supplier</th>
                  <th className="px-5 py-3.5">Location</th>
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {currentItems.length > 0 ? (
                  currentItems.map((item) => {
                    const atRiskValue = (item.quantity || 0) * (item.price || 0);
                    return (
                      <tr key={item.id} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">
                          {item.medicineName}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                          {item.batchNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.quantity} units
                          </span>
                          {atRiskValue > 0 && (
                            <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              ₹{atRiskValue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          {item.expiryDate}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                          {item.supplier || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                          {item.location || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={item.status} daysLeft={item.daysLeft} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== 'Quarantined' && item.status !== 'Returned' && (
                              <>
                                <button 
                                  onClick={() => handleQuarantine(item.id)}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md transition"
                                  title="Move to Quarantine"
                                >
                                  <ShieldAlert size={15} />
                                </button>
                                <button 
                                  onClick={() => handleReturnToSupplier(item.id)}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:hover:bg-slate-800 rounded-md transition"
                                  title="Return to Wholesaler / Supplier"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition"
                              title="Delete record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package size={44} className="text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No items match your filter</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">
                          Try selecting "All FEFO Batches" or resetting the FEFO dataset.
                        </p>
                        <button
                          onClick={() => handleFilterChange('All')}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#0284c7] text-white hover:bg-[#0369a1] transition shadow-xs"
                        >
                          Show All Batches
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {processedItems.length > 0 && (
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <p>
                Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, processedItems.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{processedItems.length}</strong> items
                {filterStatus !== 'All' && ` (filtered by ${filterStatus})`}
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}