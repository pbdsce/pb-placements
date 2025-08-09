import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { 
  MemberService, 
  SkillService, 
  ExperienceService, 
  AchievementService,
  CertificationService,
  LinkService,
  ProjectService,
  Link,
  Experience,
  Achievement,
  Project,
  Certification,
  Skill
} from "@/lib/db";
import { ExperienceSection } from "@/components/profile/experience-section";
import { AchievementSection } from "@/components/profile/achievement-section";
import { ResumeSection } from "@/components/profile/resume-section";
import { ExportProfileButton } from "@/components/profile/export-profile-button";
import { EditProfileButton } from "@/components/profile/edit-profile-button";
import Image from "next/image";
import { User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillSection } from "@/components/profile/skill-section";
import { CertificationSection } from "@/components/profile/certification-section";
import { ProjectSection } from "@/components/profile/project-section";

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatResumeDisplayName(fullName: string, year: number): string {
  const name = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return `${name}_${year}yr_resume.pdf`;
}

async function resolveIdFromParam(supabase: any, id: string): Promise<string> {
  const suffix = extractSlugId(id);
  if (!suffix) return id;
  const base = id.replace(/-([0-9a-f]{6})$/i, '').replace(/-/g, ' ').trim();
  try {
    const { data } = await supabase
      .from('members')
      .select('id,name')
      .ilike('name', `%${base}%`)
      .limit(1);
    const match = (data || []).find((m: any) => (m.id as string).toLowerCase().startsWith(suffix));
    if (match?.id) return match.id;
  } catch {}

  return id;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerComponentClient({ cookies });
  
  let member = await MemberService.getMemberById(supabase, id);
  
  if (!member) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (id === 'me' || id === user.id)) {
        member = await MemberService.getMemberById(supabase, user.id);
      }
    } catch (error) {
    }
  }
  
  if (!member) {
    return {
      title: "Profile Not Found",
    };
  }
  
  return {
    title: `${member.name} | Point Blank`,
    description: `View ${member.name}'s developer profile on Point Blank`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  let member = await MemberService.getMemberById(supabase, id);
  let actualMemberId = id;
  
  if (!member && user) {
    if (id === 'me' || id === user.id) {
      member = await MemberService.getMemberById(supabase, user.id);
      actualMemberId = user.id;
      
      if (!member && id === user.id) {
        console.log('User profile not found, user needs to create profile first');
      }
    }
  }
  
  if (!member && user) {
    const userProfile = await MemberService.getMemberById(supabase, user.id);
    if (userProfile && id !== user.id) {
      redirect(`/profile/${user.id}`);
    }
  }
  
  if (!member) {
    console.log('Member not found for ID:', id);
    console.log('Current user ID:', user?.id);
    notFound();
  }
  
  console.log('Member data found:', { 
    memberId: member.id, 
    memberName: member.name,
    requestedId: id,
    currentUserId: user?.id 
  });
  
  // Fetch additional profile data
  const skills = await SkillService.getMemberSkills(supabase, actualMemberId);
  const experiences = await ExperienceService.getMemberExperiences(supabase, actualMemberId);
  const achievements = await AchievementService.getMemberAchievements(supabase, actualMemberId);
  const links = await LinkService.getMemberLinks(supabase, actualMemberId);
  const certifications = await CertificationService.getMemberCertifications(supabase, actualMemberId);
  const projects = await ProjectService.getMemberProjects(supabase, actualMemberId);
  
  const isCurrentUser = user?.id === member.id;
  const displayFileName = formatResumeDisplayName(member.name, member.year_of_study);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Hero Banner */}
      <div className="relative h-60 md:h-70 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 via-emerald-600/80 to-lime-600/80 backdrop-blur-sm"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-16 h-16 border border-emerald-400/40 rotate-12 animate-bounce"></div>
          <div className="absolute bottom-20 left-1/3 w-12 h-12 bg-lime-400/30 rounded-full animate-pulse"></div>
        </div>

        {/* Glassmorphism Header Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-md"></div>
      </div>

       <div className="relative px-4 md:px-8 -mt-32 z-10">
        {/* Profile Header Card */}
        <div className="mb-8 transform hover:scale-[1.02] transition-all duration-500">
          <div className="bg-black rounded-3xl border border-gray-800 shadow-2xl p-6 md:p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Profile Info */}
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  {/* Profile Picture */}
                  <div className="shrink-0">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-green-500 overflow-hidden">
                      {member.picture_url ? (
                        <Image
                          src={member.picture_url}
                          alt={`${member.name}'s profile picture`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{member.name}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                      <div className="text-green-400 font-medium">
                        {member.domain} - Year {member.year_of_study}
                      </div>
                      <div className="flex gap-4 justify-center sm:justify-start">
                        {links.some((l: Link) => l.url?.includes('github')) && (
                          <a
                            href={links.find((l: Link) => l.url?.includes('github'))?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-green-400 transition-colors"
                          >
                            GitHub
                          </a>
                        )}
                        {links.some((l: Link) => l.url?.includes('linkedin')) && (
                          <a
                            href={links.find((l: Link) => l.url?.includes('linkedin'))?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-green-400 transition-colors"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                    {member.email && (
                      <div className="text-gray-400 text-sm mt-2">{member.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center lg:items-start gap-2 w-full lg:w-auto">
                {isCurrentUser && (
                  <div className="transform hover:scale-110 transition-all duration-300 w:full">
                    <EditProfileButton memberId={member.id} />
                  </div>
                )}
                <div className="transform hover:scale-110 transition-all duration-300 w-full">
                  <ExportProfileButton
                    memberId={member.id}
                    memberName={member.name}
                    memberEmail={member.email}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
       {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
             {/* Experience and Achievements Tabs */}
            <div className="group transform hover:scale-[1.02] transition-all duration-500">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <Tabs defaultValue="experience" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black rounded-t-xl p-0">
                    <TabsTrigger 
                      value="experience" 
                      className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 rounded-tl-lg py-4 border-r border-gray-800"
                    >
                      Experience
                    </TabsTrigger>
                    <TabsTrigger 
                      value="achievements" 
                      className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 rounded-tr-lg py-4"
                    >
                      Achievements
                    </TabsTrigger>
                  </TabsList>

                  <div className="p-6">
                    <TabsContent value="experience">
                      <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                        {experiences.length > 0 ? (
                          <ExperienceSection 
                            experiences={experiences} 
                            isEditable={isCurrentUser}
                          />
                        ) : (
                          <div className="text-center text-gray-400 py-8">
                            No experience information available
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="achievements">
                      <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                        {achievements.length > 0 ? (
                          <AchievementSection 
                            achievements={achievements} 
                            isEditable={isCurrentUser}
                          />
                        ) : (
                          <div className="text-center text-gray-400 py-8">
                            No achievements information available
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          {/* Certifications and Projects Tabs*/}
          <div className="group transform hover:scale-[1.02] transition-all duration-500">
            <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <Tabs defaultValue="projects" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black rounded-t-xl p-0">
                  <TabsTrigger 
                    value="projects" 
                    className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 rounded-tl-lg py-4 border-r border-gray-800"
                  >
                    Projects
                  </TabsTrigger>
                  <TabsTrigger 
                    value="certifications" 
                    className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 rounded-tr-lg py-4"
                  >
                    Certifications
                  </TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="projects">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                      {projects.length > 0 ? (
                        <ProjectSection projects={projects} isEditable={isCurrentUser} />
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-6">
                          No projects information available
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="certifications">
                    <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                      {certifications.length > 0 ? (
                        <CertificationSection certifications={certifications} />
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-6">
                          No certifications information available
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Skills Section */}
            <div className="group transform hover:scale-[1.02] transition-all duration-500">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <SkillSection 
                    skills={skills.map((s: Skill) => s.name)} 
                    isEditable={isCurrentUser}
                  />
                </div>
              </div>
            </div>
            <div className="group transform hover:scale-[1.02] transition-all duration-500">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <ResumeSection 
                    resumeUrl={member.resume_url} 
                    isEditable={isCurrentUser}
                    displayFileName={displayFileName}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
            