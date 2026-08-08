"use client";

import { useState } from "react";
import { Check, Download, Mail, Save, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ExportActionsProps {
  selectedMembers: Member[];
  clearSelections: () => void;
}

export function ExportActions({ selectedMembers, clearSelections }: ExportActionsProps) {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Point Blank Developer Profiles");
  const [emailBody, setEmailBody] = useState("");
  const [copied, setCopied] = useState(false);
  
  if (selectedMembers.length === 0) {
    return null;
  }
  
  const handleExportPDF = async () => {
    try {
      const response = await fetch("/careers/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberIds: selectedMembers.map(m => m.id) }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "point-blank-profiles.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Exported ${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''} to PDF`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting the profiles. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleExportJSON = async () => {
    try {
      const response = await fetch("/careers/api/export/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberIds: selectedMembers.map(m => m.id) }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate JSON");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = "point-blank-profiles.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Exported ${selectedMembers.length} profile${selectedMembers.length > 1 ? 's' : ''} to JSON`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting the profiles. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleCopyEmails = () => {
    const emails = selectedMembers.map(member => member.email).join(", ");
    navigator.clipboard.writeText(emails);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Emails copied",
      description: `Copied ${selectedMembers.length} email${selectedMembers.length > 1 ? 's' : ''} to clipboard`,
    });
  };
  
  const handleSendEmail = async () => {
    try {
      await fetch("/careers/api/export/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberIds: selectedMembers.map(m => m.id),
          subject: emailSubject,
          body: emailBody,
        }),
      });
      
      setEmailDialogOpen(false);
      
      toast({
        title: "Email sent",
        description: `Email sent to ${selectedMembers.length} developer${selectedMembers.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: "Email failed",
        description: "There was an error sending the email. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background border rounded-full shadow-lg p-2 flex items-center gap-2">
      <span className="text-sm font-medium ml-2">
        {selectedMembers.length} selected
      </span>
      
      <Button variant="ghost" size="icon" onClick={clearSelections}>
        <X className="h-4 w-4" />
      </Button>
      
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to Developers</DialogTitle>
            <DialogDescription>
              Compose an email to send to the selected developers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients</Label>
              <div className="p-2 border rounded-md bg-muted/50 text-sm">
                {selectedMembers.map(member => member.email).join(", ")}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Enter your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full"
        onClick={handleCopyEmails}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2 text-green-500" />
        ) : (
          <Mail className="h-4 w-4 mr-2" />
        )}
        Copy Emails
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-full bg-green-500 hover:bg-green-600">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportPDF}>
            <Save className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            <Share2 className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}