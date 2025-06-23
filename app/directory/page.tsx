"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SearchFilters } from "@/components/directory/search-filters";
import { MemberCard } from "@/components/directory/member-card";
import { ExportActions } from "@/components/directory/export-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from '@supabase/supabase-js';

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
  return 'Alumni';
};

function DirectoryContent() {
  const searchParams = useSearchParams();
  
  // State for members data
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for available filter options
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>(['1st', '2nd', '3rd', 'Alumni']);
  
  // State for selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  
  // State for selected skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
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
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-center">
            <div className="h-6 w-32 bg-muted rounded mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading members...</p>
          </div>
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
            />
          ))}
        </div>
      )}
      
      <ExportActions
        selectedMembers={selectedMembers}
        clearSelections={clearSelections}
      />
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