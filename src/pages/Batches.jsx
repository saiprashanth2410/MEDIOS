import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Plus, Filter, AlertTriangle,
  CheckCircle, XCircle, Edit, Trash2, Download,
  ArrowUpDown, ChevronLeft, ChevronRight, Package, Loader2
} from 'lucide-react';
import AddBatchModal from '../components/batches/AddBatchModal';
import Navbar from '../components/dashboard/Navbar';
import { batchesAPI } from '../services/api';
import { toast } from 'sonner';

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
      const data = await batchesAPI.stats();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  /* =====================================================
     FETCH BATCHES
  ===================================================== */
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await batchesAPI.list({
        page: 1,
        limit: 1000,
        search: searchTerm,
        status: filterStatus,
      });
      setBatches(data.batches);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const t = setTimeout(() => fetchBatches(), 300);
    return () => clearTimeout(t);
  }, [fetchBatches]);

  /* =====================================================
     HANDLERS
  ===================================================== */

  // ✅ Add / Update — backend la save aagum (PERMANENT)
  const handleAddOrUpdateBatch = async (batchData, isEdit) => {
    try {
      if (isEdit) {
        await batchesAPI.update(batchData.id, batchData);
        toast.success(`Batch ${batchData.batchNumber} updated!`);
      } else {
        await batchesAPI.create(batchData);
        toast.success(`Batch ${batchData.batchNumber} added!`);
      }
      setEditingBatch(null);
      fetchBatches();
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Failed to save batch");
    }
  };

  // ✅ Delete — backend la irundhu remove
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this batch?")) return;
    try {
      await batchesAPI.delete(id);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const StatusBadge = ({ status }) => {
    const styles = {
      'Active': 'bg-green-100 text-green-700 border-green-200',
      'Expiring Soon': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Expired': 'bg-red-100 text-red-700 border-red-200',
    };
    const icons = {
      'Active': <CheckCircle size={14} className="mr-1" />,
      'Expiring Soon': <AlertTriangle size={14} className="mr-1" />,
      'Expired': <XCircle size={14} className="mr-1" />,
    };
    return (
      <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={sortConfig.key === sortKey ? 'text-blue-500' : 'text-gray-400'} />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Batch Management</h1>
              <p className="text-gray-500 text-sm mt-1">Track medicine batches, expiry dates, and stock levels.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download size={18} /> Export CSV
              </button>
              <button
                onClick={handleAddClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={18} /> Add New Batch
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Total Batches</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
              </div>
              <Package className="text-blue-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.expiringSoon}</p>
              </div>
              <AlertTriangle className="text-yellow-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Expired</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <XCircle className="text-red-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="text-orange-500" size={24} />
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by medicine or batch no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            <div className="flex justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
              <Loader2 size={40} className="text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                      <SortableHeader label="Medicine Name" sortKey="medicineName" />
                      <SortableHeader label="Batch No" sortKey="batchNumber" />
                      <SortableHeader label="Quantity" sortKey="quantity" />
                      <SortableHeader label="Expiry Date" sortKey="expiryDate" />
                      <th className="px-6 py-4">Supplier</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentBatches.length > 0 ? (
                      currentBatches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-800">{batch.medicineName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-mono">{batch.batchNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <span className={batch.quantity < 30 ? 'text-red-600 font-bold' : ''}>
                              {batch.quantity} units
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{batch.expiryDate}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{batch.supplier || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={batch.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(batch)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(batch.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center">
                            <Package size={48} className="text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-600">No batches found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter, or add your first batch.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {processedBatches.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedBatches.length)}</span> of <span className="font-medium">{processedBatches.length}</span> results
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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