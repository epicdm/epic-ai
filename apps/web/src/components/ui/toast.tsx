"use client";

import { toast } from "sonner";

export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
    position: "top-center"
  });
}
