"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Upload, User, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Lexend } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Logo from "../ui/logo";

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  weight: "300",
});


export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    setMenuOpen(false);
    router.push("/");
  };

  const containerVariants = {
    open: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
        ease: "easeInOut",
      },
    },
    closed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
        ease: "easeInOut",
      },
    },
  };

  const itemVariants = {
    open: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.25,
        ease: "easeInOut",
      },
    },
    closed: {
      y: 10,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: "easeInOut",
      },
    },
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;

      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header  className={cn(
        "sticky top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-4",
        lexend.className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        {/* Main navbar */}
        <div className="flex h-[58px] items-center justify-between rounded-[28px] bg-gray-800 pl-4 pr-3 shadow-lg md:h-[68px] md:px-6">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Point Blank home"
            className="min-w-0 shrink"
          >
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/directory"
              className={cn(
                "text-base font-medium transition-colors hover:text-white",
                pathname === "/directory"
                  ? "text-white"
                  : "text-white/80",
              )}
            >
              Directory
            </Link>

            {user ? (
              <>
                <Link href="/upload">
                  <Button className="gap-2 rounded-full bg-[#37FF00] px-6 text-black hover:bg-[#30e600]">
                    <Upload className="h-4 w-4" />
                    Upload Resume
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-white hover:bg-white/10 hover:text-white"
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">Open profile menu</span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/profile/${user.id}`)}
                    >
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                className="rounded-full bg-[#37FF00] px-7 text-black hover:bg-[#30e600]"
                onClick={() => router.push("/auth/email-link-sign-in")}
              >
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMenuOpen((current) => !current)}
            className="h-10 w-10 shrink-0 rounded-full bg-[#37FF00] text-black hover:bg-[#30e600] hover:text-black md:hidden"
          >
            {menuOpen ? (
              <X className="h-5 w-5" strokeWidth={2.25} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2.25} />
            )}
          </Button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              key="mobile-menu"
              ref={menuRef}
              initial={{ height: 0, opacity: 0, y: -8 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden md:hidden"
            >
              <motion.ul
                variants={containerVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="mt-2 flex flex-col gap-1 rounded-2xl bg-[#1B1B1B] p-4 shadow-xl"
              >
                <motion.li variants={itemVariants}>
                  <Link
                    href="/directory"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block w-full rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === "/directory"
                        ? "text-white"
                        : "text-white/80 hover:text-white",
                    )}
                  >
                    Directory
                  </Link>
                </motion.li>

                {user ? (
                  <>
                    <motion.li variants={itemVariants}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push(`/profile/${user.id}`);
                        }}
                      >
                        My Profile
                      </Button>
                    </motion.li>

                    <motion.li variants={itemVariants}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </Button>
                    </motion.li>

                    <motion.li variants={itemVariants}>
                      <Link
                        href="/upload"
                        onClick={() => setMenuOpen(false)}
                        className="block"
                      >
                        <Button className="w-full justify-start rounded-full bg-[#37FF00] px-4 text-black hover:bg-[#30e600]">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Resume
                        </Button>
                      </Link>
                    </motion.li>
                  </>
                ) : (
                  <motion.li variants={itemVariants}>
                    <Button
                      className="w-full justify-start rounded-full bg-[#37FF00] px-4 text-black hover:bg-[#30e600]"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/auth/email-link-sign-in");
                      }}
                    >
                      Sign In
                    </Button>
                  </motion.li>
                )}
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}