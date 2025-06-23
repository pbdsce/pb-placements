"use client";
import { useEffect } from "react";
import { initAuthListener } from "@/lib/authStore";

export default function AuthListener() {
  useEffect(() => {
    initAuthListener();
  }, []);
  return null;
}
