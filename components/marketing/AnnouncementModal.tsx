"use client";

import { useEffect, useState } from "react";
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
import { X } from "lucide-react";

type Announcement = {
  id: string;
  heading: string;
  content: string;
  image_url?: string;
  layout_type: "centered" | "image_left" | "image_right" | "banner";
  is_active?: boolean;
};

export function AnnouncementModal({
  announcement,
  forceShow = false,
}: {
  announcement: Announcement | null;
  forceShow?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (announcement) {
      if (forceShow) {
        setIsOpen(true);
      } else {
        const hasSeen = sessionStorage.getItem(
          `seen_announcement_${announcement.id}`,
        );
        if (!hasSeen) {
          setIsOpen(true);
        }
      }
    } else {
      setIsOpen(false);
    }
  }, [announcement, forceShow]);

  const handleClose = () => {
    setIsOpen(false);
    if (announcement) {
      sessionStorage.setItem(`seen_announcement_${announcement.id}`, "true");
    }
  };

  if (!announcement || !isOpen) return null;

  // Render different layouts
  const { layout_type, heading, content, image_url } = announcement;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={`sm:max-w-xl p-0 overflow-hidden gap-0 ${layout_type === "banner" ? "sm:max-w-4xl" : ""}`}
      >
        {/* Close button override if needed, but Dialog has one. */}

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
                layout_type === "centered"
                  ? "w-full h-48"
                  : layout_type === "banner"
                    ? "w-full h-32"
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

            <DialogFooter className="mt-6 sm:justify-start">
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Got it
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
