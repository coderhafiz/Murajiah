"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  LogOut,
  Loader2,
  Pencil,
  Check,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function AccountForm({
  user,
}: {
  user: { id: string; email?: string };
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Unknown error";
      alert("Error uploading avatar: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, email")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url || "");
          setEmail(data.email || user.email);
        }
      } catch (error) {
        console.error(
          "Error loading user data!",
          JSON.stringify(error, null, 2),
        );
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [user, supabase]);

  const updateProfile = async () => {
    try {
      setSaving(true);

      const updates = {
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;
      alert("Profile updated!");
      router.refresh();
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Unknown error";
      alert(`Error updating profile: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="-ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" /> Account Settings
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group">
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer block relative"
              >
                <Avatar className="w-24 h-24 group-hover:opacity-75 transition-opacity">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {fullName?.charAt(0) || email?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
                      Edit
                    </span>
                  )}
                </div>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>

            {/* <div className="text-center">
              <p className="font-medium text-lg">{email}</p>
              <p className="text-sm text-muted-foreground">
                User ID: {user.id}
              </p>
            </div> */}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name
            </label>
            <div className="flex items-center gap-2 h-10">
              {isEditingName ? (
                <>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    className="max-w-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingName(false)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xl font-semibold px-2 text-foreground">
                    {fullName || (
                      <span className="text-muted-foreground italic">
                        No name set
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingName(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Avatar URL Input Removed - Click Image Instead */}
          {/* 
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar URL</label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </div> 
          */}

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between gap-4 sm:gap-0">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button
              onClick={updateProfile}
              disabled={saving}
              className="bg-primary text-white w-full sm:w-auto"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors gap-4 sm:gap-0">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">Reference Files</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage uploaded documents
                </p>
              </div>
            </div>
            <Link href="/account/files" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                View Library
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
