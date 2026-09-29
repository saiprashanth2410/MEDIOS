import { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Upload,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Zap,
  ZapOff,
} from "lucide-react";

export default function BarcodeScanner({ onScan, onClose }) {
  const [mode, setMode] = useState("camera");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const containerId = "mt-scanner-view";

  /* =====================================================
     START CAMERA
  ===================================================== */
  const startCamera = async () => {
    setError("");
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Wait for DOM
      await new Promise((r) => setTimeout(r, 100));

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Ignore frame-by-frame errors
        }
      );

      // Check torch support
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities?.torch) setTorchSupported(true);
      } catch (err) {
        console.debug("Torch capability check:", err);
      }
    } catch (err) {
      console.error(err);
      setError("Camera access denied. Please allow camera permission or use upload.");
      setScanning(false);
    }
  };

  /* =====================================================
     STOP CAMERA
  ===================================================== */
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.debug("Stop scanner fallback:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setTorchSupported(false);
    setTorchOn(false);
  };

  /* =====================================================
     TORCH TOGGLE
  ===================================================== */
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn((t) => !t);
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  /* =====================================================
     SUCCESS
  ===================================================== */
  const handleSuccess = (text) => {
    setResult(text);
    stopCamera();
  };

  /* =====================================================
     FILE UPLOAD
  ===================================================== */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("mt-scanner-upload");
      const text = await scanner.scanFile(file, true);
      setResult(text);
    } catch {
      setError("Could not detect a barcode/QR in the image. Try another.");
    } finally {
      setScanning(false);
    }
  };

  /* =====================================================
     MODE SWITCH
  ===================================================== */
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (mode === "camera" && !result) {
        startCamera();
      } else {
        stopCamera();
      }
    });
    return () => {
      active = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, result]);

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  const reset = () => {
    setResult("");
    setError("");
    if (mode === "camera") startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <ScanLine size={20} className="text-[#0284c7]" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Scan Medicine</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                QR code or barcode
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X size={18} className="text-slate-500 dark:text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* =====================================================
            TABS
        ====================================================== */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <TabButton
            active={mode === "camera"}
            onClick={() => {
              setMode("camera");
              setResult("");
            }}
            icon={Camera}
            label="Camera"
          />
          <TabButton
            active={mode === "upload"}
            onClick={() => {
              setMode("upload");
              setResult("");
              stopCamera();
            }}
            icon={Upload}
            label="Upload"
          />
        </div>

        {/* =====================================================
            CONTENT
        ====================================================== */}
        <div className="p-5">

          {result ? (
            <ResultView
              result={result}
              onReset={reset}
              onUse={() => {
                onScan?.(result);
                onClose?.();
              }}
            />
          ) : (
            <>
              {mode === "camera" && (
                <CameraView
                  containerId={containerId}
                  scanning={scanning}
                  error={error}
                  torchSupported={torchSupported}
                  torchOn={torchOn}
                  onToggleTorch={toggleTorch}
                />
              )}

              {mode === "upload" && (
                <UploadView
                  scanning={scanning}
                  onFile={handleFileUpload}
                />
              )}

              {error && mode === "upload" && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <AlertCircle
                    size={14}
                    className="text-rose-500 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}

/* =====================================================
   TAB BUTTON
===================================================== */

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition relative ${
        active
          ? "text-[#0284c7]"
          : "text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-100"
      }`}
    >
      <Icon size={15} />
      {label}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0284c7]" />
      )}
    </button>
  );
}

/* =====================================================
   CAMERA VIEW — Beautiful custom overlay
===================================================== */

function CameraView({
  containerId,
  scanning,
  error,
  torchSupported,
  torchOn,
  onToggleTorch,
}) {
  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">

        {/* Scanner container — Html5Qrcode renders here */}
        <div
          id={containerId}
          className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
        />

        {/* Custom overlay — corners + scan line */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette outside scan area */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Scan area */}
            <div className="relative w-[70%] aspect-square">

              {/* Corners */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl" />

              {/* Animated scan line */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent animate-scan" />
            </div>
          </div>
        )}

        {/* Torch button */}
        {scanning && torchSupported && (
          <button
            onClick={onToggleTorch}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition"
            aria-label="Toggle flash"
          >
            {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
        )}

        {/* Loading state */}
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/80 text-xs">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center">
              <AlertCircle
                size={32}
                className="text-rose-400 mx-auto mb-3"
              />
              <p className="text-white text-sm font-medium mb-1">
                Camera unavailable
              </p>
              <p className="text-white/60 text-xs">{error}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-4 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
        Align barcode within the frame
      </p>
    </div>
  );
}

/* =====================================================
   UPLOAD VIEW
===================================================== */

function UploadView({ scanning, onFile }) {
  return (
    <div>
      <label
        htmlFor="mt-scanner-upload-input"
        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#0284c7] rounded-2xl py-14 cursor-pointer transition bg-slate-50/50 hover:bg-sky-50 dark:hover:bg-slate-800"
      >
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-4">
          <Upload size={24} className="text-[#0284c7]" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {scanning ? "Scanning..." : "Upload an image"}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
          PNG, JPG, or screenshot of a barcode
        </p>
        <input
          id="mt-scanner-upload-input"
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
        />
      </label>

      <div id="mt-scanner-upload" className="hidden" />
    </div>
  );
}

/* =====================================================
   RESULT VIEW
===================================================== */

function ResultView({ result, onReset, onUse }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 animate-fade-up">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>

      <p className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
        Code detected!
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-5">
        Scanned successfully
      </p>

      <div className="bg-slate-50 rounded-xl px-4 py-3.5 mb-5 border border-slate-100 dark:border-slate-800">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          Result
        </p>
        <p className="text-sm font-mono font-bold text-[#0284c7] break-all">
          {result}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Scan again
        </button>
        <button
          onClick={onUse}
          className="flex-1 py-3 rounded-xl bg-[#0284c7] text-white text-sm font-semibold hover:bg-[#0369a1] transition shadow-sm"
        >
          Use code
        </button>
      </div>
    </div>
  );
}