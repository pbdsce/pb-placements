"use client";

import { useState } from "react";
import { Download, Mail, Share2, Mailbox } from "lucide-react";
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

interface ExportProfileButtonProps {
  memberId: string;
  memberName: string;
  memberEmail: string;
}


export function ExportProfileButton({ memberId, memberName, memberEmail }: ExportProfileButtonProps) {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`${memberName}'s Profile from Point Blank`);
  const [emailBody, setEmailBody] = useState("");
  
 const handleExportPDF = async () => {
  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, memberName }),
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.resumeUrl) {
      throw new Error(data.message || 'Failed to generate resume download');
    }

    const fileRes = await fetch(data.resumeUrl);
    const blob = await fileRes.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = data.filename;
    link.click();
  } catch (err) {
    console.error('Resume download failed:', err);
    alert('Failed to download resume.');
  }
};


  const handleCopyEmail = () => {
    navigator.clipboard.writeText(memberEmail);
    
    toast({
      title: "Email copied",
      description: `${memberEmail} copied to clipboard`,
    });
  };

  const handleExportToMail = async () => {
try {
  const res = await fetch('/api/export/email', {
    method: 'POST',
    body: JSON.stringify({
      memberId,
      memberName,
      memberEmail,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API responded with status ${res.status}: ${errorText}`);
    alert('Failed to generate email draft. Please try again later.');
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch (jsonError) {
    console.error('Failed to parse JSON from response:', jsonError);
    alert('Unexpected server response. Please try again.');
    return;
  }

  if (data.success) {
    window.open(data.gmailDraftURL, '_blank');

    if (data.resumeBase64 && data.filename) {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.resumeBase64}`;
      link.download = data.filename;
      link.click();
    } else {
      console.warn('Resume data missing in response.');
    }
  } else {
    console.warn('API returned success: false', data.message);
    alert(data.message || 'Something went wrong.');
  }
} catch (err) {
  console.error('Request failed:', err);
  alert('Could not contact server. Please check your network and try again.');
}


};
  
  const handleSendEmail = async () => {
  try {
    const res = await fetch("/api/sendmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        memberName,
        memberEmail,
      }),
    });

    const data = await res.json();

    if (data.success && data.gmailDraftURL) {
      window.open(data.gmailDraftURL, "_blank");

      toast({
        title: "Draft ready",
        description: `Gmail draft prepared for ${memberName}`,
      });
    } else {
      toast({
        title: "Failed to create draft",
        description: data.message || "Unexpected error occurred",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Error generating Gmail draft:", error);
    toast({
      title: "Error",
      description: "Could not generate Gmail draft. Please try again.",
      variant: "destructive",
    });
  }
};

  
  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${memberName}'s Developer Profile`,
        text: `Check out ${memberName}'s developer profile on Point Blank`,
        url: window.location.href,
      })
      .then(() => {
        toast({
          title: "Shared successfully",
          description: "Profile has been shared",
        });
      })
      .catch(() => {
        // User cancelled the share operation
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      
      toast({
        title: "Link copied",
        description: "Profile link copied to clipboard",
      });
    }
  };
  
  return (
    <div className="flex flex-col lg:flex-row items-center gap-2 w-full sm:w-auto">
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <Button onClick={handleSendEmail} className="bg-green-500 hover:bg-green-600 gap-2">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600 gap-2">
              <Download className="h-4 w-4" />
              Export Profile
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportToMail}>
              <Mailbox className="h-4 w-4 mr-2"/>
              Export to Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleShareProfile}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to {memberName}</DialogTitle>
            <DialogDescription>
              Compose an email to send to this developer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                value={memberEmail}
                readOnly
                disabled
              />
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
    </div>
  );
}