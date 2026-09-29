import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, AlertTriangle, CheckCircle, XCircle, 
  Trash2, Download, ArrowUpDown, ChevronLeft, ChevronRight, 
  Package, ShieldAlert, RotateCcw, Clock
} from 'lucide-react';
import { initialExpiryData } from '../data/expiryData';
import Navbar from '../components/dashboard/Navbar';
import { batchesAPI } from '../services/api';

function formatBatchToExpiryItem(b, index) {
  const expiry = new Date(b.expiryDate);
  const today = new Date();
  const diffTime = expiry - today;
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status = 'Safe';
  let color = 'green';
  if (daysLeft < 0) {
    status = 'Expired';
    color = 'red';
  } else if (daysLeft <= 30) {
    status = 'Critical';
    color = 'orange';
  } else if (daysLeft <= 60) {
    status = 'Warning';
    color = 'yellow';
  }

  return {
    id: b.id || `batch-${index}`,
    medicineName: b.medicineName,
    batchNumber: b.batchNumber,
    quantity: b.quantity || 0,
    expiryDate: b.expiryDate,
    daysLeft,
    supplier: b.supplier || 'Standard Supplier',
    location: b.rack || `Shelf ${String.fromCharCode(65 + (index % 4))}-${(index % 5) + 1}`,
    status: b.status === 'Quarantined' || b.status === 'Returned' ? b.status : status,
    color: b.status === 'Quarantined' ? 'gray' : b.status === 'Returned' ? 'blue' : color,
  };
}

const STATUS_STYLES = {
  'Expired': 'bg-red-100 text-red-700 border-red-200',
  'Critical': 'bg-red-100 text-red-700 border-red-200',
  'Warning': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Review': 'bg-blue-100 text-blue-700 border-blue-200',
  'Safe': 'bg-green-100 text-green-700 border-green-200',
  'Quarantined': 'bg-gray-100 text-gray-700 border-gray-200',
  'Returned': 'bg-blue-100 text-blue-700 border-blue-200',
};

function StatusBadge({ status, daysLeft }) {
  const icons = {
    'Expired': <XCircle size={14} className="mr-1" />,
    'Critical': <AlertTriangle size={14} className="mr-1" />,
    'Warning': <AlertTriangle size={14} className="mr-1" />,
    'Review': <Clock size={14} className="mr-1" />,
    'Safe': <CheckCircle size={14} className="mr-1" />,
    'Quarantined': <ShieldAlert size={14} className="mr-1" />,
    'Returned': <RotateCcw size={14} className="mr-1" />,
  };
  return (
    <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || STATUS_STYLES['Safe']}`}>
      {icons[status] || icons['Safe']} {status} {daysLeft < 0 ? `(${Math.abs(daysLeft)}d ago)` : daysLeft < 90 ? `(${daysLeft}d)` : ''}
    </span>
  );
}

function SortableHeader({ label, sortKey, sortConfig, onSort }) {
  return (
    <th 
      className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={sortConfig.key === sortKey ? 'text-blue-500' : 'text-gray-400'} />
      </div>
    </th>
  );
}

const ExpiryManagement = () => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('pharmacyExpiry');
    return saved ? JSON.parse(saved) : initialExpiryData;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'expiryDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  /* Fetch live batches from DB */
  useEffect(() => {
    let cancelled = false;
    const fetchLiveBatches = async () => {
      try {
        const data = await batchesAPI.list({ limit: 1000 });
        if (!cancelled && data?.batches && data.batches.length > 0) {
          const formatted = data.batches.map(formatBatchToExpiryItem);
          setItems(formatted);
        }
      } catch (err) {
        console.warn("Could not load batches from DB, using cached items:", err.message);
      }
    };
    fetchLiveBatches();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('pharmacyExpiry', JSON.stringify(items));
  }, [items]);

  // --- Handlers ---
  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this item?")) {
      try {
        await batchesAPI.delete(id);
      } catch (err) {
        console.debug("Batch delete offline fallback:", err);
      }
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleQuarantine = async (id) => {
    if(window.confirm("Move this item to Quarantine? It will not be dispensed.")) {
      try {
        await batchesAPI.update(id, { status: 'Quarantined' });
      } catch (err) {
        console.debug("Batch quarantine offline fallback:", err);
      }
      setItems(items.map(item => 
        item.id === id ? { ...item, status: 'Quarantined', color: 'gray' } : item
      ));
    }
  };

  const handleReturnToSupplier = async (id) => {
    if(window.confirm("Return this item to supplier?")) {
      try {
        await batchesAPI.update(id, { status: 'Returned' });
      } catch (err) {
        console.debug("Batch return offline fallback:", err);
      }
      setItems(items.map(item => 
        item.id === id ? { ...item, status: 'Returned', color: 'blue' } : item
      ));
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
    const headers = ['Medicine Name', 'Batch No', 'Quantity', 'Expiry Date', 'Days Left', 'Supplier', 'Location', 'Status'];
    const csvData = items.map(i => [i.medicineName, i.batchNumber, i.quantity, i.expiryDate, i.daysLeft, i.supplier, i.location, i.status]);
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "expiry_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Derived Data ---
  const processedItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'All' || item.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchTerm, filterStatus, sortConfig]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      expired: items.filter(i => i.status === 'Expired').length,
      critical: items.filter(i => i.status === 'Critical').length,
      warning: items.filter(i => i.status === 'Warning').length,
      safe: items.filter(i => i.status === 'Safe').length,
    };
  }, [items]);

  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const currentItems = processedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onScanClick={() => {}} />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Expiry Management</h1>
              <p className="text-gray-500 text-sm mt-1">Track near-expiry and expired medicines. Take action to prevent losses.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download size={18} /> Export Report
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Total Items</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
              </div>
              <Package className="text-blue-500" size={24} />
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
                <p className="text-gray-500 text-xs font-medium uppercase">Critical (30d)</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
              </div>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Warning (60d)</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.warning}</p>
              </div>
              <AlertTriangle className="text-yellow-500" size={24} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase">Safe</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.safe}</p>
              </div>
              <CheckCircle className="text-green-500" size={24} />
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter size={18} className="text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="All">All Status</option>
                <option value="Expired">Expired</option>
                <option value="Critical">Critical (≤30 days)</option>
                <option value="Warning">Warning (≤60 days)</option>
                <option value="Review">Review (≤90 days)</option>
                <option value="Safe">Safe</option>
                <option value="Quarantined">Quarantined</option>
                <option value="Returned">Returned</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                    <SortableHeader label="Medicine Name" sortKey="medicineName" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Batch No" sortKey="batchNumber" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Quantity" sortKey="quantity" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Expiry Date" sortKey="expiryDate" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4">Location</th>
                    <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">{item.medicineName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.batchNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className={item.quantity < 30 ? 'text-red-600 font-bold' : ''}>
                            {item.quantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.expiryDate}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.supplier || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.location || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} daysLeft={item.daysLeft} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(item.status === 'Expired' || item.status === 'Critical') && (
                              <>
                                <button 
                                  onClick={() => handleQuarantine(item.id)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Quarantine"
                                >
                                  <ShieldAlert size={16} />
                                </button>
                                <button 
                                  onClick={() => handleReturnToSupplier(item.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Return to Supplier"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDelete(item.id)}
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
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Package size={48} className="text-gray-300 mb-4" />
                          <p className="text-lg font-medium text-gray-600">No items found</p>
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter to find what you're looking for.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {processedItems.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedItems.length)}</span> of <span className="font-medium">{processedItems.length}</span> results
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
        </div>
      </div>
    </div>
  );
};

export default ExpiryManagement;