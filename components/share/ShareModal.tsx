"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Link as LinkIcon,
  Copy,
  Check,
  X,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  inviteCollaborator,
  getCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
  createShareLink,
  getShareLinks,
  revokeShareLink,
  type Collaborator,
  type ShareLink,
} from "@/app/actions/share";

export default function ShareModal({
  quizId,
  trigger,
}: {
  quizId: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");

  const loadData = async () => {
    setLoading(true);
    const [collabRes, linkRes] = await Promise.all([
      getCollaborators(quizId),
      getShareLinks(quizId),
    ]);
    if (collabRes && collabRes.data) {
      // Normalize the nested email object from Supabase join
      const normalizedCollaborators = collabRes.data.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        role: c.role,
        email: c.email?.email || "Unknown",
        avatar_url: c.avatar_url,
      }));
      setCollaborators(normalizedCollaborators);
    }
    if (linkRes) setLinks(linkRes as ShareLink[]);
    setLoading(false);
  };

  // Fetch Data when opening
  useEffect(() => {
    if (open) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      const res = await inviteCollaborator(quizId, inviteEmail, inviteRole);
      if (res.success) {
        toast.success("Invited successfully");
        setInviteEmail("");
        loadData();
      } else {
        toast.error(res.error || "Failed to invite");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleCreateLink = async () => {
    const res = await createShareLink(quizId, "viewer"); // Default to viewer for safety
    if (res.success) {
      toast.success("Link created");
      loadData();
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Quiz</DialogTitle>
          <DialogDescription>
            Invite others to collaborate or share a public link.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="people" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          {/* PEOPLE TAB */}
          <TabsContent value="people" className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select
                value={inviteRole}
                onValueChange={(v: any) => setInviteRole(v)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} size="icon">
                <Check className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Collaborators
              </h4>
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
                </div>
              ) : collaborators.length === 0 ? (
                <div className="text-sm text-center text-muted-foreground py-4 border rounded-lg border-dashed">
                  No collaborators yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {collaborators.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/20"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={c.avatar_url} />
                          <AvatarFallback>
                            {c.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {c.full_name || c.email}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {c.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          defaultValue={c.role}
                          onValueChange={async (val: "editor" | "viewer") => {
                            await updateCollaboratorRole(
                              quizId,
                              c.user_id,
                              val,
                            );
                            toast.success("Role updated");
                          }}
                        >
                          <SelectTrigger className="w-[90px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            await removeCollaborator(quizId, c.user_id);
                            loadData();
                            toast.success("Removed");
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* LINKS TAB */}
          <TabsContent value="links" className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-muted-foreground">
                Active Links
              </h4>
              <Button size="sm" onClick={handleCreateLink} variant="outline">
                Create New Link
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-sm text-center text-muted-foreground py-8 border rounded-lg border-dashed">
                No active share links
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-card"
                  >
                    <div className="bg-muted p-2 rounded-md">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {window.location.origin}/share/{link.token}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Role:{" "}
                        <span className="uppercase font-semibold text-xs">
                          {link.role}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyLink(link.token)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        await revokeShareLink(link.id);
                        loadData();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
