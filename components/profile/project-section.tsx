"use client";

import React from "react";

export interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
}

interface ProjectSectionProps {
  projects: Project[];
  isEditable?: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectSection({ projects, isEditable, onEdit, onDelete }: ProjectSectionProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
          <h3 className="break-words text-base font-semibold text-white">{project.name}</h3>

          {project.description && (
            <ul className="list-disc list-inside break-words text-gray-300 text-sm mt-2 space-y-1">
              {project.description
                .split(/[•·‣●◦⁃∙*]\s*/g)
                .map((point: string, index: number) =>
                  point.trim() ? <li key={index}>{point.trim()}</li> : null
                )}
            </ul>
          )}

          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline text-sm inline-block mt-2"
            >
              View Project
            </a>
          )}

          {isEditable && (
            <div className="flex gap-2 mt-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(project)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(project.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 