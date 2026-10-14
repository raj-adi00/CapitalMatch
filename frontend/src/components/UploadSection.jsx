import { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";

export default function UploadSection({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStats(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload/", formData);
      setUploadStats(res.data);
      toast.success("File processed successfully!");
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || "Network error during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <UploadCloud className="text-blue-600" />
          Import Bank Statement
        </h2>
      </div>

      <div className="relative border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={handleUpload}
          disabled={isUploading}
          ref={fileInputRef}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-2 text-blue-700">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
          <span className="font-medium">
            {isUploading
              ? "Processing CSV..."
              : "Click or drag CSV file to upload"}
          </span>
        </div>
      </div>

      {uploadStats && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
            <CheckCircle className="w-5 h-5" />
            Imported: {uploadStats.imported} | Duplicates skipped:{" "}
            {uploadStats.duplicates}
          </div>
          {uploadStats.errors?.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
              <li className="font-bold flex items-center gap-1 mb-1">
                <AlertCircle className="w-4 h-4" /> Row Errors:
              </li>
              {uploadStats.errors.map((err, idx) => (
                <li key={idx}>
                  Line {err.line}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
