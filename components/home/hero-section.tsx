"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/directory?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  return (
    <section className="py-16 md:py-24 lg:py-32 flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 lg:px-20 relative">
      <div className="w-full max-w-3xl mx-auto text-center">
        <motion.div 
          className="flex flex-col items-center text-center space-y-6 md:space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-3 md:space-y-4"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight">
              Find <span className="text-[#37FF00]">Student Developers</span> for Your Next Project
            </h1>
            <p className="max-w-[32rem] md:max-w-[42rem] text-base sm:text-lg md:text-xl text-muted-foreground mx-auto px-4">
              Point Blank is a community of talented student developers. Search our directory to discover skilled developers for your team.
            </p>
          </motion.div>
          
          <motion.form
            className="w-full mx-auto px-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            onSubmit={handleSearch}
          >
            <div className="relative flex-1 bg-gradient-to-r from-green-400 via-green-500 to-green-600 p-[2px] rounded-full shadow-[0_0_8px_1px_rgba(34,197,94,0.25)]">
              <div className="flex items-center bg-black rounded-full pl-2 sm:pl-3 md:pl-4 h-10 sm:h-12 w-full">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#37FF00] mr-2 sm:mr-3 flex-shrink-0" />
                <input
                  type="search"
                  placeholder="Search by skill, domain, or name..."
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-zinc-400 text-sm sm:text-base min-w-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="ml-2 sm:ml-3 h-10 sm:h-12 px-2 sm:px-3 md:px-4 lg:px-6 rounded-full bg-[#37FF00] hover:bg-[#30e600] text-white font-semibold transition text-[10px] sm:text-xs md:text-sm lg:text-base flex-shrink-0 whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </div>
          </motion.form>
          
          <motion.div
            className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <p>Popular searches:</p>
            <button 
              onClick={() => router.push("/directory?domain=Frontend+Development")}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              Frontend
            </button>
            <button 
              onClick={() => router.push("/directory?domain=Backend+Development")}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              Backend
            </button>
            <button 
              onClick={() => router.push("/directory?skills=React")}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              React
            </button>
            <button 
              onClick={() => router.push("/directory?skills=Python")}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              Python
            </button>
            <button 
              onClick={() => router.push("/directory?skills=Machine+Learning")}
              className="underline-offset-4 hover:text-primary hover:underline"
            >
              Machine Learning
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}