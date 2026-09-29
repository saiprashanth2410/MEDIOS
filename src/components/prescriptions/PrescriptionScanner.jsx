import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  Camera,
  Upload,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Brain,
} from "lucide-react";
import { parsePrescriptionImage } from "../../services/aiService";

export default function PrescriptionScanner({ onResult, onClose }) {
  const [mode, setMode] = useState("upload");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [attemptInfo, setAttemptInfo] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /* =====================================================
     CAMERA
  ===================================================== */

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("[Scanner] Camera error:", err);
      toast.error("Camera access denied. Use upload instead.");
      setMode("upload");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], "prescription.jpg", {
          type: "image/jpeg",
        });
        handleFile(file);
      },
      "image/jpeg",
      0.9
    );
  };

  /* =====================================================
     FILE HANDLING
  ===================================================== */

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setError("");
    setAttemptInfo("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  /* =====================================================
     PARSE — ✨ UPDATED WITH PROGRESS CALLBACK
  ===================================================== */

  const handleParse = async () => {
    if (!image) {
      setError("Please select or capture a prescription image");
      return;
    }

    setLoading(true);
    setError("");
    setAttemptInfo("");
    setProgress("Starting AI scan...");

    try {
      const result = await parsePrescriptionImage(image, (status) => {
        console.log("[Scanner] Progress:", status);
        setProgress(status);

        // ✨ Extract attempt info from status
        if (status.includes("Attempt") || status.includes("Retrying")) {
          setAttemptInfo(status);
        }
      });

      setProgress("Success!");
      if (result.isFallback) {
        toast.info("Cloud AI offline. Loaded editable draft prescription for review.");
      } else {
        toast.success(`Prescription parsed with ${result.model || "AI"}`);
      }
      onResult?.(result.data);
      onClose?.();
    } catch (err) {
      console.error("[Scanner] Parse error:", err);
      setError(err.message || "Failed to parse prescription");
      toast.error(err.message || "Parsing failed");
    } finally {
      setLoading(false);
      setProgress("");
      setAttemptInfo("");
    }
  };

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    let active = true;
    if (mode === "camera") {
      queueMicrotask(() => {
        if (active) startCamera();
      });
    } else {
      stopCamera();
    }
    return () => {
      active = false;
      stopCamera();
    };
  }, [mode]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const reset = () => {
    setImage(null);
    setPreview("");
    setError("");
    setAttemptInfo("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-2xl">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">AI Prescription Scanner</h3>
              <p className="text-[11px] text-slate-500">
                Snap a prescription, AI reads it
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* =====================================================
            TABS
        ====================================================== */}

        <div className="flex border-b border-slate-100">
          <button
            onClick={() => {
              if (loading) return;
              setMode("upload");
              reset();
            }}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === "upload"
                ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                : "text-slate-500"
            }`}
          >
            <Upload size={15} />
            Upload
          </button>
          <button
            onClick={() => {
              if (loading) return;
              setMode("camera");
              reset();
            }}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === "camera"
                ? "text-[#0284c7] border-b-2 border-[#0284c7]"
                : "text-slate-500"
            }`}
          >
            <Camera size={15} />
            Camera
          </button>
        </div>

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div className="p-5">

          {/* IMAGE PREVIEW */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
              <img
                src={preview}
                alt="Prescription"
                className="w-full max-h-[400px] object-contain bg-slate-50"
              />

              {!loading && (
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center px-6">
                  <Loader2
                    size={36}
                    className="text-white animate-spin mb-4"
                  />

                  <p className="text-white text-sm font-semibold text-center">
                    {progress || "Processing..."}
                  </p>

                  {attemptInfo && attemptInfo !== progress && (
                    <p className="text-white/60 text-xs mt-2 text-center">
                      {attemptInfo}
                    </p>
                  )}

                  <p className="text-white/50 text-[11px] mt-3 text-center max-w-xs">
                    AI is reading your prescription. This may take up to 30
                    seconds.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* UPLOAD MODE */}
              {mode === "upload" && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl py-14 cursor-pointer transition bg-slate-50/50 hover:bg-violet-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                      <Sparkles size={24} className="text-violet-600" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      Upload prescription image
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      Drag & drop or click to browse
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        JPG
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        PNG
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        HEIC
                      </span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              )}

              {/* CAMERA MODE */}
              {mode === "camera" && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Guide overlay */}
                    <div className="absolute inset-4 border-2 border-white/50 border-dashed rounded-lg pointer-events-none" />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-3 py-1 rounded-full">
                      Align prescription within frame
                    </div>
                  </div>

                  <button
                    onClick={capturePhoto}
                    className="w-full h-12 rounded-xl bg-[#0284c7] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#0369a1] transition"
                  >
                    <Camera size={18} />
                    Capture Photo
                  </button>
                </div>
              )}
            </>
          )}

          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
              <AlertCircle
                size={14}
                className="text-rose-500 mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-rose-700 font-medium">
                  {error}
                </p>
                {error.includes("busy") && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Tip: Try again in 30 seconds. The AI retries automatically.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =====================================================
              PARSE BUTTON
          ====================================================== */}

          {preview && !loading && (
            <button
              onClick={handleParse}
              className="w-full h-12 mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-violet-500/20"
            >
              <Sparkles size={18} />
              Extract with AI
            </button>
          )}

          {/* =====================================================
              INFO
          ====================================================== */}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5">
            <CheckCircle2
              size={14}
              className="text-violet-600 mt-0.5 shrink-0"
            />
            <p className="text-xs text-violet-800">
              AI reads handwritten prescriptions and extracts patient, doctor,
              and medicine details automatically. If servers are busy, it
              auto-retries.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}