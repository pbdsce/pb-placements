import Link from "next/link";
import { Code2, Github, Linkedin, Mail, Twitter } from "lucide-react";
import Logo from "../ui/logo"; 

export function Footer() {
  return (
    <footer className="border-t bg-background/95">
      <div className="px-8 py-12 md:py-16 w-screen-md">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 w-full">
          {/* Brand Section */}
          <div className="flex flex-col gap-4">
            <div className="shrink-0 mr-4">
                        <Logo />
                      </div>
            <p className="text-sm text-muted-foreground">
              Connecting student developers with opportunities. Your gateway to tech talent.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/pbdsce"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link
                href="https://www.linkedin.com/company/point-blank-d/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
              <Link
                href="https://x.com/pointblank_club"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/directory"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Directory
              </Link>
              <Link
                href="/auth/email-link-sign-in"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              {/* <Link
                href="/auth/sign-up"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Up
              </Link> */}
            </nav>
          </div>

          {/* Resources
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/docs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </nav>
          </div> */}

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="mailto:careers@pointblank.club"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                careers@pointblank.club
              </Link>
              <p className="text-sm text-muted-foreground">
                Have questions? We&apos;re here to help.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Point Blank. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}