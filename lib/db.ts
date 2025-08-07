import { createClient } from '@supabase/supabase-js';

// Type definitions for our database models
export interface Member {
  id: string;
  name: string;
  email: string;
  picture_url: string;
  domain: string;
  year_of_study: number;
  resume_url: string;
  created_at: string;
  updated_at: string;
}

export interface MemberWithSkills extends Member {
  skills: string[];
}

export interface Skill {
  id: string;
  name: string;
}

export interface MemberSkill {
  member_id: string;
  skill_id: string;
}

export interface Achievement {
  id: string;
  member_id: string;
  title: string;
  description: string;
  date: string;
}

export interface Experience {
  id: string;
  member_id: string;
  company: string;
  role: string;
  description: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

export interface Link {
  id: string;
  member_id: string;
  name: string;
  url: string;
}

export interface Certification {
  id: string;
  member_id: string;
  name: string;
  issuing_organization?: string;
}

export interface Project {
  id: string;
  member_id: string;
  name: string;
  description: string;
  link: string;
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create tables using Supabase migrations or SQL editor
    console.log('Database tables should be created through Supabase dashboard');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Member database operations
export const MemberService = {
  async getAllMembers(supabase: any) {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        member_skills (
          skills (
            name
          )
        )
      `)
      .order('name');

    if (error) throw error;

    return data.map((member: any) => ({
      ...member,
      skills: member.member_skills?.map((ms: any) => ms.skills?.name).filter(Boolean) || []
    }));
  },

  async getMemberById(supabase: any, id: string) {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('Fetched member data:', member); // Debug log
    
    if (memberError || !member) return null;

    // Fetch skills
    const { data: memberSkills } = await supabase
      .from('member_skills')
      .select('skills(name)')
      .eq('member_id', id);
    const skills = memberSkills?.map((ms: any) => ms.skills?.name).filter(Boolean) || [];

    // Fetch achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('member_id', id)
      .order('date', { ascending: false });

    // Fetch experiences
    const { data: experiences } = await supabase
      .from('experiences')
      .select('*')
      .eq('member_id', id)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false });

    // Fetch links
    const { data: links } = await supabase
      .from('links')
      .select('*')
      .eq('member_id', id);

    // Fetch certifications
    const { data: certifications } = await supabase
      .from('certifications')
      .select('*')
      .eq('member_id', id);

    // Fetch projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('member_id', id);

    return {
      ...member,
      skills,
      achievements: achievements || [],
      experiences: experiences || [],
      links: links || [],
      certifications: certifications || [],
      projects: projects || [],
      resume_url: member.resume_url || null,
    };
  },

  async searchMembers(supabase: any, searchTerm: string, domains: string[], years: number[], skills: string[]) {
    try {
      // Start with a base query that includes all related data
      let query = supabase
        .from('members')
        .select(`
          *,
          member_skills (
            skills (
              name
            )
          )
        `);


      // Handle domain filters
      if (domains && domains.length > 0) {
        query = query.in('domain', domains);
      }

      // Handle year filters
      if (years && years.length > 0) {
        query = query.in('year_of_study', years);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      // Process the results
      let results: MemberWithSkills[] = data.map((member: any) => ({
        ...member,
        skills: member.member_skills?.map((ms: any) => ms.skills?.name).filter(Boolean) || [],
      }));

      // Handle search term - search across multiple fields INCLUDING skills
      if (searchTerm) {
        const terms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);

        results = results.filter((member: MemberWithSkills) => {
          return terms.every(term => {
            // Search in name, email, domain
            const searchInBasicFields = 
              member.name?.toLowerCase().includes(term) ||
              member.email?.toLowerCase().includes(term) ||
              member.domain?.toLowerCase().includes(term);
            
            // Search in skills array
            const searchInSkills = member.skills.some((skill: string) => 
              skill.toLowerCase().includes(term)
            );
            
            return searchInBasicFields || searchInSkills;
          });
        });
      }
      // Filter by skills if specified
      if (skills && skills.length > 0) {
        results = results.filter((member: MemberWithSkills) => 
          skills.every(skill => member.skills.includes(skill))
        );
      }

      return results;
    } catch (error) {
      console.error('Error in searchMembers:', error);
      throw error;
    }
  },

  async createMember(supabase: any, member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) {
    console.log('Creating member with data:', member); // Debug log

    const { data, error } = await supabase
      .from('members')
      .insert([member])
      .select()
      .single();

    console.log('Member creation result:', { data, error }); // Debug log

    if (error) throw error;
    return data;
  },

  async updateMember(supabase: any, id: string, member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertMember(supabase: any, member: Partial<Member>) {
    console.log('Upserting member with data:', member); // Debug log

    const { data, error } = await supabase
      .from('members')
      .upsert(member)
      .select()
      .single();

    console.log('Member upsert result:', { data, error }); // Debug log

    if (error) throw error;
    return data;
  }
};

// Certification operations
export const CertificationService = {
  async getMemberCertifications(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('member_id', memberId);

    if (error) throw error;
    return data || [];
  },

  async createCertification(supabase: any, certification: Omit<Certification, 'id'>) {
    const { data, error } = await supabase
      .from('certifications')
      .insert(certification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createCertifications(supabase: any, certifications: Omit<Certification, 'id'>[]) {
    const { data, error } = await supabase
      .from('certifications')
      .insert(certifications)
      .select();
    if (error) throw error;
    return data;
  },

  async removeCertificationsByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('member_id', memberId);

    if (error) throw error;
  }
};

// Skill database operations
export const SkillService = {
  async getAllSkills(supabase: any) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  async getOrCreateSkill(supabase: any, name: string) {
    name = name.trim();
    if (!name) return null;

    let { data: skill } = await supabase
      .from('skills')
      .select('id')
      .ilike('name', name)
      .single();

    if (!skill) {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({ name })
        .select('id')
        .single();
      if (error) throw error;
      skill = newSkill;
    }
    
    return skill.id;
  },
  
  async addSkillToMember(supabase: any, memberId: string, skillId: string) {
    if (!memberId || !skillId) return;
    
    const { error } = await supabase
      .from('member_skills')
      .insert({ member_id: memberId, skill_id: skillId });
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
    return true;
  },
  
  async removeSkillFromMember(supabase: any, memberId: string, skillId: string) {
    const { error } = await supabase
      .from('member_skills')
      .delete()
      .eq('member_id', memberId)
      .eq('skill_id', skillId);
    if (error) throw error;
  },
  
  async getMemberSkills(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('member_skills')
      .select('skills(id, name)')
      .eq('member_id', memberId);
    
    if (error) throw error;
    return data?.map((item: any) => item.skills).filter(Boolean) || [];
  },

  async removeSkillsByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('member_skills')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Achievement database operations
export const AchievementService = {
  async getMemberAchievements(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('member_id', memberId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  async createAchievement(supabase: any, achievement: Omit<Achievement, 'id'>) {
    const { data, error } = await supabase
      .from('achievements')
      .insert([achievement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  async createAchievements(supabase: any, achievements: Omit<Achievement, 'id'>[]) {
    const { data, error } = await supabase
      .from('achievements')
      .insert(achievements)
      .select();
    if (error) throw error;
    return data;
  },

  async deleteAchievement(supabase: any, achievementId: string) {
    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', achievementId);
    if (error) throw error;
  },

  async removeAchievementsByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Experience database operations
export const ExperienceService = {
  async getMemberExperiences(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('member_id', memberId);
    if (error) throw error;
    return data;
  },
  
  async createExperience(supabase: any, experience: Omit<Experience, 'id'>) {
    const { data, error } = await supabase
      .from('experiences')
      .insert([experience])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createExperiences(supabase: any, experiences: Omit<Experience, 'id'>[]) {
    const { data, error } = await supabase
      .from('experiences')
      .insert(experiences)
      .select();
    if (error) throw error;
    return data;
  },

  async removeExperiencesByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('experiences')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Link database operations
export const LinkService = {
  async getMemberLinks(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('member_id', memberId);
    if (error) throw error;
    return data;
  },
  
  async createLink(supabase: any, link: Omit<Link, 'id'>) {
    const { data, error } = await supabase
      .from('links')
      .insert([link])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createLinks(supabase: any, links: Omit<Link, 'id'>[]) {
    const { data, error } = await supabase
      .from('links')
      .insert(links)
      .select();
    if (error) throw error;
    return data;
  },

  async removeLinksByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Project database operations
export const ProjectService = {
  async getMemberProjects(supabase: any, memberId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('member_id', memberId);
    if (error) throw error;
    return data || [];
  },

  async createProject(supabase: any, project: Omit<Project, 'id'>) {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createProjects(supabase: any, projects: Omit<Project, 'id'>[]) {
    const { data, error } = await supabase
      .from('projects')
      .insert(projects)
      .select();
    if (error) throw error;
    return data;
  },

  async updateProject(supabase: any, id: string, project: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeProject(supabase: any, id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async removeProjectsByMemberId(supabase: any, memberId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};
