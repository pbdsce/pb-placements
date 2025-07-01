"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/authStore";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface ParsedData {
  id?: string;
  name?: string;
  email?: string;
  domain?: string;
  year?: number;
  skills: string[];
  achievements: string[];
}

interface ConfirmationFormProps {
  parsedData: ParsedData;
}

export function ConfirmationForm({ parsedData }: ConfirmationFormProps) {
  const userFromStore = useAuthStore((state) => state.user);
  const router = useRouter();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }
      else console.error("No session found", error);
    };

    getUser();
  }, []);

  const [formData, setFormData] = useState({
    name: parsedData.name || userFromStore?.user_metadata?.full_name || "",
    email: parsedData.email || userFromStore?.email || "",
    domain: parsedData.domain || "",
    year: parsedData.year || 1,
    skills: parsedData.skills || [],
    achievements: parsedData.achievements || [],
  });

  const [newSkill, setNewSkill] = useState("");
  const [newAchievement, setNewAchievement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() === "" || formData.skills.includes(newSkill)) return;
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, newSkill],
    }));
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const handleAddAchievement = () => {
    if (newAchievement.trim() === "") return;
    setFormData((prev) => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement],
    }));
    setNewAchievement("");
  };

  const handleRemoveAchievement = (achievement: string) => {
    setFormData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((a) => a !== achievement),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const supabase = createClientComponentClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      throw new Error("Not authenticated");
    }

    const token = session.access_token;

    const payload = {
      id: userId,
      name: formData.name,
      email: formData.email,
      domain: formData.domain,
      year: formData.year,
      skills: formData.skills,
      achievements: formData.achievements,
    };

    const response = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, 
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const data = await response.json();

    toast({
      title: "Profile updated successfully",
      description: "Your profile has been created/updated. Redirecting...",
    });

    setTimeout(() => {
      router.push(`/profile/${data.id || userId}`);
    }, 1500);
  } catch (error) {
    toast({
      title: "Update failed",
      description: "There was an error updating your profile. Please try again.",
      variant: "destructive",
    });
    setIsSubmitting(false);
  }
};

  const domains = [
    "Frontend Development", "Backend Development", "Full Stack Development",
    "Mobile Development", "iOS Development", "Android Development",
    "Game Development", "DevOps", "Cloud Engineering",
    "Data Science", "Machine Learning", "UI/UX Design",
    "Cybersecurity", "Blockchain Development",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Confirm Your Information</CardTitle>
          <CardDescription>
            We&apos;ve extracted information from your resume. Please review and edit as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Select
                value={formData.domain}
                onValueChange={(value) => handleSelectChange("domain", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year of Study</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => handleSelectChange("year", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                  <SelectItem value="5">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {formData.skills.length === 0 && (
                <span className="text-sm text-muted-foreground">No skills added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button type="button" onClick={handleAddSkill} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Achievements</Label>
            <div className="space-y-2 mb-3">
              {formData.achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                >
                  <span className="text-sm">{achievement}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => handleRemoveAchievement(achievement)}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {formData.achievements.length === 0 && (
                <span className="text-sm text-muted-foreground">No achievements added yet</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add an achievement..."
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAchievement();
                  }
                }}
              />
              <Button type="button" onClick={handleAddAchievement} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/upload')}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600">
            {isSubmitting ? "Saving..." : "Save Profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
