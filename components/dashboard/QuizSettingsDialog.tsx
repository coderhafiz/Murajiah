"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";

type QuizSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialCoverImage: string | null;
  onSave: (updates: {
    title: string;
    description: string;
    cover_image: string;
  }) => void;
};

export default function QuizSettingsDialog({
  open,
  onOpenChange,
  quizId,
  initialTitle,
  initialDescription,
  initialCoverImage,
  onSave,
}: QuizSettingsProps) {
  const supabase = createClient();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const [coverImage, setCoverImage] = useState(initialCoverImage || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${quizId}/cover_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz_assets")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("quiz_assets")
        .getPublicUrl(fileName);

      setCoverImage(data.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = {
        title,
        description: description || null, // convert empty string to null if preferred, or keep as string
        cover_image: coverImage || null,
      };

      const { error } = await supabase
        .from("quizzes")
        .update(updates)
        .eq("id", quizId);

      if (error) throw error;

      onSave({
        title,
        description,
        cover_image: coverImage,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz Settings</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Cover Image */}
          <div className="flex flex-col gap-2">
            <Label>Cover Image</Label>
            <div className="relative group w-full h-[150px] sm:h-[200px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {coverImage ? (
                <>
                  <div className="relative w-full h-full">
                    <Image
                      src={coverImage}
                      alt="Cover"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCoverImage("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className="text-center cursor-pointer p-4 w-full h-full flex flex-col items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
                      <span className="text-sm font-medium text-gray-500">
                        Click to upload cover image
                      </span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter quiz title..."
              className="font-bold text-lg"
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this quiz about?"
              className="resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
