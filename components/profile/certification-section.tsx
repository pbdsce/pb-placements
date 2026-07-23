"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Award } from "lucide-react";
import { format } from "date-fns";

interface Certification {
  id: string;
  name: string;
  issuing_organization?: string;
  description?: string;
  date?: string;
}

interface CertificationSectionProps {
  certifications: Certification[];
}

export function CertificationSection({ certifications }: CertificationSectionProps) {
  if (!certifications || certifications.length === 0) {
    return null;
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {certifications.map((certification) => (
            <div
              key={certification.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <h4 className="break-words font-semibold text-lg text-white">{certification.name}</h4>

              {certification.issuing_organization && (
                <p className="break-words text-green-400 text-sm">
                  {certification.issuing_organization}
                </p>
              )}

              {certification.date && (
                <p className="text-gray-400 text-xs">
                  {format(new Date(certification.date), "MMM yyyy")}
                </p>
              )}

              {certification.description && (
                <p className="break-words text-gray-300 text-sm">{certification.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}