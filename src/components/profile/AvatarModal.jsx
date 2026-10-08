import { useState, useRef } from "react";
import { X, Upload, Trash2, User, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function AvatarModal({ currentAvatar, userName, onClose, onSave }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || "");
  const [previewName] = useState(userName || "Pharmacist");
  const fileInputRef = useRef(null);

  // Resize and compress uploaded image using an HTML5 Canvas (<40KB payload)
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
    onSave("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Change Profile Photo
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload your own picture or reset to initials
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
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
            <div className="w-28 h-28 rounded-full bg-sky-50 dark:bg-sky-950/40 border-4 border-sky-200/60 dark:border-sky-800/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center text-4xl font-bold shrink-0 overflow-hidden shadow-sm mb-4">
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

            <p className="text-base font-bold text-slate-800 dark:text-slate-100">
              {previewName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              {selectedAvatar ? "Custom photo active" : "Using initial letter avatar"}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
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
                className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Upload size={14} />
                Upload New Photo
              </button>

              {selectedAvatar && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Trash2 size={14} />
                  Reset
                </button>
              )}
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
            className="px-5 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold transition shadow-2xs cursor-pointer"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
