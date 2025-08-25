"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Github, Linkedin, Mail, Globe, LucideIcon } from "lucide-react";

type LinkType = 'github' | 'linkedin' | 'email' | 'website';

interface Link {
  name: string;
  url: string;
}

interface ProfileHeaderProps {
  name: string;
  email: string;
  pictureUrl: string;
  domain: string;
  yearOfStudy: string;
  links: Link[];
  isCurrentUser?: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

const iconMap: Record<LinkType, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  email: Mail,
  website: Globe,
};

export function ProfileHeader({
  name,
  email,
  pictureUrl,
  domain,
  yearOfStudy,
  links,
  isCurrentUser,
}: ProfileHeaderProps) {
  console.log('ProfileHeader props:', { name, email, pictureUrl, domain, yearOfStudy, links, isCurrentUser }); // Debug log
  
 return (
  <div className="flex flex-col md:flex-row  w-full max-w-full">
    
    {/* Left Column */}
    <div className="flex flex-col items-center md:items-start gap-4 md:w-2/3">
      {/* Avatar */}
      <Avatar className="h-32 w-32 border-4 border-background">
        <AvatarImage src={pictureUrl} alt={name} className="object-cover w-full h-full rounded-full" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>

      {/* Name + Year */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-muted-foreground">
          {domain} • Year {yearOfStudy}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap justify-center md:justify-start gap-2">
        {links.map((link) => {
          const Icon = iconMap[link.name?.toLowerCase?.() as LinkType] || Globe;
          return (
            <Button
              key={link.name}
              variant="outline"
              size="sm"
              className="gap-2"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <Icon className="h-4 w-4" />
                {link.name?.charAt(0).toUpperCase() + link.name?.slice(1)}
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  </div>
);
}