"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Experience {
  id: string;
  title: string;
  company: string;
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Experience</h2>
      </div>
      
      <div className="space-y-6">
        {experiences.map((experience) => {
          const startDate = new Date(experience.start_date);
          const endDate = experience.end_date ? new Date(experience.end_date) : null;
          
          const formattedStartDate = format(startDate, 'MMM yyyy');
          const formattedEndDate = endDate
            ? format(endDate, 'MMM yyyy')
            : 'Present';
          
          const dateRange = `${formattedStartDate} - ${formattedEndDate}`;
          
          return (
            <div key={experience.id} className="border-b pb-6 last:border-0 last:pb-0">
              <h3 className="font-semibold text-lg">{experience.title}</h3>
              <p className="text-muted-foreground">{experience.company}</p>
              <p className="text-sm text-muted-foreground mb-2">{dateRange}</p>
              <p className="text-sm">{experience.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}