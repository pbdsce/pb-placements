"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchFilters } from "@/components/directory/search-filters";
import { MemberCard } from "@/components/directory/member-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Share2, Mailbox, X, Ghost } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Helper function to convert year numbers to string format
const convertYearToString = (year: number): string => {
  if (year === 1) return '1st';
  if (year === 2) return '2nd';
  if (year === 3) return '3rd';
  if (year === 4) return '4th';
  return 'Alumni';
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
  
  // State for members data
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // State for available filter options
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>(['1st', '2nd', '3rd', '4th', 'Alumni']);
  
  // State for selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  
  // State for selected skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const [currentOrigin, setCurrentOrigin] = useState<string>("");
  
  // Set origin on client side
  useEffect(() => {
    setCurrentOrigin(getOrigin());
  }, []);
  
  // Fetch all skills and domains on mount
  useEffect(() => {
    async function fetchOptions() {
      // Fetch all skills
      const { data: skillsData, error: skillsError } = await supabase.from('skills').select('name');
      console.log('Fetched skillsData:', skillsData, 'Error:', skillsError); // DEBUG LOG
      if (skillsError) {
        setAllSkills([]);
      } else {
        setAllSkills(Array.isArray(skillsData) ? skillsData.map(s => s.name) : []);
      }
      // Fetch all domains
      const { data: domainData } = await supabase.from('members').select('domain');
      setDomains(Array.from(new Set((domainData ?? []).map(d => d.domain))).sort());
    }
    fetchOptions();
  }, []);
  
  // Fetch members based on search params
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build query string from search params
        const queryParams = new URLSearchParams();
        const search = searchParams.get('search');
        if (search) queryParams.append('search', search);
        searchParams.getAll('domain').forEach(domain => {
          queryParams.append('domain', domain);
        });
        searchParams.getAll('year').forEach(year => {
          queryParams.append('year', year);
        });
        searchParams.getAll('skills').forEach(skill => {
          queryParams.append('skills', skill);
        });
        const response = await fetch(`/api/directory/search?${queryParams.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch members');
        }
        // Convert year numbers to string format in the response
        const formattedMembers = data.results.map((member: any) => ({
          ...member,
          year_of_study: typeof member.year_of_study === 'number' 
            ? convertYearToString(member.year_of_study)
            : member.year_of_study
        }));
        setMembers(formattedMembers || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load members. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [searchParams]);
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedMembers([]);
    }
  };
  
  // Handle member selection
  const handleSelectMember = (id: string, isSelected: boolean) => {
    if (isSelected) {
      const memberToAdd = members.find(m => m.id === id);
      if (memberToAdd) {
        setSelectedMembers([...selectedMembers, memberToAdd]);
      }
    } else {
      setSelectedMembers(selectedMembers.filter(m => m.id !== id));
    }
  };
  
  // Clear all selections
  const clearSelections = () => {
    setSelectedMembers([]);
  };

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

  const gmailWindow = window.open('', '_blank');

  try {
    const memberDataPromises = selectedMembers.map(async (member) => {
      try {
        const res = await fetch('/api/export/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            profileLink: `${currentOrigin}/profile/${member.id}`,
          }),
        });

        const data = await res.json();

        return {
          name: member.name,
          email: member.email,
          profileLink: `${currentOrigin}/profile/${member.id}`,
          resumeUrl: res.ok && data?.resumeUrl ? data.resumeUrl : 'Resume not available',
        };
      } catch (error) {
        return {
          name: member.name,
          email: member.email,
          profileLink: `${currentOrigin}/profile/${member.id}`,
          resumeUrl: 'Resume not available',
        };
      }
    });

    const memberData = await Promise.all(memberDataPromises);

    const memberList = memberData.map((member, index) => 
      `${index + 1}. ${member.name} (${member.email})\n   - Profile: ${member.profileLink}\n   - Resume: ${member.resumeUrl}`
    ).join('\n\n');

    const subject = `Recommended Developers from Point Blank (${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''})`;

    const body = `Hi,

I hope this message finds you well.

I'm writing to recommend the following talented developers from our tech community Point Blank:

${memberList}

Please feel free to reach out if you'd like more details or want to connect with any of them directly.

Best regards,
[Your Name]`;

    const gmailDraftURL = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (gmailWindow) {
      gmailWindow.location.href = gmailDraftURL;
    }

    toast({
      title: "Email draft created",
      description: `Gmail draft prepared with ${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''}`,
    });

  } catch (error) {
    console.error('Export to email failed:', error);
    toast({
      title: "Export failed",
      description: "Could not create email draft. Please try again.",
      variant: "destructive",
    });

    if (gmailWindow) {
      gmailWindow.close();
    }
  } finally {
    setIsExporting(false);
  }
};



  const handleShareProfiles = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member to share",
        variant: "destructive",
      });
      return;
    }

    const profileSummary = selectedMembers.map((member, index) => 
      `${index + 1}. ${member.name} - ${member.domain} (${member.year_of_study})\n   Profile: ${currentOrigin}/profile/${member.id}`
    ).join('\n\n');
    
    const shareText = `Check out these ${selectedMembers.length} talented developer${selectedMembers.length > 1 ? 's' : ''} from Point Blank:\n\n${profileSummary}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${selectedMembers.length} Developer Profile${selectedMembers.length > 1 ? 's' : ''} from Point Blank`,
        text: shareText,
        url: currentOrigin,
      })
      .then(() => {
        toast({
          title: "Shared successfully",
          description: `${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''} shared successfully`,
        });
      })
      .catch(() => {
      });
    } else {
      navigator.clipboard.writeText(shareText);
      
      toast({
        title: "Profiles copied",
        description: `${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''} copied to clipboard`,
      });
    }
  };
  
  // Filter members by selected skills (if any)
  const filteredMembers = selectedSkills.length === 0
    ? members
    : members.filter(member =>
        selectedSkills.every(skill => member.skills.includes(skill))
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