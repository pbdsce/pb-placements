import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
import { memberUrl, resolveIdFromParam } from "@/lib/utils";

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatResumeDisplayName(fullName: string, year: number): string {
  const name = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return `${name}_${year}yr_resume.pdf`;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient();
  
  const resolvedId = await resolveIdFromParam(supabase, id);
  let member = await MemberService.getMemberById(supabase, resolvedId);
  
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let actualMemberId = await resolveIdFromParam(supabase, id);
  let member = await MemberService.getMemberById(supabase, actualMemberId);
  
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
      redirect(memberUrl(userProfile.name, userProfile.id));
    }
  }
  
  if (!member) {
    console.log('Member not found for ID:', id);
    console.log('Current user ID:', user?.id);
    notFound();
  }

  if (id === actualMemberId) {
    redirect(memberUrl(member.name, actualMemberId));
  }
  
  console.log('Member data found:', { 
    memberId: actualMemberId, 
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
  
  const isCurrentUser = user?.id === actualMemberId;
  const displayFileName = formatResumeDisplayName(member.name, member.year_of_study);
  const showAchievementsTab = achievements.length > 0 || isCurrentUser;
  
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

       <div className="relative px-4 max-[270px]:px-2 md:px-8 -mt-32 z-10">
        {/* Profile Header Card */}
        <div className="mb-8 transform transition-all duration-500 sm:hover:scale-[1.02]">
          <div className="bg-black rounded-3xl border border-gray-800 shadow-2xl p-6 max-[270px]:rounded-2xl max-[270px]:p-3 md:p-6">
            <div className="flex min-w-0 flex-col lg:flex-row gap-6 max-[270px]:gap-4 items-start lg:items-end">
              {/* Profile Info */}
              <div className="min-w-0 flex-1 w-full">
                <div className="flex min-w-0 flex-col sm:flex-row gap-6 max-[270px]:gap-3 items-center sm:items-start">
                  {/* Profile Picture */}
                  <div className="shrink-0">
                    <div className="relative w-24 h-24 max-[270px]:h-20 max-[270px]:w-20 md:w-32 md:h-32 rounded-full border-2 border-green-500 overflow-hidden">
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
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h1 className="break-words text-2xl font-bold leading-tight text-white max-[270px]:text-lg md:text-3xl">{member.name}</h1>
                    <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                      <div className="break-words text-green-400 font-medium max-[270px]:text-sm">
                        {member.domain} - Year {member.year_of_study}
                      </div>
                      <div className="flex flex-wrap gap-4 max-[270px]:gap-2 justify-center sm:justify-start">
                        {links.some((l: Link) => l.url?.includes('github')) && (
                          <a
                            href={links.find((l: Link) => l.url?.includes('github'))?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-green-400 transition-colors max-[270px]:text-sm"
                          >
                            GitHub
                          </a>
                        )}
                        {links.some((l: Link) => l.url?.includes('linkedin')) && (
                          <a
                            href={links.find((l: Link) => l.url?.includes('linkedin'))?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-green-400 transition-colors max-[270px]:text-sm"
                          >
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                    {member.email && (
                      <div className="break-all text-gray-400 text-sm mt-2 max-[270px]:text-xs">{member.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex min-w-0 flex-col items-stretch lg:items-start gap-2 w-full lg:w-auto">
                {isCurrentUser && (
                  <div className="transform hover:scale-110 transition-all duration-300 w:full">
                    <EditProfileButton />
                  </div>
                )}
                <div className="transform transition-all duration-300 sm:hover:scale-110 w-full">
                  <ExportProfileButton
                    memberId={actualMemberId}
                    memberName={member.name}
                    memberEmail={member.email}
                    isCurrentUser={isCurrentUser}
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
            <div className="group transform transition-all duration-500 sm:hover:scale-[1.02]">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <Tabs defaultValue="experience" className="w-full">
                <TabsList className={`grid h-auto min-h-10 w-full ${showAchievementsTab ? 'grid-cols-2' : 'grid-cols-1'} bg-black rounded-t-xl p-0`}>
                    <TabsTrigger 
                      value="experience" 
                      className={`min-w-0 whitespace-normal break-words px-2 py-3 text-xs leading-tight data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 min-[360px]:text-sm sm:py-4 ${showAchievementsTab ? 'rounded-tl-lg border-r border-gray-800' : 'rounded-t-lg'}`}
                    >
                       <span className="block w-full min-w-0 [overflow-wrap:anywhere]">
                        Experience
                      </span>
                    </TabsTrigger>
                    {showAchievementsTab && (
                      <TabsTrigger 
                        value="achievements" 
                        className="min-w-0 whitespace-normal break-words rounded-tr-lg px-2 py-3 text-xs leading-tight data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 min-[360px]:text-sm sm:py-4"
                      >
                        <span className="block w-full min-w-0 [overflow-wrap:anywhere]">
                        Achievements
                        </span>
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <div className="p-6 max-[270px]:p-3">
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

                    {showAchievementsTab && (
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
                    )}
                  </div>
                </Tabs>
              </div>
            </div>
          {/* Certifications and Projects Tabs*/}
          <div className="group transform transition-all duration-500 sm:hover:scale-[1.02]">
            <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              <Tabs defaultValue="projects" className="w-full">
                <TabsList className="grid h-auto min-h-10 w-full grid-cols-2 bg-black rounded-t-xl p-0">
                  <TabsTrigger 
                    value="projects" 
                    className="min-w-0 whitespace-normal break-words rounded-tl-lg border-r border-gray-800 px-2 py-3 text-xs leading-tight data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 min-[360px]:text-sm sm:py-4"
                  >
                    <span className="block w-full min-w-0 [overflow-wrap:anywhere]">
                    Projects
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="certifications" 
                    className="min-w-0 whitespace-normal break-words rounded-tr-lg px-2 py-3 text-xs leading-tight data-[state=active]:bg-gray-800 data-[state=active]:text-green-400 min-[360px]:text-sm sm:py-4"
                  >
                    <span className="block w-full min-w-0 [overflow-wrap:anywhere]">
                    Certifications
                    </span>
                  </TabsTrigger>
                </TabsList>

                <div className="p-6 max-[270px]:p-3">
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
            <div className="group transform transition-all duration-500 sm:hover:scale-[1.02]">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <SkillSection 
                    skills={skills.map((s: Skill) => s.name)} 
                    isEditable={isCurrentUser}
                  />
                </div>
              </div>
            </div>
            <div className="group transform transition-all duration-500 sm:hover:scale-[1.02]">
              <div className="bg-black rounded-2xl border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  <ResumeSection 
                    resumeUrl={member.resume_url} 
                    isEditable={isCurrentUser}
                    userId={actualMemberId}
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
            
