import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/dashboard/Navbar";
import { detectLocation } from "../services/locationService";

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

  const [form, setForm] = useState({
    name: user?.name || "Pharmacist",
    email: user?.email || "",
    phone: user?.phone || "+91 98765 43210",
    role: user?.role || "Chief Pharmacist",
    license: user?.license || "TN/PH/2026/4821",
    pharmacy: user?.pharmacy || "MediTrack Pharmacy",
    pharmacyId: user?.pharmacyId || "PH-MT-220022",
    branch: user?.branch || "Anna Nagar, Chennai",
    joinDate: user?.joinDate || "24 Sep 2024",
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

  const userName = user?.name || "Pharmacist";

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
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
      joinDate: form.joinDate,
    });

    setEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "+91 98765 43210",
      role: user?.role || "Chief Pharmacist",
      license: user?.license || "TN/PH/2026/4821",
      pharmacy: user?.pharmacy || "MediTrack Pharmacy",
      pharmacyId: user?.pharmacyId || "PH-MT-220022",
      branch: user?.branch || "Anna Nagar, Chennai",
      joinDate: user?.joinDate || "24 Sep 2024",
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

  const handlePasswordChange = () => {
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

    toast.success("Password changed successfully!");
    setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handlePreferenceToggle = (key) => {
    setPreferences((p) => ({ ...p, [key]: !p[key] }));
    toast.success("Preferences saved", { id: "profile-preferences" });
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
    <div className="min-h-screen bg-[#f0f9ff] dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your account, security, and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="space-y-4">
            {/* User Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm text-center transition-colors">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0284c7] to-[#0369a1] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {userName[0]?.toUpperCase()}
                </div>
                <button
                  onClick={() => toast.info("Avatar upload coming soon")}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-sky-100 dark:border-slate-700 flex items-center justify-center text-[#0284c7] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition shadow-sm"
                  aria-label="Change avatar"
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

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-400 text-[11px] font-medium">
                <BadgeCheck size={12} />
                {form.role}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-2 shadow-sm transition-colors">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                      isActive
                        ? "bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-[#0284c7] dark:text-sky-400" />
                      <h3 className="font-bold text-[15px]">Personal Info</h3>
                    </div>

                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#0284c7] dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] transition"
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
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-bold text-[15px]">Pharmacy Details</h3>
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
                  </div>
                </div>
              </>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
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
                      className="w-full h-11 rounded-lg bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
                  <div className="flex items-center gap-2 mb-5">
                    <Smartphone size={16} className="text-[#0284c7] dark:text-sky-400" />
                    <h3 className="font-bold text-[15px]">Active Sessions</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center">
                          <Globe size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            Current Session
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Safari · macOS · Chennai
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                          <Smartphone size={16} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            iPhone · Safari
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            2 days ago · Chennai
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.success("Session revoked")}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <>
                {/* Notifications */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
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
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-sky-100 dark:border-slate-800 p-6 shadow-sm transition-colors">
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
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${
                            isActive
                              ? "border-[#0284c7] dark:border-sky-500 bg-sky-50 dark:bg-sky-950/50"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
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
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-rose-200 dark:border-rose-900/50 p-6 shadow-sm transition-colors">
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
                    className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
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