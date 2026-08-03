"use client";

import Image from 'next/image'
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabaseClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Upload,
  X,
  PlusCircle,
  Loader2,
  Trash,
  Plus
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import LoadingBrackets from '@/components/ui/loading-brackets';
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
  certifications: {
    id?: string;
    name: string;
    issuing_organization?: string;
  }[];
  projects: {
    id?: string;
    name: string;
    description: string;
    link?: string;
  }[];
  github_url?: string;
  linkedin_url?: string;
  file_path?: string;
}

const validationFieldLabels: Record<string, string> = {
  name: 'your name',
  email: 'your email address',
  domain: 'your domain',
  year_of_study: 'your year of study',
  picture_url: 'your profile picture URL',
  resume_url: 'your resume URL',
  company: 'the company name',
  role: 'the role',
  description: 'the description',
  start_date: 'a start date',
  end_date: 'an end date',
  is_current: 'whether this experience is current',
  url: 'the URL',
  skills: 'your skills',
  achievements: 'your achievements',
  issuing_organization: 'the issuing organization',
  link: 'the project URL',
  member: 'your profile details',
  experiences: 'your experiences',
  certifications: 'your certifications',
  projects: 'your projects',
  links: 'your links',
};

function formatValidationIssue(issue: { path?: string; message?: string }): string | undefined {
  const path = issue.path || '';
  const field = path.split('.').pop() || '';
  const index = path.match(/\.(\d+)\.(?:[^.]+)$/)?.[1];
  const label = validationFieldLabels[field] || field.replace(/_/g, ' ') || 'this field';
  const context = index ? `${label} for item ${Number(index) + 1}` : label;
  const message = issue.message || 'This field is invalid.';

  if (path === 'member.year_of_study') {
    return 'Please select your year of study.';
  }

  if (field === 'start_date') {
    return index
      ? `Please provide a start date for experience ${Number(index) + 1}.`
      : 'Please provide a start date.';
  }

  if (
    /^Expected .+ received .+$/.test(message) ||
    message === 'Required' ||
    /required|cannot be empty/i.test(message)
  ) {
    return `Please provide ${context}.`;
  }

  if (/valid URL/i.test(message)) {
    return `Please enter a valid URL for ${context}.`;
  }

  return message;
}

