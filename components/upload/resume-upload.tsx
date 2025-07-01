"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, FileText, Loader2, Upload, X, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function ResumeUpload() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [existingResumeCount, setExistingResumeCount] = useState(0);
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkUserAndResumes();
  }, []);

  const checkUserAndResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const userFolder = `resumes/${user.id}`;
      const { data: files } = await supabase.storage
        .from('resume')
        .list(userFolder);

      if (files) {
        setExistingResumeCount(files.length);
        setUserExists(files.length > 0);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (droppedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      
      if (droppedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(droppedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress > 90 ? 90 : newProgress;
      });
    }, 300);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      setUploadProgress(100);
      setUploadComplete(true);
      
      const data = await response.json();
      
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been uploaded and parsed. Redirecting to confirmation page...",
      });
      
      localStorage.setItem('parsed_resume', JSON.stringify(data));
      setTimeout(() => {
        router.push('/upload/confirm');
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your resume. Please try again.",
        variant: "destructive",
      });
      
      setUploading(false);
      clearInterval(progressInterval);
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {userExists ? (
                <User className="h-5 w-5 text-blue-500" />
              ) : (
                <UserPlus className="h-5 w-5 text-green-500" />
              )}
              <CardTitle>
                {userExists ? 'Update Your Resume' : 'Upload Your Resume'}
              </CardTitle>
            </div>
            <Badge variant={userExists ? "secondary" : "default"}>
              {userExists ? `Version ${existingResumeCount + 1}` : 'New Profile'}
            </Badge>
          </div>
          <CardDescription>
            {userExists 
              ? `Upload a new version of your resume. You currently have ${existingResumeCount} version${existingResumeCount !== 1 ? 's' : ''} stored.`
              : "Upload your resume to create your profile. We'll automatically parse your skills and experience."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {existingResumeCount >= 4 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> You have the maximum number of resume versions (4). 
                  Uploading a new version will automatically delete your oldest resume.
                </p>
              </div>
            )}
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-green-500 bg-green-500/5' : 'border-muted'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-muted/50 p-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    {file ? file.name : "Drag & drop your resume"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {file 
                      ? `${(file.size / 1024).toFixed(1)} KB • PDF` 
                      : "Upload your resume in PDF format (max 5MB)"}
                  </p>
                </div>
                
                {!file && !uploading && (
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      Select File
                    </Button>
                  </div>
                )}
                
                {file && !uploading && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                    <Button
                      onClick={handleUpload}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {userExists ? 'Update Resume' : 'Upload Resume'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {uploading && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {uploadComplete ? (
                    <div className="rounded-full bg-green-500/20 p-1">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {uploadComplete 
                          ? 'Upload complete!' 
                          : userExists 
                            ? 'Updating resume...' 
                            : 'Uploading resume...'
                        }
                      </span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full bg-green-500"
                        initial={{ width: "0%" }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </div>
                
                {uploadComplete && (
                  <div className="text-center text-green-500 font-medium animate-pulse">
                    <ArrowRight className="h-4 w-4 inline mr-1" />
                    Redirecting to confirmation page...
                  </div>
                )}
              </div>
            )}
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">What happens next?</h3>
              <ul className="space-y-2">
                <li className="flex gap-2 text-sm">
                  <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">1</span>
                  </div>
                  <span>We&apos;ll extract skills, experience, and achievements from your resume</span>
                </li>
                <li className="flex gap-2 text-sm">
                  <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">2</span>
                  </div>
                  <span>You&apos;ll be able to review and edit the extracted information</span>
                </li>
                <li className="flex gap-2 text-sm">
                  <div className="rounded-full bg-muted w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs">3</span>
                  </div>
                  <span>
                    {userExists 
                      ? 'Your existing profile will be updated with the new information'
                      : 'Once confirmed, your new profile will be created'
                    }
                  </span>
                </li>
              </ul>
            </div>

            {userExists && existingResumeCount > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Resume Version Management</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You can store up to 4 resume versions</li>
                  <li>• Each version is saved with your username and upload date</li>
                  <li>• Oldest versions are automatically deleted when limit is reached</li>
                  <li>• You can manage your versions from your profile page</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}