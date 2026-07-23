import { z } from 'zod';
import { projectSchema } from '@/lib/validations/profile-update';



export const projectPostSchema = z.union([
  projectSchema,
  z.array(projectSchema).min(1, 'At least one project is required'),
]);

export type ProjectBody = z.infer<typeof projectSchema>;
export type ProjectPostPayload = z.infer<typeof projectPostSchema>;
