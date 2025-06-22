"use client";

import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkillSectionProps {
  skills: string[];
  isEditable?: boolean;
}

export function SkillSection({ skills, isEditable = false }: SkillSectionProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Skills</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Badge
            key={skill}
            variant="secondary"
            className="px-3 py-1 text-sm font-normal"
          >
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}