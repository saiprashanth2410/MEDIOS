import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  BadgeCheck,
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  Lock,
  Edit3,
  Save,
  X,
  Camera,
  Settings,
  AlertCircle,
  Key,
  Smartphone,
  Globe,
  Navigation,
  Loader2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/dashboard/Navbar";
import { detectLocation } from "../services/locationService";
import { profileAPI } from "../services/api";
import { authService } from "../services/authService";
import AvatarModal from "../components/profile/AvatarModal";
import ActiveSessionsCard from "../components/settings/ActiveSessionsCard";

const FIELD_BASE =
  "w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none transition focus:border-[#0284c7] focus:ring-4 focus:ring-[#0284c7]/10 placeholder:text-slate-400 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:text-white disabled:cursor-not-allowed";

const LABEL_BASE =
  "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5";

export default function Profile() {
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [form, setForm] = useState(() => {
    let savedPharm = null;
    try {
      const raw = localStorage.getItem("meditrack_pharmacy_details");
      if (raw) savedPharm = JSON.parse(raw);
    } catch (_) {}

    return {
      name: user?.name || "Pharmacist",
      email: user?.email || "",
      phone: user?.phone || "",
      role: user?.role || "Chief Pharmacist",
      license: savedPharm?.license || user?.license || "",
      pharmacy: savedPharm?.name || user?.pharmacy || "MediTrack Pharmacy",
      pharmacyId: savedPharm?.pharmacyId || user?.pharmacyId || (user?.uid ? `PH-${user.uid.slice(0, 6).toUpperCase()}` : "PH-001"),
      branch: savedPharm?.branch || user?.branch || "Main Branch",
      upiId: savedPharm?.upiId || user?.upiId || localStorage.getItem("meditrack_upi_id") || "",
      joinDate: user?.joinDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      avatar: (() => {
        const localPref = typeof window !== "undefined" ? localStorage.getItem("meditrack_user_avatar_preference") : null;
        if (localPref !== null) return localPref;
        return user?.avatar || "";
      })(),
    };
  });

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    expiryAlerts: true,
    lowStockAlerts: true,
    language: "en",
  });

  // Load live settings from MongoDB on mount
  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const data = await profileAPI.get();
        if (cancelled || !data) return;

        if (data.personal) {
          const localPref = typeof window !== "undefined" ? localStorage.getItem("meditrack_user_avatar_preference") : null;
          setForm((prev) => ({
            ...prev,
            name: data.personal.name || prev.name,
            email: data.personal.email || prev.email,
            phone: data.personal.phone || prev.phone,
            role: data.personal.role || prev.role,
            license: data.personal.license || prev.license,
            joinDate: data.personal.joinDate || prev.joinDate,
            avatar: localPref !== null ? localPref : (data.personal.avatar !== undefined ? data.personal.avatar : prev.avatar),
            pharmacy: data.pharmacy?.name || prev.pharmacy,
            branch: data.pharmacy?.address || prev.branch,
            pharmacyId: data.pharmacy?.licenseNumber || prev.pharmacyId,
          }));
          if (data.pharmacy?.name) {
            try {
              localStorage.setItem(
                "meditrack_pharmacy_details",
                JSON.stringify({
                  name: data.pharmacy.name,
                  branch: data.pharmacy.address || prev.branch || "Main Branch",
                  pharmacyId: data.pharmacy.licenseNumber || prev.pharmacyId || "",
                  license: data.personal?.license || prev.license || "",
                })
              );
              window.dispatchEvent(new Event("meditrack_pharmacy_updated"));
            } catch (e) {
              console.debug(e);
            }
          }
          if (localPref === null && data.personal.avatar && !user?.avatar) {
            updateUser({ avatar: data.personal.avatar });
          }
        }
        if (data.preferences) {
          setPreferences((prev) => ({ ...prev, ...data.preferences }));
        }
      } catch (err) {
        console.debug("Profile load fallback:", err);
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const userName = user?.name || form.name || "Pharmacist";

  const handleAvatarSave = async (newAvatar) => {
    const avatarVal = newAvatar || "";
    setForm((prev) => ({ ...prev, avatar: avatarVal }));
    updateUser({ avatar: avatarVal });
    try {
      localStorage.setItem("meditrack_user_avatar_preference", avatarVal);
      await profileAPI.update({
        personal: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          license: form.license,
          joinDate: form.joinDate,
          avatar: avatarVal,
        },
      });
      toast.success(avatarVal ? "Avatar updated successfully!" : "Avatar reset to initials");
    } catch (err) {
      console.debug("Avatar sync fallback:", err);
      toast.success(avatarVal ? "Avatar updated successfully!" : "Avatar reset to initials");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    const updatedPharmacy = {
      name: form.pharmacy || user?.pharmacy || "MediTrack Pharmacy",
      branch: form.branch || user?.branch || "Main Branch",
      pharmacyId: form.pharmacyId || user?.pharmacyId || (user?.uid ? `PH-${user.uid.slice(0, 6).toUpperCase()}` : "PH-001"),
      license: form.license || user?.license || "",
      upiId: form.upiId || "",
    };
    try {
      localStorage.setItem("meditrack_pharmacy_details", JSON.stringify(updatedPharmacy));
      if (form.upiId) localStorage.setItem("meditrack_upi_id", form.upiId);
      window.dispatchEvent(new Event("meditrack_pharmacy_updated"));
    } catch (e) {
      console.debug(e);
    }

    updateUser({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      license: form.license,
      pharmacy: form.pharmacy,
      pharmacyId: form.pharmacyId,
      branch: form.branch,
      upiId: form.upiId || "",
      joinDate: form.joinDate,
      avatar: form.avatar || user?.avatar || "",
    });

    try {
      await profileAPI.update({
        personal: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          license: form.license,
          joinDate: form.joinDate,
          avatar: form.avatar || user?.avatar || "",
        },
        pharmacy: {
          name: form.pharmacy,
          licenseNumber: form.pharmacyId,
          address: form.branch,
        },
        preferences,
      });
      toast.success("Profile saved and synced to database!");
    } catch (err) {
      console.debug("Backend profile update fallback:", err);
      toast.success("Profile updated locally!");
    }

    setEditing(false);
  };

  const handleCancel = () => {
    let savedPharm = null;
    try {
      const raw = localStorage.getItem("meditrack_pharmacy_details");
      if (raw) savedPharm = JSON.parse(raw);
    } catch (_) {}

    const localPref = typeof window !== "undefined" ? localStorage.getItem("meditrack_user_avatar_preference") : null;
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      role: user?.role || "Chief Pharmacist",
      license: savedPharm?.license || user?.license || "",
      pharmacy: savedPharm?.name || user?.pharmacy || "MediTrack Pharmacy",
      pharmacyId: savedPharm?.pharmacyId || user?.pharmacyId || (user?.uid ? `PH-${user.uid.slice(0, 6).toUpperCase()}` : "PH-001"),
      branch: savedPharm?.branch || user?.branch || "Main Branch",
      joinDate: user?.joinDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      avatar: localPref !== null ? localPref : (user?.avatar || ""),
    });
    setEditing(false);
  };

  const handleDetectLocation = async () => {
    if (detectingLocation) return;

    setDetectingLocation(true);
    toast.info("Detecting your location...");

    try {
      const location = await detectLocation();

      const branchName =
        location.area && location.city
          ? `${location.area}, ${location.city}`
          : location.fullAddress;

      setForm((prev) => ({ ...prev, branch: branchName }));

      toast.success(`Location detected: ${branchName}`);
    } catch (err) {
      console.error("[Profile] Location error:", err);
      toast.error(err.message || "Could not detect location");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!security.currentPassword) {
      toast.error("Enter current password");
      return;
    }
    if (security.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await profileAPI.changePassword(security.currentPassword, security.newPassword);
      toast.success("Password updated successfully in database!");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password");
    }
  };

  const handlePreferenceToggle = async (key) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);
    toast.success("Preferences updated", { id: "profile-preferences" });
    try {
      await profileAPI.update({ preferences: updated });
    } catch (err) {
      console.debug("Preference sync fallback:", err);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast.success(
      newTheme === "system"
        ? "Following system theme"
        : `Theme set to ${newTheme}`
    );
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "preferences", label: "Preferences", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Profile & Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your account, security, and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="space-y-4">
            {/* User Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs text-center transition-colors">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-200/60 dark:border-sky-800/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center text-3xl font-bold overflow-hidden shadow-sm">
                  {user?.avatar || form.avatar ? (
                    <img
                      src={user?.avatar || form.avatar}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userName[0]?.toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#0284c7] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Change avatar"
                  title="Change avatar photo"
                >
                  <Camera size={14} />
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                {form.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {form.email}
              </p>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-400 text-[11px] font-medium border border-sky-200/60 dark:border-sky-800/40">
                <BadgeCheck size={12} />
                {form.role}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 shadow-2xs transition-colors">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-[#0284c7] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <div className="space-y-4">
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-[#0284c7] dark:text-sky-400" />
                      <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Personal Info</h3>
                    </div>

                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0284c7] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] transition shadow-xs"
                        >
                          <Save size={12} />
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_BASE}>Full Name</label>
                      <div className="relative">
                        <User
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Email</label>
                      <div className="relative">
                        <Mail
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Phone</label>
                      <div className="relative">
                        <Phone
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Role</label>
                      <input
                        type="text"
                        value={form.role}
                        onChange={(e) =>
                          setForm({ ...form, role: e.target.value })
                        }
                        disabled={!editing}
                        className={FIELD_BASE}
                      />
                    </div>
                  </div>
                </div>

                {/* Pharmacy Details */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-semibold text-[15px] text-slate-900 dark:text-slate-100 tracking-tight">Pharmacy Details</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL_BASE}>Pharmacy Name</label>
                      <div className="relative">
                        <Building2
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={form.pharmacy}
                          onChange={(e) =>
                            setForm({ ...form, pharmacy: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Pharmacy ID</label>
                      <input
                        type="text"
                        value={form.pharmacyId}
                        disabled
                        className={FIELD_BASE}
                      />
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Drug License</label>
                      <div className="relative">
                        <BadgeCheck
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={form.license}
                          onChange={(e) =>
                            setForm({ ...form, license: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    {/* Branch — with Detect */}
                    <div>
                      <label className={LABEL_BASE}>Branch</label>
                      <div className="relative">
                        <MapPin
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={form.branch}
                          onChange={(e) =>
                            setForm({ ...form, branch: e.target.value })
                          }
                          disabled={!editing}
                          className={`${FIELD_BASE} pl-10 ${editing ? "pr-24" : ""}`}
                        />

                        {editing && (
                          <button
                            type="button"
                            onClick={handleDetectLocation}
                            disabled={detectingLocation}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#0284c7] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition disabled:opacity-60"
                          >
                            {detectingLocation ? (
                              <>
                                <Loader2 size={11} className="animate-spin" />
                                Detecting...
                              </>
                            ) : (
                              <>
                                <Navigation size={11} />
                                Detect
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {editing && (
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          Click "Detect" to auto-fill using GPS
                        </p>
                      )}
                    </div>

                    {/* UPI ID for GPay/PhonePe/Paytm QR Code */}
                    <div>
                      <label className={LABEL_BASE}>
                        UPI ID / VPA (for POS QR Code)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 font-bold text-xs pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="text"
                          value={form.upiId}
                          onChange={(e) =>
                            setForm({ ...form, upiId: e.target.value })
                          }
                          disabled={!editing}
                          placeholder="yourpharmacy@upi  (e.g. medishop@oksbi)"
                          className={`${FIELD_BASE} pl-8`}
                        />
                      </div>
                      {editing && (
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          GPay / PhonePe / Paytm UPI ID. Once saved, a live QR auto-appears at the POS billing counter for each bill amount.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Key size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-bold text-[15px]">Change Password</h3>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className={LABEL_BASE}>Current Password</label>
                      <div className="relative">
                        <Lock
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="password"
                          value={security.currentPassword}
                          onChange={(e) =>
                            setSecurity({
                              ...security,
                              currentPassword: e.target.value,
                            })
                          }
                          placeholder="Enter current password"
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>New Password</label>
                      <div className="relative">
                        <Lock
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="password"
                          value={security.newPassword}
                          onChange={(e) =>
                            setSecurity({
                              ...security,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder="At least 6 characters"
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={LABEL_BASE}>Confirm New Password</label>
                      <div className="relative">
                        <Lock
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                          type="password"
                          value={security.confirmPassword}
                          onChange={(e) =>
                            setSecurity({
                              ...security,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="Re-enter new password"
                          className={`${FIELD_BASE} pl-10`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      className="w-full h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition shadow-2xs flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <ActiveSessionsCard />
              </>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <>
                {/* Notifications */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Bell size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-bold text-[15px]">Notifications</h3>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      label="Email Notifications"
                      description="Receive updates via email"
                      checked={preferences.emailNotifications}
                      onChange={() => handlePreferenceToggle("emailNotifications")}
                    />
                    <ToggleRow
                      label="Push Notifications"
                      description="Real-time alerts on this device"
                      checked={preferences.pushNotifications}
                      onChange={() => handlePreferenceToggle("pushNotifications")}
                    />
                    <ToggleRow
                      label="Expiry Alerts"
                      description="Notify when medicines are near expiry"
                      checked={preferences.expiryAlerts}
                      onChange={() => handlePreferenceToggle("expiryAlerts")}
                    />
                    <ToggleRow
                      label="Low Stock Alerts"
                      description="Notify when stock falls below threshold"
                      checked={preferences.lowStockAlerts}
                      onChange={() => handlePreferenceToggle("lowStockAlerts")}
                    />
                  </div>
                </div>

                {/* Appearance */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Sun size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-bold text-[15px]">Appearance</h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Choose how MediTrack looks on your device
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "system", label: "System", icon: Smartphone },
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.id;

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleThemeChange(option.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                            isActive
                              ? "border-[#0284c7] dark:border-sky-500 bg-sky-50/60 dark:bg-sky-950/40"
                              : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                              isActive
                                ? "bg-[#0284c7] dark:bg-sky-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            <Icon size={18} />
                          </div>
                          <span
                            className={`text-xs font-semibold ${
                              isActive
                                ? "text-[#0284c7] dark:text-sky-400"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
                    {theme === "system"
                      ? "Currently following your device settings"
                      : `Always using ${theme} mode`}
                  </p>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200/80 dark:border-rose-900/50 p-6 shadow-2xs transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                    <h3 className="font-bold text-[15px] text-rose-600 dark:text-rose-400">
                      Danger Zone
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Once you delete your account, there is no going back. Please
                    be certain.
                  </p>

                  <button
                    onClick={() =>
                      toast.error("Account deletion requires admin approval")
                    }
                    className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shadow-2xs"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}


          </div>
        </div>
      </main>

      {showAvatarModal && (
        <AvatarModal
          currentAvatar={user?.avatar || form.avatar}
          userName={userName}
          onClose={() => setShowAvatarModal(false)}
          onSave={handleAvatarSave}
        />
      )}
    </div>
  );
}

/* =====================================================
   TOGGLE ROW COMPONENT
===================================================== */

function ToggleRow({ label, description, checked, onChange, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center">
            <Icon size={14} className="text-[#0284c7] dark:text-sky-400" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-white">
            {label}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition ${
          checked
            ? "bg-[#0284c7] dark:bg-sky-600"
            : "bg-slate-300 dark:bg-slate-700"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}