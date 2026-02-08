"use client";

import { useState, useRef } from "react";
import {
  Announcement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/app/actions/announcements";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Edit,
  Trash,
  Plus,
  Eye,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import Image from "next/image";
import { AnnouncementModal } from "@/components/marketing/AnnouncementModal";

export function AnnouncementManager({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>(initialAnnouncements);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [previewAnnouncement, setPreviewAnnouncement] =
    useState<Announcement | null>(null);

  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Announcement>>({
    heading: "",
    content: "",
    image_url: "",
    layout_type: "centered",
    is_active: false,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("announcements")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("announcements")
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(
        "Failed to upload image. Ensure 'announcements' bucket exists.",
      );
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      heading: "",
      content: "",
      image_url: "",
      layout_type: "centered",
      is_active: false,
    });
    setEditingAnnouncement(null);
  };

  const handleCreate = async () => {
    try {
      if (!formData.heading || !formData.content)
        return toast.error("Heading and content are required");

      await createAnnouncement(
        formData as Omit<Announcement, "id" | "created_at" | "created_by">,
      );
      toast.success("Announcement created");
      setIsCreateOpen(false);
      resetForm();
      // Optimistic update or router refresh? Actions revalidate path, but we might need router.refresh() if using client cache?
      // Since we passed initialAnnouncements, we rely on page reload or strict revalidation.
      // Ideally we call router.refresh() here.
      window.location.reload(); // Simple reload to get fresh data
    } catch (error: Error) {
      toast.error(error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;
    try {
      await updateAnnouncement(editingAnnouncement.id, formData);
      toast.success("Announcement updated");
      setEditingAnnouncement(null);
      resetForm();
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setFormData({
      heading: ann.heading,
      content: ann.content,
      image_url: ann.image_url,
      layout_type: ann.layout_type,
      is_active: ann.is_active,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Heading</Label>
                <Input
                  value={formData.heading}
                  onChange={(e) =>
                    setFormData({ ...formData, heading: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Image (Optional)</Label>
                <div className="relative group w-full h-[150px] bg-gray-100 dark:bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                  {formData.image_url ? (
                    <>
                      <div className="relative w-full h-full">
                        <Image
                          src={formData.image_url}
                          alt="Announcement"
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
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, image_url: "" }))
                          }
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
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Upload Image
                            </span>
                          </>
                        )}
                      </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Layout</Label>
                  <Select
                    value={formData.layout_type}
                    onValueChange={(v: Announcement["layout_type"]) =>
                      setFormData({ ...formData, layout_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="centered">
                        Centered (Text below Image)
                      </SelectItem>
                      <SelectItem value="image_left">Image Left</SelectItem>
                      <SelectItem value="image_right">Image Right</SelectItem>
                      <SelectItem value="banner">
                        Banner (Full Width Image)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(c) =>
                        setFormData({ ...formData, is_active: c })
                      }
                    />
                    <span>{formData.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Heading</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((ann) => (
              <TableRow key={ann.id}>
                <TableCell className="font-medium">{ann.heading}</TableCell>
                <TableCell className="capitalize">
                  {ann.layout_type.replace("_", " ")}
                </TableCell>
                <TableCell>
                  {ann.is_active ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewAnnouncement(ann)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(ann)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={() => handleDelete(ann.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {announcements.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No announcements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingAnnouncement}
        onOpenChange={(open) => !open && setEditingAnnouncement(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Heading</Label>
              <Input
                value={formData.heading}
                onChange={(e) =>
                  setFormData({ ...formData, heading: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Image (Optional)</Label>
              <div className="relative group w-full h-[150px] bg-gray-100 dark:bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                {formData.image_url ? (
                  <>
                    <div className="relative w-full h-full">
                      <Image
                        src={formData.image_url}
                        alt="Announcement"
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
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image_url: "" }))
                        }
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
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Upload Image
                          </span>
                        </>
                      )}
                    </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Layout</Label>
                <Select
                  value={formData.layout_type}
                  onValueChange={(v: Announcement["layout_type"]) =>
                    setFormData({ ...formData, layout_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centered">Centered</SelectItem>
                    <SelectItem value="image_left">Image Left</SelectItem>
                    <SelectItem value="image_right">Image Right</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(c) =>
                      setFormData({ ...formData, is_active: c })
                    }
                  />
                  <span>{formData.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      {previewAnnouncement && (
        <Dialog
          open={!!previewAnnouncement}
          onOpenChange={(open) => !open && setPreviewAnnouncement(null)}
        >
          {/* Wrap in a Dialog to control open/close easily or let AnnouncementModal handle it?
                AnnouncementModal creates its own Dialog. 
                If I use forceShow, it opens. But closing it inside AnnouncementModal sets isOpen to false.
                But `previewAnnouncement` state in Manager remains set.
                So if I close it, and click preview again, it might not re-open because `previewAnnouncement` didn't change (if I click same one).
                Use a key? or handle close callback?
                AnnouncementModal doesn't have `onClose` callback prop exposed yet.
            */}
          <AnnouncementModal
            announcement={previewAnnouncement}
            forceShow={true}
          />
          {/* To start simple: If I close the modal, `isOpen` becomes false inside it.
               The parent definition `previewAnnouncement` remains truthy.
               If I click another, it updates and effect runs -> opens.
               If I click same one, effect might not run if `announcement` obj ref is same.
               But `setPreviewAnnouncement` sets it freshly.
               Let's add `onClose` prop to AnnouncementModal for better control.
           */}
        </Dialog>
      )}
    </div>
  );
}
