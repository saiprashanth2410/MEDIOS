import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Mail,
  Phone,
  BadgeCheck,
  Clock,
  MoreVertical,
  CheckCircle2,
  X,
  Edit3,
  Trash2,
  Save,
  User,
  Users,
  Calendar,
  ShieldCheck,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import Navbar from "../components/dashboard/Navbar";
import { pharmacistsFirebaseService } from "../services/pharmacistsFirebaseService";
import { pharmacistsAPI } from "../services/api";

const ROLES = ["Chief Pharmacist", "Senior Pharmacist", "Pharmacist", "Trainee", "Intern"];
const SHIFTS = ["Morning (9AM - 5PM)", "Evening (5PM - 11PM)", "Night (11PM - 8AM)", "Flexible"];
const STATUSES = ["active", "on-leave", "inactive"];

const FIELD_BASE =
  "w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none transition focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 placeholder:text-slate-400 dark:text-slate-500";

const LABEL_BASE = "block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5";

export default function Pharmacists() {
  const [pharmacists, setPharmacists] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  /* Fetch from backend */
  useEffect(() => {
    let cancelled = false;
    const fetchTeam = async () => {
      try {
        const data = await pharmacistsFirebaseService.list();
        if (!cancelled && Array.isArray(data)) {
          setPharmacists(data);
          return;
        }
      } catch {
        // Fallback
      }
      try {
        const data = await pharmacistsAPI.list();
        if (!cancelled && Array.isArray(data)) {
          setPharmacists(data);
        }
      } catch (err) {
        console.debug("Could not fetch pharmacists from API:", err.message);
      }
    };
    fetchTeam();
    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     HANDLERS
  ===================================================== */

  const handleAddPharmacist = async (newPharmacist) => {
    try {
      const created = await pharmacistsFirebaseService.create(newPharmacist);
      setPharmacists((prev) => [created || newPharmacist, ...prev]);
    } catch {
      try {
        const created = await pharmacistsAPI.create(newPharmacist);
        setPharmacists((prev) => [created || newPharmacist, ...prev]);
      } catch {
        setPharmacists((prev) => [newPharmacist, ...prev]);
      }
    }
    toast.success(`${newPharmacist.name} added to team!`);
    setShowAddModal(false);
  };

  const handleEditPharmacist = async (updated) => {
    try {
      await pharmacistsFirebaseService.update(updated.id, updated);
    } catch {
      try {
        await pharmacistsAPI.update(updated.id, updated);
      } catch (err) {
        console.debug("Update error:", err);
      }
    }
    setPharmacists((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    toast.success(`${updated.name} updated!`);
    setEditingId(null);
  };

  const handleDeletePharmacist = async (id) => {
    const pharmacist = pharmacists.find((p) => p.id === id);
    if (window.confirm(`Delete ${pharmacist?.name}?`)) {
      try {
        await pharmacistsFirebaseService.delete(id);
      } catch {
        try {
          await pharmacistsAPI.delete(id);
        } catch (err) {
          console.debug("Delete error:", err);
        }
      }
      setPharmacists((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pharmacist removed");
      setOpenMenuId(null);
    }
  };

  /* =====================================================
     DERIVED DATA
  ===================================================== */

  const stats = useMemo(() => ({
    total: pharmacists.length,
    active: pharmacists.filter((p) => p.status === "active").length,
    onLeave: pharmacists.filter((p) => p.status === "on-leave").length,
  }), [pharmacists]);

  const filtered = useMemo(() => {
    return pharmacists.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.license.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [pharmacists, searchQuery, statusFilter]);

  const statusStyles = {
    active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
    "on-leave": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
    inactive: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onScanClick={() => {}} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Pharmacists</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your pharmacy team</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#0284c7] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0369a1] transition shadow-xs"
          >
            <Plus size={16} />
            Add Pharmacist
          </button>
        </div>

        {/* Stats — Clickable */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter("all")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition ${
              statusFilter === "all" ? "border-[#0284c7] ring-2 ring-[#0284c7]/10" : "border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/60 dark:border-sky-500/25 flex items-center justify-center text-[#0284c7] dark:text-sky-400">
                <Users size={18} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Staff</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition ${
              statusFilter === "active" ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          </button>

          <button
            onClick={() => setStatusFilter("on-leave")}
            className={`text-left bg-white dark:bg-slate-900 rounded-xl p-5 border shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition ${
              statusFilter === "on-leave" ? "border-amber-500 ring-2 ring-amber-500/10" : "border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200/60 dark:border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock size={18} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">On Leave</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.onLeave}</p>
          </button>
        </div>

        {/* Search + Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 mb-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row gap-3">

            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or license..."
                className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-sm outline-none transition focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#0284c7]/15"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "on-leave", label: "On Leave" },
                { key: "inactive", label: "Inactive" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    statusFilter === s.key
                      ? "bg-[#0284c7] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition ${
                  viewMode === "grid" ? "bg-white dark:bg-slate-900 shadow-2xs text-[#0284c7] dark:text-sky-400" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition ${
                  viewMode === "list" ? "bg-white dark:bg-slate-900 shadow-2xs text-[#0284c7] dark:text-sky-400" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <ListIcon size={16} />
              </button>
            </div>

          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "pharmacist" : "pharmacists"} found
          </p>
        </div>

        {/* Grid view */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
            <Users size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">No pharmacists found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? "Try a different search" : "Add your first team member"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                {/* Menu */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === p.id ? null : p.id)
                    }
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <MoreVertical size={16} className="text-slate-400 dark:text-slate-500" />
                  </button>

                  {openMenuId === p.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg z-20 overflow-hidden">
                        <button
                          onClick={() => {
                            setShowDetailModal(p);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <Eye size={12} />
                          View details
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <Edit3 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePharmacist(p.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 text-[#0284c7] dark:text-sky-400 font-bold text-lg flex items-center justify-center shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[p.status]}`}>
                      {p.status.toUpperCase().replace("-", " ")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="shrink-0" />
                    <span>{p.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={12} className="shrink-0" />
                    <span className="font-mono truncate">{p.license}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                    {p.role}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {p.shift.split(" ")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs hover:shadow-sm transition">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center font-bold text-lg shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusStyles[p.status]}`}>
                        {p.status.toUpperCase().replace("-", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Mail size={12} />{p.email}</span>
                      <span className="flex items-center gap-1"><Phone size={12} />{p.phone}</span>
                      <span className="flex items-center gap-1"><BadgeCheck size={12} />{p.license}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 font-medium">{p.role}</span>
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock size={11} />{p.shift}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePharmacist(p.id)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <AddPharmacistModal
          onAdd={handleAddPharmacist}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingId && (
        <AddPharmacistModal
          initial={pharmacists.find((p) => p.id === editingId)}
          onAdd={handleEditPharmacist}
          onClose={() => setEditingId(null)}
          isEdit
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <PharmacistDetailModal
          pharmacist={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onEdit={() => {
            setEditingId(showDetailModal.id);
            setShowDetailModal(null);
          }}
        />
      )}
    </div>
  );
}

/* =====================================================
   ADD / EDIT MODAL
===================================================== */

function AddPharmacistModal({ initial, onAdd, onClose, isEdit }) {
  const [form, setForm] = useState(() =>
    initial || {
      id: `PH-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      email: "",
      phone: "",
      license: "",
      role: "Pharmacist",
      shift: "Morning (9AM - 5PM)",
      status: "active",
      joinDate: new Date().toISOString().split("T")[0],
    }
  );

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = {};

    if (!form.name.trim()) e2.name = "Name is required";
    if (!form.email.trim()) e2.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e2.email = "Invalid email";
    if (!form.phone.trim()) e2.phone = "Phone is required";
    if (!form.license.trim()) e2.license = "License number is required";

    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      toast.error("Please fix the errors below");
      return;
    }

    onAdd(form);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg my-8 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center">
              <User size={20} className="text-[#0284c7]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEdit ? "Edit Pharmacist" : "Add New Pharmacist"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {isEdit ? "Update team member details" : "Fill in details below"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={LABEL_BASE}>Full Name *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                
                className={`${FIELD_BASE} pl-9 ${errors.name ? "border-rose-300" : ""}`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_BASE}>Email *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="rajesh@pharmacy.com"
                  className={`${FIELD_BASE} pl-9 ${errors.email ? "border-rose-300" : ""}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className={LABEL_BASE}>Phone *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`${FIELD_BASE} pl-9 ${errors.phone ? "border-rose-300" : ""}`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL_BASE}>License Number *</label>
            <div className="relative">
              <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={form.license}
                onChange={(e) => update("license", e.target.value)}
                placeholder="TN/PH/2024/1234"
                className={`${FIELD_BASE} pl-9 ${errors.license ? "border-rose-300" : ""}`}
              />
            </div>
            {errors.license && <p className="mt-1 text-xs text-rose-600">{errors.license}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_BASE}>Role</label>
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className={FIELD_BASE}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_BASE}>Shift</label>
              <select
                value={form.shift}
                onChange={(e) => update("shift", e.target.value)}
                className={FIELD_BASE}
              >
                {SHIFTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_BASE}>Status</label>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("status", s)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition capitalize ${
                    form.status === s
                      ? "bg-[#0284c7] text-white"
                      : "bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {s.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className={LABEL_BASE}>Temporary Password</label>
              <div className="relative">
                <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={`${FIELD_BASE} pl-9 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                User will be prompted to change this on first login
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2"
            >
              <Save size={14} />
              {isEdit ? "Save Changes" : "Add Pharmacist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =====================================================
   DETAIL MODAL
===================================================== */

function PharmacistDetailModal({ pharmacist, onClose, onEdit }) {
  const statusStyles = {
    active: "bg-emerald-50 text-emerald-700",
    "on-leave": "bg-amber-50 text-amber-700",
    inactive: "bg-slate-100 text-slate-600 dark:text-slate-300",
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg my-8 shadow-2xl">
        <div className="relative">
          <div className="h-24 bg-gradient-to-br from-[#0284c7] to-[#0369a1] rounded-t-2xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-900/20 hover:bg-white dark:bg-slate-900/30 text-white transition"
          >
            <X size={18} />
          </button>

          <div className="px-6 -mt-12 pb-6">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white font-bold text-3xl">
                  {pharmacist.name[0]?.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 pb-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{pharmacist.name}</h2>
                <span
                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1 ${statusStyles[pharmacist.status]}`}
                >
                  {pharmacist.status.toUpperCase().replace("-", " ")}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <DetailRow icon={User} label="Role" value={pharmacist.role} />
              <DetailRow icon={Mail} label="Email" value={pharmacist.email} />
              <DetailRow icon={Phone} label="Phone" value={pharmacist.phone} />
              <DetailRow icon={BadgeCheck} label="License" value={pharmacist.license} />
              <DetailRow icon={Clock} label="Shift" value={pharmacist.shift} />
              <DetailRow icon={Calendar} label="Join Date" value={pharmacist.joinDate || "—"} />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                onClick={onEdit}
                className="flex-1 h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2"
              >
                <Edit3 size={14} />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
        <Icon size={13} />
        {label}
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">
        {value}
      </span>
    </div>
  );
}