function ConfirmPageContent() {
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
  const [newSkill, setNewSkill] = useState("");
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
    certifications: [] as ParsedData['certifications'],
    projects: [] as ParsedData['projects'],
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

     const certifications = (data.certifications || []).map((cert: any) => {
      const obj: any = {
        name: cert.name || '',
      };
      if (cert.issuing_organization && cert.issuing_organization.trim() !== '') {
        obj.issuing_organization = cert.issuing_organization;
      }
      if (cert.id && typeof cert.id === 'string' && cert.id.trim() !== '') {
        obj.id = cert.id;
      }
      return obj;
    });

    const projects = (data.projects || []).map((proj: any) => ({
      id: proj.id || '',
      name: proj.name || '',
      description: proj.description || '',
      link: proj.link || ''
    }));

    setParsedData({
      id: memberId,
      name: data.name || '',
      email: data.email || '',
      skills: skills,
      domain: data.domain || '',
      year: data.year_of_study || data.year || undefined,
      achievements: achievements,
      experiences: experiences,
      certifications: certifications,
      projects: projects,
      github_url: githubLink,
      linkedin_url: linkedinLink,
      file_path: data.resume_url || data.file_path || '',
    });

    setFormData({
      name: data.name || '',
      email: data.email || '',
      domain: data.domain || '',
      year_of_study: data.year_of_study === null
        ? 'alumni'
        : (data.year_of_study || data.year)?.toString() || '',
      github_url: githubLink,
      linkedin_url: linkedinLink,
      experiences: experiences,
      achievements: achievements,
      skills: skills,
      certifications: certifications,
      projects: projects,
      resume_url: data.resume_url || data.file_path || '',
    });
  };

  useEffect(() => {
    const init = async () => {
      const file = searchParams.get('file');
      const editMode = searchParams.get('edit') === 'true';

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to edit your profile.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      const memberId = session.user.id;
      setIsEditMode(editMode);
      setExistingMemberId(memberId);

      // Case 1: Edit mode, no file param -> Skip resume parsing entirely.
      if (editMode && !file) {
        try {
          await loadExistingProfile(memberId);
        } catch (err: any) {
          console.error('Error loading profile in edit mode:', err);
        }
        return;
      }

      // Case 2: File param present -> Check cache or parse.
      if (file) {
        try {
          let parsedData: any = null;

          // Check sessionStorage for cached parsed data
          if (typeof window !== 'undefined') {
            const cached = sessionStorage.getItem(`parsed-resume-${file}`);
            if (cached) {
              try {
                parsedData = JSON.parse(cached);
              } catch (e) {
                console.error('Failed to parse cached resume data:', e);
              }
            }
          }

          if (!parsedData) {
            // Cache miss: fall back to reparse via /api/resume/upload
            const reparseRes = await fetch('/api/resume/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ filePath: file }),
            });

            if (!reparseRes.ok) {
              const err = await reparseRes.json().catch(() => ({}));
              throw new Error(err.message || 'Failed to parse resume');
            }

            parsedData = await reparseRes.json();
          }

          if (editMode) {
            const existingProfile = await loadExistingProfile(memberId, true);
            const mergedData = {
              ...existingProfile,
              ...parsedData,
              picture_url: existingProfile?.picture_url || parsedData.picture_url,
              resume_url: parsedData.resume_url || existingProfile?.resume_url,
            };
            populateFormAndParsedData(mergedData, memberId);
            if (existingProfile?.picture_url) setPicturePreview(existingProfile.picture_url);
          } else {
            populateFormAndParsedData(parsedData, parsedData.id || '');
          }

          setLoading(false);
        } catch (err: any) {
          console.error('Resume loading error:', err);
          toast({
            title: 'Error',
            description: err.message || 'Could not load resume data. Please re-upload your resume.',
            variant: 'destructive',
          });
          setTimeout(() => router.push('/upload'), 3000);
        }
        return;
      }

      // Case 3: Neither edit mode nor file param -> Error + redirect to /upload.
      toast({
        title: 'Error',
        description: 'No resume file specified. Please upload your resume again.',
        variant: 'destructive',
      });
      setTimeout(() => router.push('/upload'), 2000);
    };

    init();
  }, [router, searchParams]);

  const loadExistingProfile = async (memberId: string, skipPopulate = false) => {
    try {
      const [
        memberRes,
        skillsRes,
        experiencesRes,
        achievementsRes,
        linksRes,
        certificationsRes,
        projectsRes,
      ] = await Promise.all([
        fetch(`/api/member/profile/${memberId}`),
        fetch(`/api/member/skills/${memberId}`),
        fetch(`/api/member/experience/${memberId}`),
        fetch(`/api/member/achievements/${memberId}`),
        fetch(`/api/member/links/${memberId}`),
        fetch(`/api/member/certifications/${memberId}`),
        fetch(`/api/member/projects/${memberId}`),
      ]);

      if (!memberRes.ok) throw new Error('Failed to load member data');

      const memberData = await memberRes.json();
      const skillsData = skillsRes.ok ? await skillsRes.json() : [];
      const experiencesData = experiencesRes.ok ? await experiencesRes.json() : [];
      const achievementsData = achievementsRes.ok ? await achievementsRes.json() : [];
      const linksData = linksRes.ok ? await linksRes.json() : [];
      const certificationsData = certificationsRes.ok ? await certificationsRes.json() : [];
      const projectsData = projectsRes.ok ? await projectsRes.json() : [];

      const combinedData = {
        ...memberData,
        skills: skillsData,
        experiences: experiencesData,
        achievements: achievementsData,
        links: linksData,
        certifications: certificationsData,
        projects: projectsData,
      };

      if (!skipPopulate) {
        populateFormAndParsedData(combinedData, memberId);
        if (memberData.picture_url) {
          setPicturePreview(memberData.picture_url);
        }
        setLoading(false);
      }

      return combinedData;
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
        {
          company: '',
          role: '',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: null,
          is_current: false
        },
        ...prev.experiences
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
      achievements: ['', ...prev.achievements]
    }));
  };

  const removeAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [newSkill.trim(), ...prev.skills]
      }));
      setNewSkill("");
    }
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

const handleCertificationChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => 
        i === index ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [{
        name: '',
        issuing_organization: ''
      }, ...prev.certifications]
    }));
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
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
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!session || !session.user) throw new Error("Not authenticated");

    const token = session.access_token;
    let pictureUrl = picturePreview || '';
    if (profilePicture) {
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, profilePicture);

      if (uploadError) throw new Error('Failed to upload profile picture');

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      pictureUrl = publicUrl;
    }

 const cleanedCertifications = formData.certifications
        .filter(cert => cert.name.trim())
        .map(cert => {
          const { id, name, issuing_organization } = cert;
          const result: any = { name };
          if (issuing_organization && issuing_organization.trim() !== '') {
            result.issuing_organization = issuing_organization;
          }
          if (id && typeof id === 'string' && id.trim() !== '') {
            result.id = id;
          }
          return result;
        });

    const cleanedProjects = formData.projects
      .filter(proj => proj.name && proj.name.trim())
      .map(proj => {
        const { id, name, description, link } = proj;
        const result: any = { name, description, link };
        if (id && typeof id === 'string' && id.trim() !== '') {
          result.id = id;
        }
        return result;
      });

    const payload = {
      member: {
        id: session.user.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        domain: formData.domain.trim(),
        year_of_study: formData.year_of_study
          ? formData.year_of_study === 'alumni'
            ? 5
            : parseInt(formData.year_of_study)
          : null,
        picture_url: pictureUrl,
        resume_url: formData.resume_url,
      },
      links: [
        { name: 'GitHub', url: formData.github_url },
        { name: 'LinkedIn', url: formData.linkedin_url }
      ].filter(l => l.url),
      skills: formData.skills.filter(s => s && s.trim()),
      experiences: formData.experiences,
      achievements: formData.achievements.filter(a => a && a.trim()),
      certifications: cleanedCertifications,
      projects: cleanedProjects,
    };

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,   
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      const validationMessages = Array.isArray(errorData.issues)
        ? errorData.issues
            .map(formatValidationIssue)
            .filter(Boolean)
            .filter(
              (message: string, index: number, messages: string[]) =>
                messages.indexOf(message) === index,
            )
            .join('; ')
        : '';

      throw new Error(
        validationMessages
          ? `Please review your profile details: ${validationMessages}`
          : errorData.error || 'Failed to save profile',
      );
    }

    toast({
      title: isEditMode ? 'Profile updated successfully' : 'Profile created successfully',
      description: isEditMode
        ? 'Your profile has been updated.'
        : 'Your profile has been created.',
    });

    router.push(`/profile/${session.user.id}`);
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

  return (
    <div className="min-h-screen px-6 py-10 text-white bg-[#010303] flex justify-center items-start">
      <motion.div 
        className="w-full max-w-3xl rounded-2xl p-8 shadow-xl border border-white/10 bg-white/10 backdrop-blur-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-4xl font-bold mb-6 text-center">Confirm Your Profile</h1>

        <form onSubmit={handleSubmit}>
          {/* Picture Upload */}
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 relative bg-white/10">
              {picturePreview
                ? <Image src={picturePreview} alt="Profile" fill className="object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white/50">
                    <Upload className="w-6 h-6" />
                  </div>
              }
            </div>
            <div className="flex-1">
              <Label>Upload Picture</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handlePictureChange}
                className="bg-white/10 text-white border border-white/20" 
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/10 text-white border border-white/20"
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/10 text-white border border-white/20"
                required
              />
            </div>
            <div>
              <Label>Domain</Label>
              <Input 
                value={formData.domain} 
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="bg-white/10 text-white border border-white/20"
              />
            </div>
            <div>
              <Label>Year</Label>
              <Select value={formData.year_of_study} onValueChange={(value) => setFormData({ ...formData, year_of_study: value })}>
                <SelectTrigger className="bg-white/10 text-white border border-white/20">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "alumni"].map((y) => (
                    <SelectItem key={y} value={y}>
                      {y === "alumni" ? "Alumni" : `${y}${y === "1" ? "st" : y === "2" ? "nd" : y === "3" ? "rd" : "th"} Year`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GitHub URL</Label>
              <Input 
                type="url"
                value={formData.github_url} 
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                className="bg-white/10 text-white border border-white/20"
                placeholder="https://github.com/username"
              />
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <Input 
                type="url"
                value={formData.linkedin_url} 
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                className="bg-white/10 text-white border border-white/20"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="mb-8">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                  {skill}
                  <button type="button" onClick={() => removeSkill(index)} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input 
                value={newSkill} 
                onChange={(e) => setNewSkill(e.target.value)} 
                placeholder="Add skill"
                className="bg-white/10 text-white border border-white/20" 
              />
              <Button type="button" onClick={addSkill} className="bg-green-500 hover:bg-green-600 text-white">
                <PlusCircle className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Work Experience */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Work Experience</h2>
            <div className="space-y-6">
              {formData.experiences.map((exp, index) => (
                <div key={index} className="rounded-lg p-6 border border-white/10 bg-transparent space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-red-500"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Role</Label>
                      <Input 
                        value={exp.role} 
                        onChange={(e) => handleExperienceChange(index, "role", e.target.value)} 
                        className="bg-transparent border-white/10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Company</Label>
                      <Input 
                        value={exp.company} 
                        onChange={(e) => handleExperienceChange(index, "company", e.target.value)} 
                        className="bg-transparent border-white/10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Start Date</Label>
                      <Input 
                        type="date"
                        value={exp.start_date} 
                        onChange={(e) => handleExperienceChange(index, "start_date", e.target.value)} 
                        className="bg-transparent border-white/10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">End Date</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="date"
                          value={exp.end_date || ''} 
                          onChange={(e) => handleExperienceChange(index, "end_date", e.target.value)} 
                          className="bg-transparent border-white/10"
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
                  <div>
                    <Label className="text-sm font-medium text-zinc-400">Description</Label>
                    <Textarea 
                      value={exp.description} 
                      onChange={(e) => handleExperienceChange(index, "description", e.target.value)} 
                      className="bg-transparent border-white/10 min-h-[100px] resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                className="mt-4 border-white/10 text-white"
                onClick={addExperience}
              >
                + Add Experience
              </Button>
            </div>
          </div>

          {/* Achievements */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Achievements</h2>
            <div className="space-y-3">
              {formData.achievements.map((achievement, index) => (
                <div key={index} className="flex items-start gap-3 group">
                  <span className="text-zinc-400 mt-2 text-sm">•</span>
                  <div className="flex-1 flex items-start gap-2">
                    <Textarea 
                      value={achievement} 
                      onChange={(e) => handleAchievementChange(index, e.target.value)} 
                      className="bg-white/10 text-white border border-white/20 resize-none min-h-0 py-2"
                      rows={1}
                      style={{
                        height: 'auto',
                        minHeight: '2.5rem'
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => removeAchievement(index)}
                      className="mt-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4 border-white/10 text-white"
              onClick={addAchievement}
            >
              + Add Achievement
            </Button>
          </div>

          {/* Certifications */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Certifications</h2>
            <div className="space-y-3">
              {formData.certifications.map((cert, index) => (
                <div key={index} className="rounded-lg p-6 border border-white/10 bg-transparent space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => removeCertification(index)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-red-500"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Certification Name</Label>
                      <Input 
                        value={cert.name} 
                        onChange={(e) => handleCertificationChange(index, "name", e.target.value)} 
                        className="bg-transparent border-white/10"
                        placeholder="Certification name"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Issuing Organization (Optional)</Label>
                      <Input 
                        value={cert.issuing_organization || ''} 
                        onChange={(e) => handleCertificationChange(index, "issuing_organization", e.target.value)} 
                        className="bg-transparent border-white/10"
                        placeholder="Organization name"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                className="mt-4 border-white/10 text-white"
                onClick={addCertification}
              >
                + Add Certification
              </Button>
            </div>
          </div>

          {/* Projects */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Projects</h2>
            <div className="space-y-6">
              {formData.projects.map((proj, index) => (
                <div key={index} className="rounded-lg p-6 border border-white/10 bg-transparent space-y-4 relative">
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      projects: prev.projects.filter((_, i) => i !== index)
                    }))}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-red-500"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Project Name</Label>
                      <Input 
                        value={proj.name} 
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          projects: prev.projects.map((p, i) =>
                            i === index ? { ...p, name: e.target.value } : p
                          )
                        }))} 
                        className="bg-transparent border-white/10"
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-zinc-400">Project Link (Optional)</Label>
                      <Input 
                        value={proj.link || ''} 
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          projects: prev.projects.map((p, i) =>
                            i === index ? { ...p, link: e.target.value } : p
                          )
                        }))} 
                        className="bg-transparent border-white/10"
                        placeholder="https://github.com/yourproject"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-400">Description</Label>
                    <Textarea 
                      value={proj.description} 
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        projects: prev.projects.map((p, i) =>
                          i === index ? { ...p, description: e.target.value } : p
                        )
                      }))} 
                      className="bg-transparent border-white/10 min-h-[100px] resize-none"
                      rows={3}
                      placeholder="Describe your project"
                    />
                  </div>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                className="mt-4 border-white/10 text-white"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  projects: [{ name: "", description: "", link: "" }, ...prev.projects]
                }))}
              >
                + Add Project
              </Button>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-10 flex justify-end gap-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => router.push("/upload")}
            >
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={saving} 
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving 
                ? (isEditMode ? "Updating Profile..." : "Creating Profile...") 
                : (isEditMode ? "Update Profile" : "Create Profile")
              }
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingBrackets />
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  );
}
