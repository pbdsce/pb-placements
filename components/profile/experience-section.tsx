"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Experience {
  id: string;
  title: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface ExperienceSectionProps {
  experiences: Experience[];
  isEditable?: boolean;
}

export function ExperienceSection({ experiences, isEditable }: ExperienceSectionProps) {
  if (!experiences || experiences.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {[...experiences]
       .sort((a, b) =>
        (a.end_date ? 1 : 0) - (b.end_date ? 1 : 0) ||
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .map((experience) => {
        const startDate = new Date(experience.start_date);
        const endDate = experience.end_date ? new Date(experience.end_date) : null;
        
        const formattedStartDate = format(startDate, 'MMM yyyy');
        const formattedEndDate = endDate
          ? format(endDate, 'MMM yyyy')
          : 'Present';
        
        const dateRange = `${formattedStartDate} - ${formattedEndDate}`;
        
        return (
          <div key={experience.id} className="min-w-0 border-b border-gray-800 pb-4 last:border-0 last:pb-0">
            <h3 className="break-words text-base font-semibold text-white max-[270px]:text-sm">{experience.title}</h3>
            <p className="mt-1 break-words text-sm text-green-400 max-[270px]:text-xs">{experience.company}</p>
            <p className="mt-1 flex min-w-0 justify-between gap-2 text-xs text-gray-400 max-[270px]:flex-col max-[270px]:gap-1">
              <span className="break-words">{experience.role}</span>
              <span className="shrink-0">{dateRange}</span>
            </p>
            {experience.description && (
              <ul className="mt-2 list-inside list-disc space-y-1 break-words text-sm text-gray-300 max-[270px]:text-xs">
                {experience.description
                  .split(/[•·‣●◦⁃∙]\s*/g)  
                  .map((point: string, index: number) =>
                    point.trim() ? <li key={index}>{point.trim()}</li> : null
                  )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
