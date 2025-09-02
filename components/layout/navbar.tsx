"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, User, Menu } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import Logo from "../ui/logo"; 

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
    router.push("/");
  };

  const containerVariants = {
    open: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
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
        duration: 0.4,
        ease: "easeInOut",
      },
    },
    closed: {
      y: 15,
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  };

  useEffect(() => {
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as Node;
    if (menuRef.current && menuRef.current.contains(target)) return;
    if (toggleRef.current && toggleRef.current.contains(target)) return;
    setMenuOpen(false);
  };

  document.addEventListener("pointerdown", handlePointerDown);
  return () => {
    document.removeEventListener("pointerdown", handlePointerDown);
  };
}, []);
 
 return (
  <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="flex h-16 items-center justify-between px-4 md:px-8">
      {/* Logo */}
      <div className="shrink-0 mr-4">
            <Logo />
          </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-start space-x-8 text-sm font-medium flex-1 px-4">
        <Link 
          href="/directory"
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname === "/directory" ? "text-foreground" : "text-foreground/60"
          )}
        >
          Directory
        </Link>
        </div>

      {/* Desktop right-side buttons */}
      <div className="hidden md:flex items-center space-x-4">
        <Link href="/directory"></Link>

        {user ? (
          <>
            <Link href="/upload">
              <Button className="gap-1 bg-green-500 hover:bg-green-600">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload Resume</span>
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
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
          <>
            <Button className="bg-green-500 hover:bg-green-600" onClick={() => router.push("/auth/email-link-sign-in")}>
              Sign In
            </Button>
          </>
        )}

       
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Button
          ref={toggleRef}
          variant="ghost"
          size="icon"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </div>

   {/* Mobile menu content */}
  <AnimatePresence>
    {menuOpen && (
      <motion.div
        id="mobile-menu"
        key="mobile-menu"
        ref={menuRef}
        initial="closed"
        animate="open"
        exit="closed"
        variants={containerVariants}
        className="md:hidden px-4 pb-4 flex flex-col pt-5"
      >
        <motion.ul
          variants={containerVariants}
          className="flex flex-col space-y-4"
        >
          <motion.li variants={itemVariants}>
            <Link href="/directory" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Directory
              </Button>
            </Link>
          </motion.li>

          {user ? (
            <>
              <motion.li variants={itemVariants}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
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
                  className="w-full justify-start"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign Out
                </Button>
              </motion.li>

              <motion.li variants={itemVariants}>
                <Link href="/upload" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full justify-start bg-green-500 hover:bg-green-600">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </Button>
                </Link>
              </motion.li>
            </>
          ) : (
            <motion.li variants={itemVariants}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  router.push("/auth/email-link-sign-in");
                  setMenuOpen(false);
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

  </header>
 );
}