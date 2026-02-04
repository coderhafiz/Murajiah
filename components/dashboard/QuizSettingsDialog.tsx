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
// ... imports
import { Image as ImageIcon, Loader2, X, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ...

type QuizSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialCoverImage: string | null;
  initialVisibility: "public" | "private";
  initialTags: string[];
  onSave: (updates: {
    title: string;
    description: string;
    cover_image: string;
    visibility: "public" | "private";
    tags: string[];
  }) => void;
};

export default function QuizSettingsDialog({
  open,
  onOpenChange,
  quizId,
  initialTitle,
  initialDescription,
  initialCoverImage,
  initialVisibility,
  initialTags,
  onSave,
}: QuizSettingsProps) {
  const supabase = createClient();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || "");
  const [coverImage, setCoverImage] = useState(initialCoverImage || "");
  const [visibility, setVisibility] = useState<"public" | "private">(
    initialVisibility,
  );
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateImage = async () => {
    try {
      setGenerating(true);
      const prompt = title || description || "educational quiz";

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCoverImage(data.imageUrl);
    } catch (error: any) {
      console.error("AI Gen Error:", error);
      alert(error.message || "Failed to generate image");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

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
        description: description || null,
        cover_image: coverImage || null,
        visibility,
      };

      // 1. Update Quiz
      const { error } = await supabase
        .from("quizzes")
        .update(updates)
        .eq("id", quizId);

      if (error) throw error;

      // 2. Update Tags (Full replace logic)
      // Delete existing
      await supabase.from("quiz_tags").delete().eq("quiz_id", quizId);

      // Insert new
      if (tags.length > 0) {
        const { error: tagError } = await supabase.from("quiz_tags").insert(
          tags.map((tag) => ({
            quiz_id: quizId,
            tag: tag,
          })),
        );
        if (tagError) throw tagError;
      }

      onSave({
        title,
        description,
        cover_image: coverImage,
        visibility,
        tags,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(`Failed to save settings: ${error.message}`);
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
                      variant="default"
                      size="sm"
                      onClick={handleGenerateImage}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1 text-yellow-300" />
                          AI
                        </>
                      )}
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
                <div className="flex flex-col gap-3 items-center">
                  <div
                    className="text-center cursor-pointer p-2 flex flex-col items-center justify-center hover:opacity-75 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-sm font-medium text-gray-500">
                          Upload Image
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">- OR -</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={generating}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    {generating ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    Generate with AI
                  </Button>
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

          {/* Visibility */}
          <div className="grid gap-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "private")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  🔒 Private (Only you can see it)
                </SelectItem>
                <SelectItem value="public">
                  🌍 Public (Everyone can search/play)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
              />
              <Button onClick={() => handleAddTag()} type="button" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pl-2">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {tags.length === 0 && (
                <span className="text-sm text-gray-500 italic">
                  No tags added
                </span>
              )}
            </div>
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
