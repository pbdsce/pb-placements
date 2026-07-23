import { z } from 'zod';

export const memberSchema = z.object({
  id: z.string().optional(),
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(200, 'Name must be 200 characters or less'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
  domain: z
    .string()
    .max(200, 'Domain must be 200 characters or less')
    .default(''),
  year_of_study: z
    .number()
    .int('Year of study must be an integer')
    .min(1, 'Year of study must be at least 1')
    .max(4, 'Year of study must be at most 4'),
  picture_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  resume_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const skillsSchema = z
  .array(z.string().min(1, 'Skill name cannot be empty').max(100, 'Skill name too long'))
  .default([]);

export const experienceSchema = z.object({
  company: z
    .string({ required_error: 'Company is required' })
    .min(1, 'Company cannot be empty')
    .max(200, 'Company name too long'),
  role: z
    .string({ required_error: 'Role is required' })
    .min(1, 'Role cannot be empty')
    .max(200, 'Role too long'),
  description: z.string().max(2000, 'Description too long').default(''),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().default(false),
});

export const experiencesSchema = z.array(experienceSchema).default([]);

export const achievementsSchema = z
  .array(z.string())
  .default([]);

export const linkSchema = z.object({
  name: z
    .string({ required_error: 'Link name is required' })
    .min(1, 'Link name cannot be empty')
    .max(100, 'Link name too long'),
  url: z
    .string({ required_error: 'URL is required' })
    .url('Must be a valid URL'),
});

export const linksSchema = z.array(linkSchema).default([]);

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z
    .string({ required_error: 'Certification name is required' })
    .min(1, 'Certification name cannot be empty')
    .max(300, 'Certification name too long'),
  issuing_organization: z.string().max(300, 'Organization name too long').optional(),
});

export const certificationsSchema = z.array(certificationSchema).default([]);

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z
    .string({ required_error: 'Project name is required' })
    .min(1, 'Project name cannot be empty')
    .max(200, 'Project name too long'),
  description: z.string().max(2000, 'Description too long').default(''),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const projectsSchema = z.array(projectSchema).default([]);

export const profileUpdateSchema = z.object({
  member: memberSchema,
  skills: skillsSchema,
  experiences: experiencesSchema,
  achievements: achievementsSchema,
  links: linksSchema,
  certifications: certificationsSchema,
  projects: projectsSchema,
  resume_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
export type MemberBody = z.infer<typeof memberSchema>;
export type ExperienceBody = z.infer<typeof experienceSchema>;
export type LinkBody = z.infer<typeof linkSchema>;
export type CertificationBody = z.infer<typeof certificationSchema>;
export type ProjectBody = z.infer<typeof projectSchema>;
