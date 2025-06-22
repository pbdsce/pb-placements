import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Type definitions for our database models
export interface Member {
  id: string;
  name: string;
  email: string;
  picture_url: string;
  domain: string;
  year_of_study: number;
  resume_url: string;
  created_at: Date;
  updated_at: Date;
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
  date: Date;
}

export interface Experience {
  id: string;
  member_id: string;
  company: string;
  role: string;
  description: string;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
}

export interface Link {
  id: string;
  member_id: string;
  name: string;
  url: string;
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
  async getAllMembers() {
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

    return data.map(member => ({
      ...member,
      skills: member.member_skills?.map((ms: any) => ms.skills?.name).filter(Boolean) || []
    }));
  },

  async getMemberById(id: string) {
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
      .select('skill_id, skills(name)')
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


    return {
      ...member,
      skills,
      achievements: achievements || [],
      experiences: experiences || [],
      links: links || [],
      resume_url: member.resume_url || null,
    }
  },

  async searchMembers(searchTerm: string, domains: string[], years: number[], skills: string[]) {
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

      // Handle search term - search across multiple fields
      if (searchTerm) {
        const terms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
        
        // Build search conditions for each term
        terms.forEach(term => {
          query = query.or(
            `name.ilike.%${term}%,email.ilike.%${term}%,domain.ilike.%${term}%`
          );
        });
      }

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
      let results = data.map(member => ({
        ...member,
        skills: member.member_skills?.map((ms: any) => ms.skills?.name).filter(Boolean) || [],
        year_of_study: member.year_of_study === 1 ? '1st' :
                      member.year_of_study === 2 ? '2nd' :
                      member.year_of_study === 3 ? '3rd' :
                      'Alumni'
      }));

      // Filter by skills if specified
      if (skills && skills.length > 0) {
        results = results.filter(member => 
          skills.every(skill => member.skills.includes(skill))
        );
      }

      return results;
    } catch (error) {
      console.error('Error in searchMembers:', error);
      throw error;
    }
  },

  async createMember(member: Omit<Member, 'id' | 'created_at' | 'updated_at'>) {
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

  async updateMember(id: string, member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertMember(member: Member) {
    console.log('Upserting member with data:', member); // Debug log
    
    const { data, error } = await supabase
      .from('members')
      .upsert([member])
      .select()
      .single();
    
    console.log('Member upsert result:', { data, error }); // Debug log
    
    if (error) throw error;
    return data;
  }
};

// Skill database operations
export const SkillService = {
  async getAllSkills() {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  async getOrCreateSkill(name: string) {
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
  
  async addSkillToMember(memberId: string, skillId: string) {
    if (!memberId || !skillId) return false;
    
    const { error } = await supabase
      .from('member_skills')
      .insert({ member_id: memberId, skill_id: skillId });
    
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
    return true;
  },
  
  async removeSkillFromMember(memberId: string, skillId: string) {
    const { error } = await supabase
      .from('member_skills')
      .delete()
      .eq('member_id', memberId)
      .eq('skill_id', skillId);
    if (error) throw error;
  },
  
  async getMemberSkills(memberId: string) {
    const { data, error } = await supabase
      .from('member_skills')
      .select('skills(id, name)')
      .eq('member_id', memberId);
    
    if (error) throw error;
    return data?.map((item: any) => item.skills) || [];
  },

  async removeSkillsByMemberId(memberId: string) {
    const { error } = await supabase
      .from('member_skills')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Achievement database operations
export const AchievementService = {
  async getMemberAchievements(memberId: string) {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('member_id', memberId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  async createAchievement(achievement: Omit<Achievement, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('achievements')
      .insert([achievement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  
  async deleteAchievement(achievementId: string) {
    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', achievementId);
    if (error) throw error;
  },

  async removeAchievementsByMemberId(memberId: string) {
    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Experience database operations
export const ExperienceService = {
  async getMemberExperiences(memberId: string) {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('member_id', memberId);
    if (error) throw error;
    return data;
  },
  
  async createExperience(experience: Omit<Experience, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('experiences')
      .insert([experience])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeExperiencesByMemberId(memberId: string) {
    const { error } = await supabase
      .from('experiences')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};

// Link database operations
export const LinkService = {
  async getMemberLinks(memberId: string) {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('member_id', memberId);
    if (error) throw error;
    return data;
  },
  
  async createLink(link: Omit<Link, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('links')
      .insert([link])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeLinksByMemberId(memberId: string) {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('member_id', memberId);
    if (error) throw error;
  }
};
