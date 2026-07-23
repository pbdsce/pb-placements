"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface SearchFiltersProps {
  allSkills: string[];
  domains: string[];
  years: string[];
}

export function SearchFilters({ allSkills, domains, years }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial filter values from URL
  const initialSearchTerm = searchParams.get("search") || "";
  const initialSkills = searchParams.getAll("skills") || [];
  const initialDomains = searchParams.getAll("domain") || [];
  const initialYears = searchParams.getAll("year") || [];
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialSkills);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(initialDomains);
  const [selectedYears, setSelectedYears] = useState<string[]>(initialYears);
  // State for skills search
  const [skillsSearch, setSkillsSearch] = useState("");
  const [skillsOpen, setSkillsOpen] = useState(false);
  // State for domain search
  const [domainSearch, setDomainSearch] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  // State for year search
  const [yearSearch, setYearSearch] = useState("");
  const [yearOpen, setYearOpen] = useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);
  
  // Filtered skills for dropdown
  const filteredSkills = allSkills.filter(skill =>
    skill.toLowerCase().includes(skillsSearch.toLowerCase())
  );
  
  // Filtered domains for dropdown
  const filteredDomains = domains.filter(domain =>
    domain.toLowerCase().includes(domainSearch.toLowerCase())
  );
  
  // Filtered years for dropdown
  const filteredYears = years.filter(year =>
    year.toLowerCase().includes(yearSearch.toLowerCase())
  );
  
  // Apply filters
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    
    selectedSkills.forEach(skill => {
      params.append("skills", skill);
    });
    
    selectedDomains.forEach(domain => {
      params.append("domain", domain);
    });
    
    selectedYears.forEach(year => {
      params.append("year", year);
    });
    
    router.push(`/directory?${params.toString()}`);
  }, [searchTerm, selectedSkills, selectedDomains, selectedYears, router]);
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setSelectedDomains([]);
    setSelectedYears([]);
    router.push("/directory");
  };
  
  // Remove individual filter
  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };
  
  const removeDomain = (domain: string) => {
    setSelectedDomains(selectedDomains.filter(d => d !== domain));
  };
  
  const removeYear = (year: string) => {
    setSelectedYears(selectedYears.filter(y => y !== year));
  };
  
  // Apply filters when user presses enter in search box
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 380px)");
    const updatePlaceholder = () => setIsVerySmallScreen(mediaQuery.matches);

    updatePlaceholder();
    mediaQuery.addEventListener("change", updatePlaceholder);

    return () => mediaQuery.removeEventListener("change", updatePlaceholder);
  }, []);
  
  // Apply filters when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, applyFilters]);
  
  // Apply filters whenever any filter changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);
  
  const hasActiveFilters = searchTerm || selectedSkills.length > 0 || selectedDomains.length > 0 || selectedYears.length > 0;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 md:flex-1">
          <Input
            placeholder={isVerySmallScreen ? "Search" : "Search by name or skill..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => {
                setSearchTerm("");
                applyFilters();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 md:flex md:flex-wrap md:items-center md:justify-end">
          {/* Skills Popover with Search Bar and Dropdown */}
          <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={skillsOpen}
                className="w-full justify-between md:w-auto md:min-w-[120px]"
              >
                Skills
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2">
              <div>
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillsSearch}
                  onChange={e => setSkillsSearch(e.target.value)}
                  className="mb-2 px-2 py-1 border rounded w-full"
                />
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {filteredSkills.map(skill => (
                    <button
                      key={skill}
                      className={`text-left px-2 py-1 rounded hover:bg-muted w-full ${selectedSkills[0] === skill ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => {
                        setSelectedSkills([skill]);
                        setSkillsOpen(false);
                      }}
                    >
                      {skill}
                    </button>
                  ))}
                  {filteredSkills.length === 0 && (
                    <div className="text-muted-foreground px-2 py-1">No skill found.</div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Domain Popover with Search Bar and List */}
          <Popover open={domainOpen} onOpenChange={setDomainOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={domainOpen}
                className="w-full justify-between md:w-auto md:min-w-[120px]"
              >
                Domain
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2">
              <div>
                <input
                  type="text"
                  placeholder="Search domains..."
                  value={domainSearch}
                  onChange={e => setDomainSearch(e.target.value)}
                  className="mb-2 px-2 py-1 border rounded w-full"
                />
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {filteredDomains.map(domain => (
                    <button
                      key={domain}
                      className={`text-left px-2 py-1 rounded hover:bg-muted w-full ${selectedDomains[0] === domain ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => {
                        setSelectedDomains([domain]);
                        setDomainOpen(false);
                      }}
                    >
                      {domain}
                    </button>
                  ))}
                  {filteredDomains.length === 0 && (
                    <div className="text-muted-foreground px-2 py-1">No domain found.</div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Year Popover with Search Bar and List */}
          <Popover open={yearOpen} onOpenChange={setYearOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={yearOpen}
                className="w-full justify-between md:w-auto md:min-w-[120px]"
              >
                Year
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2">
              <div>
                <input
                  type="text"
                  placeholder="Search year..."
                  value={yearSearch}
                  onChange={e => setYearSearch(e.target.value)}
                  className="mb-2 px-2 py-1 border rounded w-full"
                />
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {filteredYears.slice(0, 10).map(year => (
                    <button
                      key={year}
                      className={`text-left px-2 py-1 rounded hover:bg-muted w-full ${selectedYears[0] === year ? 'bg-primary text-primary-foreground' : ''}`}
                      onClick={() => {
                        setSelectedYears([year]);
                        setYearOpen(false);
                      }}
                    >
                      {year}
                    </button>
                  ))}
                  {filteredYears.length === 0 && (
                    <div className="text-muted-foreground px-2 py-1">No year found.</div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground flex items-center">
            <Filter className="h-3 w-3 mr-1" /> Active filters:
          </span>
          {selectedSkills.map(skill => (
            <Badge key={`skill-${skill}`} variant="secondary" className="flex items-center gap-1">
              {skill}
              <button onClick={() => removeSkill(skill)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedDomains.map(domain => (
            <Badge key={`domain-${domain}`} variant="secondary" className="flex items-center gap-1">
              {domain}
              <button onClick={() => removeDomain(domain)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedYears.map(year => (
            <Badge key={`year-${year}`} variant="secondary" className="flex items-center gap-1">
              {year}
              <button onClick={() => removeYear(year)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
