import { useState, useEffect } from "react";
import {
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  ShieldCheck,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  isApiKeyConfigured,
  hasPasscode,
  getApiKeyLastUpdated,
  verifyPasscode,
  saveApiKeyWithPasscode,
  updateApiKeyDirect,
  getRawKeyWithPasscode,
  removeApiKeyWithPasscode,
  changeSecurityPasscode,
  resetAllApiSecurity,
  testGeminiApiKey,
  fetchAiConfigFromDatabase,
  getActiveApiKey,
} from "../../services/apiSecurityService";

export default function ApiKeySettingsCard() {
  const [configured, setConfigured] = useState(() => isApiKeyConfigured());
  const [hasPin, setHasPin] = useState(() => hasPasscode());
  const [isLocked, setIsLocked] = useState(() => hasPasscode());
  const [lastUpdated, setLastUpdated] = useState(() => getApiKeyLastUpdated());

  // Input states
  const [apiKeyInput, setApiKeyInput] = useState(() =>
    hasPasscode() ? "" : getActiveApiKey()
  );
  const [showKeyText, setShowKeyText] = useState(false);

  // First-time passcode modal states ("first time mattum reenter pass kekanum")
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [firstTimeError, setFirstTimeError] = useState("");

  // Unlock modal state (only when user clicks lock to edit/view)
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [unlockError, setUnlockError] = useState("");

  // Change passcode modal state ("and change passcode um kudu keelave")
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmNextPin, setConfirmNextPin] = useState("");
  const [changePinError, setChangePinError] = useState("");

  // Remove key modal
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removePasscode, setRemovePasscode] = useState("");
  const [removeError, setRemoveError] = useState("");

  // Testing & Saving states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dbSyncing, setDbSyncing] = useState(false);

  // Sync state on external changes or DB load
  const reloadState = () => {
    const isConfig = isApiKeyConfigured();
    const pinExists = hasPasscode();
    setConfigured(isConfig);
    setHasPin(pinExists);
    setLastUpdated(getApiKeyLastUpdated());
    if (!pinExists) {
      setIsLocked(false);
      setApiKeyInput(getActiveApiKey());
    }
  };

  useEffect(() => {
    // 1. Fetch latest config from MongoDB / Firestore on mount
    setDbSyncing(true);
    fetchAiConfigFromDatabase()
      .then((cfg) => {
        if (cfg.apiKey && !hasPasscode()) {
          setApiKeyInput(cfg.apiKey);
        }
        reloadState();
      })
      .finally(() => setDbSyncing(false));

    // 2. Listen to local/storage updates
    const handler = () => reloadState();
    window.addEventListener("meditrack_gemini_api_key_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("meditrack_gemini_api_key_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  /* =====================================================
     LOCK ICON CLICK HANDLER (MELA EYE SYMBOL PAKATHULA)
  ===================================================== */
  const handleLockIconClick = () => {
    if (isLocked) {
      // User wants to unlock
      setUnlockPasscode("");
      setUnlockError("");
      setShowUnlockModal(true);
    } else {
      // User wants to lock
      if (!hasPin) {
        // First time locking — ask for passcode & re-enter
        setNewPasscode("");
        setConfirmPasscode("");
        setFirstTimeError("");
        setShowFirstTimeModal(true);
      } else {
        // Already has a passcode set — simply re-lock immediately!
        setIsLocked(true);
        setShowKeyText(false);
        toast.info("API Key locked with your passcode.");
      }
    }
  };

  /* =====================================================
     FIRST TIME PASSCODE CREATION
  ===================================================== */
  const handleSetFirstTimePasscode = async (e) => {
    if (e) e.preventDefault();
    setFirstTimeError("");

    if (!newPasscode || newPasscode.trim().length < 4) {
      setFirstTimeError("Passcode must be at least 4 characters.");
      return;
    }

    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setFirstTimeError("Passcodes do not match. Please re-enter.");
      return;
    }

    const keyToSave = apiKeyInput.trim() || getActiveApiKey();
    if (!keyToSave || keyToSave.length < 10) {
      setFirstTimeError("Please enter a valid Gemini API Key first.");
      return;
    }

    setSaving(true);
    try {
      await saveApiKeyWithPasscode({
        apiKey: keyToSave,
        passcode: newPasscode.trim(),
      });
      setShowFirstTimeModal(false);
      setIsLocked(true);
      setHasPin(true);
      setConfigured(true);
      setShowKeyText(false);
      setApiKeyInput("");
      reloadState();
      toast.success("Security Passcode set and saved to Database! Key is locked.");
    } catch (err) {
      setFirstTimeError(err.message || "Failed to set passcode.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     UNLOCK VERIFICATION (ONLY WHEN USER EXPLICITLY UNLOCKS)
  ===================================================== */
  const handleUnlockWithPasscode = async (e) => {
    if (e) e.preventDefault();
    setUnlockError("");

    if (!unlockPasscode) {
      setUnlockError("Please enter your passcode.");
      return;
    }

    try {
      const rawKey = await getRawKeyWithPasscode(unlockPasscode);
      setApiKeyInput(rawKey);
      setIsLocked(false);
      setShowUnlockModal(false);
      setUnlockPasscode("");
      toast.success("Passcode verified. API Key unlocked for editing.");
    } catch (err) {
      setUnlockError(err.message || "Incorrect passcode.");
      toast.error("Incorrect passcode. Access denied.");
    }
  };

  /* =====================================================
     SAVE KEY HANDLER
  ===================================================== */
  const handleSaveKey = async (e) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();

    if (!cleanKey || cleanKey.length < 10) {
      toast.error("Please enter a valid Google Gemini API Key.");
      return;
    }

    // If no passcode has been set yet, trigger first-time passcode modal
    if (!hasPin) {
      setNewPasscode("");
      setConfirmPasscode("");
      setFirstTimeError("");
      setShowFirstTimeModal(true);
      return;
    }

    // If passcode already exists, update key directly while keeping passcode lock
    setSaving(true);
    try {
      await updateApiKeyDirect(cleanKey);
      toast.success("API Key saved and synced with Database!");
      setIsLocked(true);
      setShowKeyText(false);
      reloadState();
    } catch (err) {
      toast.error(err.message || "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     CHANGE PASSCODE HANDLER ("change passcode um kudu keelave")
  ===================================================== */
  const handleChangePasscode = async (e) => {
    if (e) e.preventDefault();
    setChangePinError("");

    if (!currentPin) {
      setChangePinError("Please enter your current passcode.");
      return;
    }

    if (!nextPin || nextPin.trim().length < 4) {
      setChangePinError("New passcode must be at least 4 characters.");
      return;
    }

    if (nextPin.trim() !== confirmNextPin.trim()) {
      setChangePinError("New passcodes do not match. Please re-enter.");
      return;
    }

    try {
      await changeSecurityPasscode({
        currentPasscode: currentPin,
        newPasscode: nextPin.trim(),
      });
      setShowChangePinModal(false);
      setCurrentPin("");
      setNextPin("");
      setConfirmNextPin("");
      toast.success("Security Passcode updated in Database successfully!");
    } catch (err) {
      setChangePinError(err.message || "Incorrect current passcode.");
      toast.error("Failed to update passcode.");
    }
  };

  /* =====================================================
     REMOVE KEY HANDLER
  ===================================================== */
  const handleRemoveKey = async (e) => {
    if (e) e.preventDefault();
    setRemoveError("");

    try {
      await removeApiKeyWithPasscode(removePasscode);
      setShowRemoveModal(false);
      setRemovePasscode("");
      setApiKeyInput("");
      setIsLocked(false);
      reloadState();
      toast.success("API Key and passcode removed from Database.");
    } catch (err) {
      setRemoveError(err.message || "Incorrect passcode.");
      toast.error("Incorrect passcode.");
    }
  };

  /* =====================================================
     TEST CONNECTION
  ===================================================== */
  const handleTestConnection = async () => {
    const keyToTest = apiKeyInput.trim() || getActiveApiKey();
    if (!keyToTest) {
      toast.error("No API key available to test. Please enter a key.");
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

  const copyToClipboard = (text) => {
    const val = text || getActiveApiKey();
    if (!val) return;
    navigator.clipboard.writeText(val);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER BAR
      ====================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Google Gemini AI & API Credentials</span>
              {configured && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synced with Cloud Database • Powers OCR, Billing Analytics, and Clinical AI
            </p>
          </div>
        </div>

        {/* Database Status Pill */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <Database size={12} className={dbSyncing ? "text-teal-500 animate-spin" : "text-emerald-500"} />
          <span>{dbSyncing ? "Syncing DB..." : "Database Synced"}</span>
        </div>
      </div>

      {/* =====================================================
          TOP API KEY INPUT ROW WITH LOCK & EYE ICONS
      ====================================================== */}
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

        {/* Input container with Eye & Lock symbols */}
        <div className="relative">
          <input
            type={isLocked ? "text" : showKeyText ? "text" : "password"}
            placeholder="AIzaSy..."
            value={
              isLocked
                ? configured
                  ? "••••••••••••••••••••••••••••••••"
                  : ""
                : apiKeyInput
            }
            readOnly={isLocked}
            onChange={(e) => {
              if (!isLocked) setApiKeyInput(e.target.value);
            }}
            className={`w-full h-11 px-3.5 pr-28 rounded-xl border text-sm font-mono transition outline-none ${
              isLocked
                ? "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed select-none"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            }`}
          />

          {/* Action symbols inside input: [Copy] [Eye] [Lock] */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Copy Button (only if unlocked or configured) */}
            {configured && (
              <button
                type="button"
                onClick={() => copyToClipboard(apiKeyInput)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                title="Copy API key"
              >
                <Copy size={15} />
              </button>
            )}

            {/* Eye Symbol (Show / Hide) */}
            {!isLocked && (
              <button
                type="button"
                onClick={() => setShowKeyText((prev) => !prev)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                title={showKeyText ? "Hide characters" : "Show characters"}
              >
                {showKeyText ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}

            {/* LOCK SYMBOL RIGHT NEXT TO EYE SYMBOL */}
            <button
              type="button"
              onClick={handleLockIconClick}
              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                isLocked
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200"
                  : "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
              }`}
              title={
                isLocked
                  ? "Locked with Passcode. Click to unlock."
                  : hasPin
                  ? "Unlocked. Click to lock again."
                  : "Click to set passcode lock."
              }
            >
              {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            {isLocked
              ? "🔒 Key is locked with your private passcode. Click the lock symbol to edit or view."
              : "🔓 Unlocked for editing. Click the lock symbol anytime to protect it."}
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-slate-400">
              Updated: {new Date(lastUpdated).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          ACTION BUTTONS ROW (TEST & SAVE)
      ====================================================== */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
            <span>{testing ? "Testing..." : "Test Connection"}</span>
          </button>

          {testResult && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200"
              }`}
            >
              {testResult.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResult.success ? "Connection Verified!" : testResult.error}</span>
            </div>
          )}
        </div>

        {/* Save Key Button (shown when unlocked) */}
        {!isLocked && (
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Lock size={13} />
            <span>{saving ? "Saving to DB..." : "Save & Lock Key"}</span>
          </button>
        )}
      </div>

      {/* =====================================================
          BOTTOM SECTION: CHANGE PASSCODE & UTILITIES
      ====================================================== */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Security Passcode Controls
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* CHANGE PASSCODE BUTTON ("and change passcode um kudu keelave") */}
          <button
            type="button"
            onClick={() => {
              setCurrentPin("");
              setNextPin("");
              setConfirmNextPin("");
              setChangePinError("");
              setShowChangePinModal(true);
            }}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Key size={12} />
            <span>Change Passcode</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Remove Key Button */}
          <button
            type="button"
            onClick={() => {
              setRemovePasscode("");
              setRemoveError("");
              setShowRemoveModal(true);
            }}
            className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer"
          >
            <Trash2 size={12} />
            <span>Remove Key</span>
          </button>
        </div>
      </div>

      {/* =====================================================
          MODAL 1: FIRST TIME PASSCODE SETUP
          ("first time mattum reenter pass kekanum")
      ====================================================== */}
      {showFirstTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
              <Lock size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Set Security Passcode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter a 4+ digit secret passcode to lock your API key. You will only be asked for this passcode when unlocking to edit.
            </p>

            <form onSubmit={handleSetFirstTimePasscode} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Secret Passcode *
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter passcode (e.g. 1234)"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Re-enter Passcode to Confirm *
                </label>
                <input
                  type="password"
                  placeholder="Confirm passcode"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  required
                />
              </div>

              {firstTimeError && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  <span>{firstTimeError}</span>
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFirstTimeModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition"
                >
                  {saving ? "Saving to DB..." : "Set & Lock Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 2: UNLOCK PASSCODE PROMPT
          (ONLY WHEN USER CLICKS LOCK ICON TO UNLOCK)
      ====================================================== */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
              <Unlock size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Enter Passcode to Unlock
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your security passcode to view or edit the Gemini API key.
            </p>

            <form onSubmit={handleUnlockWithPasscode} className="space-y-3.5">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter passcode"
                  value={unlockPasscode}
                  onChange={(e) => setUnlockPasscode(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
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
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition"
                >
                  Unlock Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 3: CHANGE SECURITY PASSCODE
          ("and change passcode um kudu keelave")
      ====================================================== */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
              <Key size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Change Security Passcode
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update your secret passcode. Changes will be saved to the database.
            </p>

            <form onSubmit={handleChangePasscode} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Passcode *
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter current passcode"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  New Passcode (min 4 characters) *
                </label>
                <input
                  type="password"
                  placeholder="Enter new passcode"
                  value={nextPin}
                  onChange={(e) => setNextPin(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm New Passcode *
                </label>
                <input
                  type="password"
                  placeholder="Re-enter new passcode"
                  value={confirmNextPin}
                  onChange={(e) => setConfirmNextPin(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500"
                  required
                />
              </div>

              {changePinError && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  <span>{changePinError}</span>
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition"
                >
                  Update Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 4: REMOVE KEY
      ====================================================== */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 relative">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Remove Gemini API Key
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter your passcode to delete the key from database and local storage.
            </p>

            <form onSubmit={handleRemoveKey} className="space-y-3.5">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter passcode to confirm"
                  value={removePasscode}
                  onChange={(e) => setRemovePasscode(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
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
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
                >
                  Delete Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
