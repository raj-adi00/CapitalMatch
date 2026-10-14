// src/components/UploadSection.jsx
import { useState, useRef } from "react";
import api from "../api";

export default function UploadSection({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadStats(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload/", formData);
      setUploadStats(res.data);
      if (onUploadSuccess) onUploadSuccess(); // Trigger dashboard refresh
    } catch (err) {
      setUploadError(err.response?.data?.error || "Network error during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  return (
    <div style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "2rem" }}>
      <h2>Import Bank Statement</h2>
      <div style={{ marginTop: "1rem" }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleUpload} 
          disabled={isUploading}
          ref={fileInputRef}
        />
        {isUploading && <span style={{ marginLeft: "1rem", color: "#666" }}>Uploading and processing...</span>}
      </div>

      {uploadError && <div style={{ color: "#d9534f", marginTop: "1rem" }}>{uploadError}</div>}
      
      {uploadStats && (
        <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#dff0d8", borderRadius: "4px" }}>
          <p style={{ margin: 0, color: "#3c763d", fontWeight: "bold" }}>
            Imported: {uploadStats.imported} | Duplicates skipped: {uploadStats.duplicates}
          </p>
          {uploadStats.errors?.length > 0 && (
            <ul style={{ color: "#a94442", marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
              {uploadStats.errors.map((err, idx) => (
                <li key={idx}>Line {err.line}: {err.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}