"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/authStore";
import { supabase } from "@/lib/supabaseClient";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      toast({
        title: "Almost there!",
        description: "Click the link in your email to complete sign-in.",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/email-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: "http://localhost:3000",
        },
      });

      if (error) throw new Error(error.message);

      setLinkSent(true);
      toast({
        title: "Verification link sent!",
        className: "bg-green-600 text-white",
      });
    } catch (error: any) {
      toast({
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 pb-20">
      <div className="w-full max-w-lg">
        <Card className="py-10 px-8">
          <CardHeader>
            <CardTitle>Email Link Sign-In</CardTitle>
            <CardDescription>
              Get a secure magic link in your inbox to sign in
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={loading || linkSent}
              >
                {loading
                  ? "Sending..."
                  : linkSent
                  ? "Link Sent"
                  : "Send Sign-In Link"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 pb-20">
      <div className="w-full max-w-lg">
        <Card className="py-10 px-8">
          <CardHeader>
            <CardTitle>Email Link Sign-In</CardTitle>
            <CardDescription>
              Get a secure magic link in your inbox to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full bg-green-500 hover:bg-green-600"
              disabled
            >
              Loading...
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function SignInWithLink() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}