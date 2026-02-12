"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Announcement } from "@/app/actions/announcements";
import { updateNotificationSettings } from "@/app/actions/profile";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

export function NotificationConsentModal({
  announcement,
  hasSettings,
}: {
  announcement: Announcement | null;
  hasSettings: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only open if we have an announcement AND the user hasn't set settings yet
    if (announcement && !hasSettings) {
      setIsOpen(true);
    }
  }, [announcement, hasSettings]);

  if (!announcement || !isOpen) return null;

  const handleConsent = async (accepted: boolean) => {
    try {
      setLoading(true);
      await updateNotificationSettings({
        quiz_publish: accepted,
        game_start: accepted,
      });
      toast.success(
        accepted ? "Notifications enabled!" : "Notifications disabled.",
      );
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const { heading, content, image_url, layout_type } = announcement;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {/* Prevent closing by clicking outside to ensure choice is made? 
          Or allow closing which implies "Not Now" (no save)? 
          User Request: "seeking their permission". 
          Let's force a choice or allow close as "decide later" (don't save).
          For "First Time", best to force choice or save default. 
          I'll allow close = "Not set yet" (ask again next refresh) 
          OR close = "No". I'll make close = "No" for simplicity or just disable closing.
          Let's disable closing to ensure they see the welcome.
      */}
      <DialogContent
        className={`sm:max-w-xl p-0 overflow-hidden gap-0`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div
          className={`flex flex-col ${
            layout_type === "image_left"
              ? "sm:flex-row"
              : layout_type === "image_right"
                ? "sm:flex-row-reverse"
                : ""
          }`}
        >
          {/* Image Section */}
          {image_url && (
            <div
              className={`relative ${
                layout_type === "centered" || layout_type === "banner"
                  ? "w-full h-48"
                  : "w-full sm:w-1/2 h-48 sm:h-auto min-h-[200px]"
              }`}
            >
              <Image
                src={image_url}
                alt={heading}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content Section */}
          <div
            className={`p-6 flex flex-col justify-center ${
              !image_url
                ? "w-full"
                : layout_type === "centered" || layout_type === "banner"
                  ? "w-full"
                  : "w-full sm:w-1/2"
            }`}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-2">
                {heading}
              </DialogTitle>
              <DialogDescription className="text-base text-foreground/80 whitespace-pre-wrap">
                {content}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-8 flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleConsent(false)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <BellOff className="w-4 h-4 mr-2" />
                No, thanks
              </Button>
              <Button
                onClick={() => handleConsent(true)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
