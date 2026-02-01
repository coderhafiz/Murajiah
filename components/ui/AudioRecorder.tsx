"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  Upload,
  StopCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface AudioRecorderProps {
  mediaUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  storagePath: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export default function AudioRecorder({
  mediaUrl,
  onUploadComplete,
  onRemove,
  storagePath,
  label = "Audio Setup",
  className,
  compact = false,
}: AudioRecorderProps) {
  const supabase = createClient();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        handleUpload(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleUpload = async (fileOrBlob: File | Blob) => {
    try {
      setUploading(true);
      const fileExt =
        fileOrBlob instanceof File ? fileOrBlob.name.split(".").pop() : "webm";
      const fileName = `${storagePath}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz_assets")
        .upload(fileName, fileOrBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("quiz_assets")
        .getPublicUrl(fileName);
      onUploadComplete(data.publicUrl);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Unknown error";
      alert("Failed to upload audio: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (compact) {
    // Render button-only or icon-only version if needed
    // For now, standard version is flexible enough
  }

  return (
    <div
      className={`flex flex-col gap-2 border p-4 rounded-lg bg-gray-50 border-blue-200 ${className}`}
    >
      <div className="flex justify-between items-center mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <label className="text-sm font-bold text-gray-700 cursor-pointer">
            {label}
          </label>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {!collapsed && mediaUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 h-6 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Remove
          </Button>
        )}
      </div>

      {!collapsed && (
        <>
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </div>
          ) : mediaUrl ? (
            <div className="w-full">
              <audio controls className="w-full h-8" src={mediaUrl} />
            </div>
          ) : (
            <div className="flex gap-2 items-center flex-wrap">
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="sm"
                  className="animate-pulse gap-2"
                >
                  <StopCircle className="w-4 h-4" /> Stop Rec
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Mic className="w-4 h-4" /> Record
                </Button>
              )}

              <span className="text-xs text-gray-400">or</span>

              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="w-4 h-4" /> Upload File
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
