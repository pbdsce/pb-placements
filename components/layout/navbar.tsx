"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, Search, Upload, User, Menu } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/lib/authStore";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
import { useEffect, useState } from "react";
import Logo from "../ui/logo"; 

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    router.push("/");
  };
  
 
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

        <ThemeToggle />
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </div>

    {/* Mobile menu content */}
    {menuOpen && (
      <div className="md:hidden px-4 pb-4 space-y-3 flex flex-col">
        <Link 
          href="/directory" 
          className={cn(
            "text-sm font-medium",
            pathname === "/directory" ? "text-foreground" : "text-foreground/60"
          )}
        >
          Directory
        </Link>
        {user && (
          <Link 
            href="/upload"
            className={cn(
              "text-sm font-medium",
              pathname === "/upload" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Upload Resume
          </Link>
        )}
        <Link href="/directory">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Search className="h-4 w-4 mr-2" />
            Search Talent
          </Button>
        </Link>
        {user ? (
          <>
            <Link href="/upload">
              <Button className="w-full justify-start bg-green-500 hover:bg-green-600">
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start" onClick={() => router.push(`/profile/${user.id}`)}>
              My Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="w-full justify-start" onClick={() => router.push("/auth/email-link-sign-in")}>
              Sign In
            </Button>
          </>
        )}
        <ThemeToggle />
      </div>
    )}
  </header>
 );
}