import { useState, useEffect } from "react";
import {
  Key,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  isApiKeyConfigured,
  hasPasscode,
  getApiKeyLastUpdated,
  verifyPasscode,
  saveApiKeyWithPasscode,
  getRawKeyWithPasscode,
  removeApiKeyWithPasscode,
  resetAllApiSecurity,
  testGeminiApiKey,
} from "../../services/apiSecurityService";

export default function ApiKeySettingsCard() {
  const [configured, setConfigured] = useState(() => isApiKeyConfigured());
  const [passcodeLocked, setPasscodeLocked] = useState(() => hasPasscode());
  const [isUnlocked, setIsUnlocked] = useState(() => !hasPasscode());
  const [lastUpdated, setLastUpdated] = useState(() => getApiKeyLastUpdated());

  // Input states
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  // Visibility toggles
  const [showKeyText, setShowKeyText] = useState(false);
  const [showPasscodeText, setShowPasscodeText] = useState(false);

  // Modal / Prompt states
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [unlockError, setUnlockError] = useState("");

  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removePasscode, setRemovePasscode] = useState("");
  const [removeError, setRemoveError] = useState("");

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Testing & Saving states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // Sync state on external changes
  const reloadState = () => {
    const isConfig = isApiKeyConfigured();
    const isHasPin = hasPasscode();
    setConfigured(isConfig);
    setPasscodeLocked(isHasPin);
    setLastUpdated(getApiKeyLastUpdated());
    if (!isHasPin) {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    const handler = () => reloadState();
    window.addEventListener("meditrack_gemini_api_key_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("meditrack_gemini_api_key_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  /* =====================================================
     UNLOCK HANDLER
  ===================================================== */
  const handleUnlock = async (e) => {
    if (e) e.preventDefault();
    setUnlockError("");

    if (!unlockPasscode) {
      setUnlockError("Please enter your security passcode.");
      return;
    }

    try {
      const rawKey = await getRawKeyWithPasscode(unlockPasscode);
      setApiKeyInput(rawKey);
      setIsUnlocked(true);
      setShowUnlockModal(false);
      setUnlockPasscode("");
      toast.success("Security Passcode verified. API Key unlocked for editing.");
    } catch (err) {
      setUnlockError(err.message || "Incorrect passcode. Please try again.");
      toast.error("Incorrect passcode. Access denied.");
    }
  };

  /* =====================================================
     LOCK HANDLER
  ===================================================== */
  const handleLockNow = () => {
    setIsUnlocked(false);
    setApiKeyInput("");
    setPasscodeInput("");
    setConfirmPasscode("");
    setTestResult(null);
    setShowKeyText(false);
    toast.info("API Key is locked with passcode protection.");
  };

  /* =====================================================
     SAVE & LOCK HANDLER
  ===================================================== */
  const handleSaveAndLock = async (e) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    const cleanPin = passcodeInput.trim();

    if (!cleanKey || cleanKey.length < 10) {
      toast.error("Please provide a valid Google Gemini API Key.");
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      toast.error("Security passcode must be at least 4 characters long.");
      return;
    }

    if (cleanPin !== confirmPasscode.trim()) {
      toast.error("Security passcodes do not match. Please re-enter.");
      return;
    }

    setSaving(true);
    try {
      await saveApiKeyWithPasscode({ apiKey: cleanKey, passcode: cleanPin });
      toast.success(
        "API Key successfully saved & passcode-locked! Active across the entire system."
      );
      reloadState();
      setIsUnlocked(false);
      setApiKeyInput("");
      setPasscodeInput("");
      setConfirmPasscode("");
      setTestResult(null);
    } catch (err) {
      toast.error(err.message || "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     TEST KEY CONNECTION
  ===================================================== */
  const handleTestConnection = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      toast.error("Please enter a Gemini API Key to test.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(keyToTest);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      toast.error("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  /* =====================================================
     REMOVE KEY HANDLER
  ===================================================== */
  const handleRemoveKey = async (e) => {
    if (e) e.preventDefault();
    setRemoveError("");

    if (!removePasscode) {
      setRemoveError("Enter your passcode to confirm deletion.");
      return;
    }

    try {
      await removeApiKeyWithPasscode(removePasscode);
      toast.success("API Key and passcode protection removed.");
      setShowRemoveModal(false);
      setRemovePasscode("");
      setApiKeyInput("");
      setPasscodeInput("");
      setConfirmPasscode("");
      reloadState();
    } catch (err) {
      setRemoveError(err.message || "Incorrect passcode.");
      toast.error("Incorrect passcode. Unable to delete key.");
    }
  };

  /* =====================================================
     FORGOT PASSCODE / EMERGENCY RESET
  ===================================================== */
  const handleEmergencyReset = () => {
    resetAllApiSecurity();
    setShowResetConfirm(false);
    setShowUnlockModal(false);
    setApiKeyInput("");
    setPasscodeInput("");
    setConfirmPasscode("");
    reloadState();
    toast.info("Security reset complete. You can now configure a new API key and passcode.");
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER & STATUS BANNER
      ====================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 border border-teal-200/60 dark:border-teal-800/40">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Gemini AI & API Passcode Protection
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Centralized AI credentials protected with your private security passcode
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {configured && passcodeLocked ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Lock size={12} />
              <span>Active & Passcode-Locked</span>
            </span>
          ) : configured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/60">
              <CheckCircle2 size={12} />
              <span>Active (Unprotected)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Not Configured</span>
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          EXPLANATION BOX
      ====================================================== */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <Info size={16} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            How centralized AI works across MediTrack:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Entire Project Integration</strong>: When configured here, this single key powers <em>Prescription OCR Vision Scanner</em>, <em>Predictive Analytics in Dashboard</em>, and <em>Automated Medicine Classification</em> everywhere.
            </li>
            <li>
              <strong>Passcode Privacy Lock</strong>: Only you know the security passcode. The API key is masked in the browser interface and cannot be viewed, edited, or deleted without entering your passcode.
            </li>
            <li>
              <strong>Offline Resilience</strong>: If no key is configured or offline, MediTrack gracefully falls back to built-in offline smart OCR and heuristic analytics without downtime.
            </li>
          </ul>
        </div>
      </div>

      {/* =====================================================
          CASE 1: CONFIGURED & CURRENTLY LOCKED
      ====================================================== */}
      {configured && passcodeLocked && !isUnlocked && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Google Gemini API Key is Securely Locked
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lastUpdated
                    ? `Last updated: ${new Date(lastUpdated).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Active and operating project-wide"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUnlockError("");
                setUnlockPasscode("");
                setShowUnlockModal(true);
              }}
              className="px-4 py-2 bg-[#0284c7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Unlock size={14} />
              <span>Unlock to View / Edit</span>
            </button>
          </div>

          {/* Masked Key Display */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Encrypted API Key
            </label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <Lock size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-mono text-sm tracking-widest text-slate-600 dark:text-slate-400 select-none">
                •••• •••• •••• •••• •••• •••• •••• ••••
              </span>
              <span className="ml-auto text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Protected by Passcode
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
            >
              Forgot Passcode? Reset Configuration
            </button>

            <button
              type="button"
              onClick={() => {
                setRemoveError("");
                setRemovePasscode("");
                setShowRemoveModal(true);
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Remove Key</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          CASE 2: UNLOCKED OR INITIAL SETUP (EDITING MODE)
      ====================================================== */}
      {(!configured || isUnlocked) && (
        <form
          onSubmit={handleSaveAndLock}
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Key size={18} className="text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {configured ? "Edit Gemini API Key & Passcode" : "Configure New Gemini API Key"}
              </h3>
            </div>

            {configured && passcodeLocked && (
              <button
                type="button"
                onClick={handleLockNow}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Lock size={12} />
                <span>Lock Again</span>
              </button>
            )}
          </div>

          {/* Input 1: API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Google Gemini API Key</span>
                <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Get a free key from Google AI Studio</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKeyText ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full h-11 px-3.5 pr-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKeyText((prev) => !prev)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                  title={showKeyText ? "Hide key" : "Show key"}
                >
                  {showKeyText ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apiKeyInput)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                    title="Copy to clipboard"
                  >
                    <Copy size={15} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Key typically starts with <code className="font-mono text-teal-600 dark:text-teal-400">AIzaSy...</code>
            </p>
          </div>

          {/* Test Connection Button & Result */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !apiKeyInput.trim()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
              <span>{testing ? "Testing Connection..." : "Test Connection"}</span>
            </button>

            {testResult && (
              <div
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
                  testResult.success
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
                )}
                <span>{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            )}
          </div>

          {/* Passcode Security Setup Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-teal-600 dark:text-teal-400" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Security Passcode Lock
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Create a private passcode known only to you. You will need this passcode whenever you want to view, modify, or remove this key.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Passcode Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Secret Passcode (min 4 characters)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasscodeText ? "text" : "password"}
                    placeholder="Enter passcode (e.g. 1234)"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscodeText((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPasscodeText ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Passcode Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Confirm Passcode</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPasscodeText ? "text" : "password"}
                  placeholder="Re-enter passcode"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Bottom Save & Lock Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <p className="text-[11px] text-slate-400">
              Protected using SHA-256 cryptographic one-way hashing.
            </p>

            <div className="flex items-center gap-3">
              {configured && (
                <button
                  type="button"
                  onClick={handleLockNow}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel & Lock
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white shadow-sm flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Lock size={14} />
                <span>{saving ? "Saving & Encrypting..." : "Save & Lock Key"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================
          UNLOCK MODAL
      ====================================================== */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
              <Unlock size={22} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Enter Security Passcode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Please enter your private passcode to unlock and view the Gemini API key.
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter security passcode"
                  value={unlockPasscode}
                  onChange={(e) => setUnlockPasscode(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                {unlockError && (
                  <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{unlockError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Verify & Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          REMOVE KEY MODAL
      ====================================================== */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 size={22} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Confirm Key Removal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your passcode to remove the Gemini API key. MediTrack will switch back to offline built-in analytics and OCR.
            </p>

            <form onSubmit={handleRemoveKey} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter passcode to confirm"
                  value={removePasscode}
                  onChange={(e) => setRemovePasscode(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
                {removeError && (
                  <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{removeError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Delete API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          EMERGENCY RESET MODAL
      ====================================================== */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <ShieldAlert size={22} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Reset API Key & Passcode?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              If you forgot your passcode, you can wipe the existing stored API key and security lock. You will then be able to configure a new API key and choose a new passcode.
            </p>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmergencyReset}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

