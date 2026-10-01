import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, AlertTriangle,
  CheckCircle, XCircle, Edit, Trash2, Download,
  ArrowUpDown, ChevronLeft, ChevronRight, Package, Loader2
} from 'lucide-react';
import AddBatchModal from '../components/batches/AddBatchModal';
import Navbar from '../components/dashboard/Navbar';
import { batchesFirebaseService } from '../services/batchesFirebaseService';
import { batchesAPI } from '../services/api';
import { toast } from 'sonner';

const BATCH_STATUS_STYLES = {
  'Active': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/40',
  'Expiring Soon': 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/40 font-medium',
  'Expired': 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/40 font-medium',
};

function StatusBadge({ status }) {
  const icons = {
    'Active': <CheckCircle size={14} className="mr-1" />,
    'Expiring Soon': <AlertTriangle size={14} className="mr-1" />,
    'Expired': <XCircle size={14} className="mr-1" />,
  };
  return (
    <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${BATCH_STATUS_STYLES[status] || BATCH_STATUS_STYLES['Active']}`}>
      {icons[status]} {status}
    </span>
  );
}

function SortableHeader({ label, sortKey, sortConfig, onSort }) {
  return (
    <th
      className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={sortConfig.key === sortKey ? 'text-blue-500 dark:text-sky-400' : 'text-gray-400 dark:text-slate-500'} />
      </div>
    </th>
  );
}

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    expired: 0,
    lowStock: 0,
  });

  const [sortConfig, setSortConfig] = useState({ key: 'expiryDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  /* =====================================================
     FETCH STATS
  ===================================================== */
  const fetchStats = useCallback(async () => {
    try {
      const data = await batchesFirebaseService.stats();
      setStats(data);
    } catch {
      try {
        const data = await batchesAPI.stats();
        setStats(data);
      } catch (err) {
        console.error("Stats error:", err);
      }
    }
  }, []);

  /* =====================================================
     FETCH BATCHES
  ===================================================== */
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await batchesFirebaseService.list({
        page: 1,
        limit: 1000,
        search: searchTerm,
        status: filterStatus,
      });
      setBatches(data?.batches || []);
    } catch {
      try {
        const data = await batchesAPI.list({
          page: 1,
          limit: 1000,
          search: searchTerm,
          status: filterStatus,
        });
        setBatches(data?.batches || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await batchesFirebaseService.stats();
        if (!cancelled && data) setStats(data);
      } catch {
        try {
          const data = await batchesAPI.stats();
          if (!cancelled && data) setStats(data);
        } catch (err) {
          console.error("Stats error:", err);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchBatches(), 300);
    return () => clearTimeout(t);
  }, [fetchBatches]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  // ✅ Add / Update — Firebase & backend la save aagum (PERMANENT)
  const handleAddOrUpdateBatch = async (batchData, isEdit) => {
    try {
      if (isEdit) {
        await batchesFirebaseService.update(batchData.id, batchData);
        try { await batchesAPI.update(batchData.id, batchData); } catch (_) {}
        toast.success(`Batch ${batchData.batchNumber} updated!`);
      } else {
        await batchesFirebaseService.create(batchData);
        try { await batchesAPI.create(batchData); } catch (_) {}
        toast.success(`Batch ${batchData.batchNumber} added!`);
      }
      setEditingBatch(null);
      fetchBatches();
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to save batch");
    }
  };

  // ✅ Delete — Firebase & backend la irundhu remove
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this batch?")) return;
    try {
      await batchesFirebaseService.delete(id);
      try { await batchesAPI.delete(id); } catch (_) {}
      toast.success("Batch deleted");
      fetchBatches();
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleEditClick = (batch) => {
    setEditingBatch(batch);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingBatch(null);
    setIsModalOpen(true);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = ['Medicine Name', 'Batch No', 'Quantity', 'Expiry Date', 'Supplier', 'Status'];
    const csvData = batches.map(b => [b.medicineName, b.batchNumber, b.quantity, b.expiryDate, b.supplier, b.status]);
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "batches_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* =====================================================
     SORT (client-side display)
  ===================================================== */
  const processedBatches = useMemo(() => {
    const result = [...batches];
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [batches, sortConfig]);

  const totalPages = Math.ceil(processedBatches.length / itemsPerPage);
  const currentBatches = processedBatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Batch Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track medicine batches, expiry dates, and stock levels.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-2xs"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-xs"
            >
              <Plus size={16} /> Add New Batch
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Batches</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center">
              <Package className="text-[#0284c7] dark:text-sky-400" size={18} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-1">{stats.expiringSoon}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Expired</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight mt-1">{stats.expired}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-200/60 dark:border-rose-500/25 flex items-center justify-center">
              <XCircle className="text-rose-600 dark:text-rose-400" size={18} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-1">{stats.lowStock}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by medicine or batch no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0284c7] text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-slate-400 dark:text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <Loader2 size={40} className="text-[#0284c7] animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                    <SortableHeader label="Medicine Name" sortKey="medicineName" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Batch No" sortKey="batchNumber" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Quantity" sortKey="quantity" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Expiry Date" sortKey="expiryDate" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentBatches.length > 0 ? (
                    currentBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{batch.medicineName}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-mono">{batch.batchNumber}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          <span className={batch.quantity < 30 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                            {batch.quantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-mono">{batch.expiryDate}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{batch.supplier || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={batch.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(batch)}
                              className="p-1.5 text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(batch.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-14 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Package size={44} className="text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No batches found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filter, or add your first batch.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {processedBatches.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-300">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, processedBatches.length)}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{processedBatches.length}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddBatchModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBatch(null); }}
        onAdd={handleAddOrUpdateBatch}
        editBatch={editingBatch}
      />
    </div>
  );
};

export default Batches;