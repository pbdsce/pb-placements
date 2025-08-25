"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchFilters } from "@/components/directory/search-filters";
import { MemberCard } from "@/components/directory/member-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Share2, Mailbox, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import LoadingBrackets from '@/components/ui/loading-brackets';

interface Member {
  id: string;
  name: string;
  email: string;
  picture_url: string;
  domain: string;
  year_of_study: string;
  skills: string[];
}

const convertYearToString = (year: number): string => {
  if (year === 1) return "1st";
  if (year === 2) return "2nd";
  if (year === 3) return "3rd";
  if (year === 4) return "4th";
  return "Alumni";
};

const getOrigin = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "https://career.pointblank.club";
};

function DirectoryContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [years] = useState<string[]>(["1st", "2nd", "3rd", "4th", "Alumni"]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  useEffect(() => {
    setCurrentOrigin(getOrigin());
  }, []);

  useEffect(() => {
    async function fetchOptions() {
      const res = await fetch("/api/directory/options");
      const data = await res.json();
      setAllSkills(data.skills || []);
      setDomains(data.domains || []);
    }
    fetchOptions();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams(searchParams.toString());
        const res = await fetch(`/api/directory/search?${queryParams.toString()}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Failed to fetch members");

        const formatted = data.results.map((m: any) => ({
          ...m,
          year_of_study:
            typeof m.year_of_study === "number"
              ? convertYearToString(m.year_of_study)
              : m.year_of_study,
        }));
        setMembers(formatted);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [searchParams]);


  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) setSelectedMembers([]);
  };

  const handleSelectMember = (id: string, isSelected: boolean) => {
    if (isSelected) {
      const memberToAdd = members.find((m) => m.id === id);
      if (memberToAdd) setSelectedMembers([...selectedMembers, memberToAdd]);
    } else {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== id));
    }
  };

  const clearSelections = () => setSelectedMembers([]);

  const handleExportToEmail = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select members to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    const gmailWindow = window.open("", "_blank");

    try {
      const res = await fetch("/api/directory/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: selectedMembers,
          origin: currentOrigin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (gmailWindow) gmailWindow.location.href = data.gmailDraftURL;

      toast({
        title: "Email draft created",
        description: `Gmail draft prepared with ${selectedMembers.length} profile(s)`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Export failed",
        description: err.message || "Could not create email draft.",
        variant: "destructive",
      });
      if (gmailWindow) gmailWindow.close();
    } finally {
      setIsExporting(false);
    }
  };

  // Share profiles
  const handleShareProfiles = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member to share",
        variant: "destructive",
      });
      return;
    }

    const profileSummary = selectedMembers
      .map(
        (m, i) =>
          `${i + 1}. ${m.name} - ${m.domain} (${m.year_of_study})\n   Profile: ${currentOrigin}/profile/${m.id}`
      )
      .join("\n\n");

    const shareText = `Check out these ${selectedMembers.length} talented developer(s):\n\n${profileSummary}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${selectedMembers.length} Developer Profiles`,
          text: shareText,
          url: currentOrigin,
        })
        .then(() => {
          toast({
            title: "Shared successfully",
            description: "Profiles shared successfully",
          });
        });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Profiles copied",
        description: "Profiles copied to clipboard",
      });
    }
  };

  // Filter by skills
  const filteredMembers =
    selectedSkills.length === 0
      ? members
      : members.filter((m) =>
          selectedSkills.every((s) => m.skills.includes(s))
        );

return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developer Directory</h1>
          <p className="text-muted-foreground">
            Search and filter through our community of talented developers.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="selection-mode" 
              checked={selectionMode}
              onCheckedChange={toggleSelectionMode}
            />
            <Label htmlFor="selection-mode">Selection Mode</Label>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <SearchFilters allSkills={allSkills} domains={domains} years={years} />
      </div>
      
      {/* Export Actions for Selected Members */}
      {selectionMode && selectedMembers.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[95%] sm:w-auto sm:min-w-[400px] bg-card border border-border shadow-lg rounded-2xl p-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelections}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const emails = selectedMembers.map(m => m.email).join(', ');
                  navigator.clipboard.writeText(emails);
                  toast({
                    title: "Copied to clipboard",
                    description: `${selectedMembers.length} email${selectedMembers.length > 1 ? 's' : ''} copied`,
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Copy Emails
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-green-500 hover:bg-green-600"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export Selected'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportToEmail} disabled={isExporting}>
                    <Mailbox className="h-4 w-4 mr-2"/>
                    Export to Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleShareProfiles}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profiles
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingBrackets />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <h3 className="text-lg font-medium">No members found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isSelected={selectedMembers.some(m => m.id === member.id)}
              onSelect={handleSelectMember}
              selectionMode={selectionMode}
              searchTerm={searchParams.get('search') || ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DirectoryLoading() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developer Directory</h1>
          <p className="text-muted-foreground">
            Search and filter through our community of talented developers.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="selection-mode" disabled />
            <Label htmlFor="selection-mode">Selection Mode</Label>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <div className="h-16 bg-muted rounded animate-pulse"></div>
      </div>
      
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-center">
          <div className="h-6 w-32 bg-muted rounded mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading directory...</p>
        </div>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={<DirectoryLoading />}>
      <DirectoryContent />
    </Suspense>
  );
}