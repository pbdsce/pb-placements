"use client";

import Image from 'next/image'
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator";
import { Plus, Trash, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ParsedData {
  id: string;
  name: string;
  email: string;
  skills: string[];
  domain?: string;
  year?: number;
  achievements: string[];
  experiences: {
    company: string;
    role: string;
    description: string;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
  }[];
  github_url?: string;
  linkedin_url?: string;
  file_path?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingMemberId, setExistingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    domain: "",
    year_of_study: "",
    github_url: "",
    linkedin_url: "",
    experiences: [] as ParsedData['experiences'],
    achievements: [] as string[],
    skills: [] as string[],
    resume_url: "",
  });

  const populateFormAndParsedData = (data: any, memberId: string) => {
    const experiences = data.experiences?.map((exp: any) => ({
      company: exp.company || '',
      role: exp.role || '',
      description: exp.description || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || null,
      is_current: exp.is_current || false,
    })) || [];

    const achievements = data.achievements?.map((a: any) => a.description || a) || [];
    const skills = data.skills?.map((s: any) => s.name || s) || [];
    const githubLink = data.links?.find((l: any) => l.name === 'GitHub')?.url || data.github_url || '';
    const linkedinLink = data.links?.find((l: any) => l.name === 'LinkedIn')?.url || data.linkedin_url || '';

    setParsedData({
      id: memberId,
      name: data.name || '',
      email: data.email || '',
      skills: skills,
      domain: data.domain || '',
      year: data.year_of_study || data.year || undefined,
      achievements: achievements,
      experiences: experiences,
      github_url: githubLink,
      linkedin_url: linkedinLink,
      file_path: data.resume_url || data.file_path || '',
    });

    setFormData({
      name: data.name || '',
      email: data.email || '',
      domain: data.domain || '',
      year_of_study: (data.year_of_study || data.year)?.toString() || '',
      github_url: githubLink,
      linkedin_url: linkedinLink,
      experiences: experiences,
      achievements: achievements,
      skills: skills,
      resume_url: data.resume_url || data.file_path || '',
    });
  };

  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    const memberId = searchParams.get('memberId');
    
    setIsEditMode(editMode);
    setExistingMemberId(memberId);

    if (editMode && memberId) {
      // Load existing profile data for editing
      loadExistingProfile(memberId);
    } else {
      // Read parsed data from localStorage for new profile creation
      const parsed = localStorage.getItem('parsed_resume');
      if (parsed) {
        const data = JSON.parse(parsed);
        populateFormAndParsedData(data, data.id || '');
        setLoading(false);
      } else {
        router.push('/upload');
      }
    }
  }, [router, searchParams]);

  const loadExistingProfile = async (memberId: string) => {
    try {
      // Fetch all data in parallel
      const [
        memberRes,
        skillsRes,
        experiencesRes,
        achievementsRes,
        linksRes,
      ] = await Promise.all([
        fetch(`/api/member/profile/${memberId}`),
        fetch(`/api/member/skills/${memberId}`),
        fetch(`/api/member/experience/${memberId}`),
        fetch(`/api/member/achievements/${memberId}`),
        fetch(`/api/member/links/${memberId}`),
      ]);

      if (!memberRes.ok) throw new Error('Failed to load member data');

      const memberData = await memberRes.json();
      const skillsData = await skillsRes.ok ? await skillsRes.json() : [];
      const experiencesData = await experiencesRes.ok ? await experiencesRes.json() : [];
      const achievementsData = await achievementsRes.ok ? await achievementsRes.json() : [];
      const linksData = await linksRes.ok ? await linksRes.json() : [];

      const combinedData = {
        ...memberData,
        skills: skillsData,
        experiences: experiencesData,
        achievements: achievementsData,
        links: linksData,
      };

      populateFormAndParsedData(combinedData, memberId);

      // Set existing profile picture if available
      if (memberData.picture_url) {
        setPicturePreview(memberData.picture_url);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading existing profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load existing profile data. Please try again.',
        variant: 'destructive',
      });
      router.push('/upload');
    }
  };

  const handleExperienceChange = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const handleAchievementChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.map((achievement, i) => 
        i === index ? value : achievement
      )
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          company: '',
          role: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: null,
          is_current: false
        }
      ]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const addAchievement = () => {
    setFormData(prev => ({
      ...prev,
      achievements: [...prev.achievements, '']
    }));
  };

  const removeAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, '']
    }));
  };

  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleSkillChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => 
        i === index ? value : skill
      )
    }));
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "Profile picture must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const memberId = isEditMode ? existingMemberId : localStorage.getItem('user_id');
      if (!memberId) throw new Error('User ID not found');

      let pictureUrl = picturePreview || '';
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop();
        const fileName = `${memberId}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, profilePicture);

        if (uploadError) throw new Error('Failed to upload profile picture');

        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);
        
        pictureUrl = publicUrl;
      }

      const payload = {
        member: {
          id: memberId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          domain: formData.domain.trim(),
          year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
          picture_url: pictureUrl,
          resume_url: formData.resume_url,
        },
        links: [
          { name: 'GitHub', url: formData.github_url },
          { name: 'LinkedIn', url: formData.linkedin_url }
        ].filter(l => l.url),
        skills: formData.skills.filter(s => s && s.trim()),
        experiences: formData.experiences,
        achievements: formData.achievements.filter(a => a && a.trim())
      };

      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      toast({
        title: isEditMode ? 'Profile updated successfully' : 'Profile created successfully',
        description: isEditMode 
          ? 'Your profile has been updated.'
          : 'Your profile has been created.',
      });
      router.push(`/profile/${memberId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} profile. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Confirm Your Profile</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Review and confirm the information we extracted from your resume.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Please review and update your information before creating your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              
              {/* Profile Picture Upload */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="profile-picture">Profile Picture</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                      {picturePreview ? (
                        <Image
                          src={picturePreview}
                          alt="Profile preview"
                          fill
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="profile-picture"
                        type="file"
                        accept="image/*"
                        onChange={handlePictureChange}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload a profile picture (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, domain: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year of Study</Label>
                  <Select
                    value={formData.year_of_study}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, year_of_study: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year of study" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, github_url: e.target.value }))
                    }
                    placeholder="https://github.com/username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Skills Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Skills</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSkill}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Skill
                </Button>
              </div>
              <div className="space-y-2">
                {formData.skills.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={skill}
                      onChange={(e) => handleSkillChange(index, e.target.value)}
                      placeholder="Enter your skill"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSkill(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Experiences Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Work Experience</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExperience}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Experience
                </Button>
              </div>
              <div className="space-y-4">
                {formData.experiences.map((exp, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Company</Label>
                            <Input
                              value={exp.company}
                              onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                              placeholder="Company name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Input
                              value={exp.role}
                              onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                              placeholder="Job title"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={exp.description}
                            onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                            placeholder="Describe your responsibilities and achievements"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={exp.start_date}
                              onChange={(e) => handleExperienceChange(index, 'start_date', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={exp.end_date || ''}
                                onChange={(e) => handleExperienceChange(index, 'end_date', e.target.value)}
                                disabled={exp.is_current}
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`current-${index}`}
                                  checked={exp.is_current}
                                  onCheckedChange={(checked) => 
                                    handleExperienceChange(index, 'is_current', checked as boolean)
                                  }
                                />
                                <Label htmlFor={`current-${index}`}>Current</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExperience(index)}
                        className="ml-2"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Achievements Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Achievements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAchievement}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Achievement
                </Button>
              </div>
              <div className="space-y-2">
                {formData.achievements.map((achievement, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={achievement}
                      onChange={(e) => handleAchievementChange(index, e.target.value)}
                      placeholder="Enter your achievement"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAchievement(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/upload")}
            >
              Back
            </Button>
            <Button type="submit" disabled={saving}>
              {saving 
                ? (isEditMode ? "Updating Profile..." : "Creating Profile...") 
                : (isEditMode ? "Update Profile" : "Create Profile")
              }
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}