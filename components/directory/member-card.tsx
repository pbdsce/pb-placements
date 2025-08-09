"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  picture_url: string;
  domain: string;
  year_of_study: string;
  skills: string[];
}

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onSelect: (id: string, isSelected: boolean) => void;
  selectionMode: boolean;
  searchTerm?: string;
}

export function MemberCard({ member, isSelected, onSelect, selectionMode, searchTerm }: MemberCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Sort skills to bring matching ones to the top
  const sortedSkills = [...(member.skills || [])].sort((a, b) => {
    const aMatches = searchTerm && a.toLowerCase().includes(searchTerm.toLowerCase());
    const bMatches = searchTerm && b.toLowerCase().includes(searchTerm.toLowerCase());
    return (aMatches === bMatches) ? 0 : aMatches ? -1 : 1;
  });

  // Determine which skills to show 
  const matchingSkills = searchTerm 
    ? sortedSkills.filter(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  const displaySkills = searchTerm
    ? [...matchingSkills, ...sortedSkills.filter(skill => !matchingSkills.includes(skill))].slice(0, 6)
    : sortedSkills.slice(0, 4);
  const hasMoreSkills = member.skills?.length > displaySkills.length;

  const handleSelect = () => {
    onSelect(member.id, !isSelected);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300 h-full",
          isHovered && "shadow-lg border-green-400/20",
          isSelected && "ring-2 ring-green-500 border-green-500/20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          {selectionMode && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox 
                checked={isSelected}
                onCheckedChange={handleSelect}
                className="h-5 w-5 border-2 bg-background/80 backdrop-blur-sm"
              />
            </div>
          )}
          
          <Link href={`/profile/${slugify(member.name, member.id)}`} className="block">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {member.picture_url ? (
                <Image
                  src={member.picture_url}
                  alt={member.name}
                  fill
                  className="object-cover transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                  <span className="text-4xl font-bold text-muted-foreground/50">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </Link>
        </div>
        
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start">
            <div>
              <Link 
                href={`/profile/${slugify(member.name, member.id)}`}
                className="font-semibold text-lg hover:underline hover:text-green-500 transition-colors flex items-center"
              >
                {member.name}
                <ArrowUpRight className={cn(
                  "h-4 w-4 ml-1 transition-all duration-300",
                  isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
                )} />
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {member.domain && (
                  <Badge variant="secondary" className="rounded-full text-xs font-normal">
                    {member.domain}
                  </Badge>
                )}
                {member.year_of_study && (
                  <span className="text-xs text-muted-foreground">
                    {member.year_of_study}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {displaySkills.map((skill) => (
              <Badge 
                key={skill} 
                variant="outline" 
                className={cn(
                  "bg-background/80",
                  searchTerm && skill.toLowerCase().includes(searchTerm.toLowerCase()) && 
                    "bg-green-400 text-black border-green-500"
                )}
              >
                {skill}
              </Badge>
            ))}
            {hasMoreSkills && (
              <Badge variant="outline" className="bg-background/50 text-muted-foreground">
                +{member.skills.length - displaySkills.length} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}