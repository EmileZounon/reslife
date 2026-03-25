"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

interface CsvUploadProps {
  onFileContent: (content: string) => void;
}

export function CsvUpload({ onFileContent }: CsvUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a .csv file");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileContent(e.target?.result as string);
      };
      reader.readAsText(file);
    },
    [onFileContent]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {fileName ? (
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-medium">{fileName}</span>
          <button
            onClick={() => { setFileName(null); onFileContent(""); }}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop a CSV file, or click to browse
          </p>
          <label className="cursor-pointer">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3">
              Choose File
            </span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
