import { useState, useRef } from "react";
import { X, Upload, Trash2, Check, User, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PRESET_AVATARS = [
  {
    id: "preset-1",
    label: "Chief Pharmacist",
    url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&auto=format&fit=crop&q=80",
  },
  {
    id: "preset-2",
    label: "Clinical Specialist",
    url: "https://images.unsplash.com/photo-1594824813583-a417dd097df9?w=160&auto=format&fit=crop&q=80",
  },
  {
    id: "preset-3",
    label: "Senior Doctor",
    url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=160&auto=format&fit=crop&q=80",
  },
  {
    id: "preset-4",
    label: "Pharmacy Consultant",
    url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=160&auto=format&fit=crop&q=80",
  },
  {
    id: "preset-5",
    label: "Medical Director",
    url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=160&auto=format&fit=crop&q=80",
  },
  {
    id: "preset-6",
    label: "Healthcare Lead",
    url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=160&auto=format&fit=crop&q=80",
  },
];

export default function AvatarModal({ currentAvatar, userName, onClose, onSave }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || "");
  const [previewName] = useState(userName || "Pharmacist");
  const fileInputRef = useRef(null);

  // Resize and compress uploaded image using an HTML5 Canvas
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (maximum 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelectedAvatar(compressedDataUrl);
        toast.success("Photo uploaded successfully!");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(selectedAvatar);
    onClose();
  };

  const handleRemove = () => {
    setSelectedAvatar("");
    toast.info("Avatar reset to initial letter");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Change Profile Avatar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload your own photo or pick a medical avatar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Active Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="w-20 h-20 rounded-full bg-sky-50 dark:bg-sky-950/40 border-2 border-sky-200/60 dark:border-sky-800/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden shadow-2xs">
              {selectedAvatar ? (
                <img
                  src={selectedAvatar}
                  alt={previewName}
                  className="w-full h-full object-cover"
                />
              ) : (
                previewName[0]?.toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {previewName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {selectedAvatar ? "Custom avatar selected" : "Using initial letter avatar"}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Upload size={13} />
                  Upload Photo
                </button>

                {selectedAvatar && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Trash2 size={13} />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preset Avatars Grid */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-amber-500" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Or choose a clinical preset
              </h3>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedAvatar === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition p-1 text-center group cursor-pointer ${
                      isSelected
                        ? "border-[#0284c7] dark:border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                    title={preset.label}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full aspect-square object-cover rounded-lg"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow-xs">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold transition shadow-2xs"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
