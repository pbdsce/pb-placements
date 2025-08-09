"use client";

import { useState, useEffect } from "react";
import { FileText, Upload, Trash2, Download, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ResumeFile {
  name: string;
  created_at: string;
  size: number;
  publicUrl: string;
}

interface ResumeSectionProps {
  resumeUrl?: string;
  isEditable?: boolean;
  userId?: string;
  displayFileName?: string;
}

export function ResumeSection({ resumeUrl, isEditable, userId, displayFileName }: ResumeSectionProps) {
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isEditable) {
      fetchResumeFiles();
    } else {
      setLoading(false);
    }
  }, [isEditable]);

  const fetchResumeFiles = async () => {
    try {
      const id = userId || (await supabase.auth.getUser()).data?.user?.id;
      if (!id) return;

      const userFolder = `resumes/${id}`;
      const { data: files, error } = await supabase.storage
        .from('resume')
        .list(userFolder);

      if (error) {
        console.error('Error fetching files:', error);
        return;
      }

      if (files) {
        const filesWithUrls = await Promise.all(
          files.map(async (file) => {
            const { data: { publicUrl } } = supabase.storage
              .from('resume')
              .getPublicUrl(`${userFolder}/${file.name}`);
            
            return {
              name: file.name,
              created_at: file.created_at,
              size: file.metadata?.size || 0,
              publicUrl
            };
          })
        );

      filesWithUrls.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setResumeFiles(filesWithUrls);

      const latestResume = filesWithUrls[0];
      if (latestResume) {
        await supabase
          .from('members')
          .update({ resume_url: latestResume.publicUrl })
          .eq('id', id);
      }
    }
  } catch (error) {
    console.error('Error fetching resume files:', error);
  } finally {
    setLoading(false);
  }
};

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });

      await fetchResumeFiles();
      
      event.target.value = '';
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your resume",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.storage
        .from('resume')
        .remove([`resumes/${user.id}/${fileName}`]);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });

      await fetchResumeFiles();
      
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the resume",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVersionNumber = (index: number) => {
    return `v${resumeFiles.length - index}`;
  };

  if (!isEditable && resumeUrl) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Resume</h2>
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayFileName || 'Resume.pdf'}</p>
            <p className="text-xs text-muted-foreground truncate">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!resumeUrl) {
                toast({
                  title: "Resume not found",
                  description: "User has no versions of resumes to view and export.",
                  variant: "destructive",
                  duration: 5000,
                });
                return;
              }
              const res = await fetch(resumeUrl, { method: "HEAD" });
              if (res.ok) {
                window.open(resumeUrl, "_blank", "noopener,noreferrer");
              } else {
                toast({
                  title: "Resume not found",
                  description: "User has no versions of resumes to view and export.",
                  variant: "destructive",
                  duration: 5000,
                });
              }
            }}
          >
            View
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Resume Versions</h2>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="resume-upload"
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => document.getElementById('resume-upload')?.click()}
            disabled={uploading}
          >
            <Plus className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Add Version'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {resumeFiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No resumes uploaded</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Upload your first resume to get started. You can store up to 4 versions.
                </p>
                <Button
                  onClick={() => document.getElementById('resume-upload')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
          ) : (
            resumeFiles.map((file, index) => (
              <Card key={file.name}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                          {getVersionNumber(index)} {index === 0 && "(Latest)"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(file.created_at)}
                        </div>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={file.publicUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resume Version</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this resume version? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFile(file.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {resumeFiles.length > 0 && (
            <div className="text-xs text-muted-foreground text-center p-4 bg-muted/30 rounded-lg">
              <p>You can store up to 4 resume versions. When you upload a 5th version, the oldest one will be automatically deleted.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}