"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import {
  updateSection,
  deleteSection,
  createSection,
  reorderSections,
} from "@/app/actions/homepage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Section {
  id: string;
  title: string;
  description?: string;
  is_visible: boolean;
  section_type: "trending" | "recent" | "featured";
  order_index: number;
}

export function HomepageManager({
  initialSections,
}: {
  initialSections: any[];
}) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New Section Form State
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"trending" | "recent" | "featured">(
    "featured",
  );
  const [newDesc, setNewDesc] = useState("");

  const handleToggleVisibility = async (id: string, current: boolean) => {
    try {
      // Optimistic update
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_visible: !current } : s)),
      );
      await updateSection(id, { is_visible: !current });
      toast.success("Visibility updated");
    } catch (error) {
      // Revert
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_visible: current } : s)),
      );
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      setLoading(true);
      await deleteSection(id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast.success("Section deleted");
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];

    setSections(newSections);

    // Persist order
    try {
      const orderedIds = newSections.map((s) => s.id);
      await reorderSections(orderedIds);
    } catch (error) {
      toast.error("Failed to reorder");
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      await createSection({
        title: newTitle,
        section_type: newType,
        description: newDesc,
        order_index: sections.length,
      });
      toast.success("Section created");
      setIsDialogOpen(false);
      // Ideally we should refresh the list or return the new item from the action to append locally
      // For now, reloading the page or trusting revalidatePath (which might need router.refresh() here)
      // Since revalidatePath only affects server fetches, we might need to manually fetch or reload.
      // Let's reload window for simplicity or assume props update if using router.refresh?
      // Actually actions revalidatePath refreshes the page data if it's a server component parent?
      // Yes, in Next.js App Router, actions revalidatePath causes the page to re-render with fresh data.
      // So props `initialSections` might update? No, existing client state persists.
      // We should use router.refresh().
      window.location.reload();
    } catch (error) {
      toast.error("Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Featured Quizzes"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending">
                    Trending (Most Played)
                  </SelectItem>
                  <SelectItem value="recent">Recent (Newest)</SelectItem>
                  <SelectItem value="featured">Featured (Curated)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={loading}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {sections.map((section, index) => (
          <Card
            key={section.id}
            className="flex flex-row items-center p-4 gap-4"
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSection(index, "up")}
                disabled={index === 0}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => moveSection(index, "down")}
                disabled={index === sections.length - 1}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{section.title}</h3>
                <Badge variant="outline">{section.section_type}</Badge>
                {!section.is_visible && (
                  <Badge variant="destructive">Hidden</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  handleToggleVisibility(section.id, section.is_visible)
                }
                title={section.is_visible ? "Hide" : "Show"}
              >
                {section.is_visible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(section.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}

        {sections.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
            No sections configured. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
