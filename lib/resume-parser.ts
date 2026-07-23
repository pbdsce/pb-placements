import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, PDFName } from 'pdf-lib';

// Initialize Mistral AI
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || '' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface ParsedResumeData {
  name: string;
  email: string;
  skills: string[];
  domain?: string;
  year?: number;
  achievements: string[];
  experiences: {
    company: string;
    role: string;
    description: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
  }[];
  certifications: {
    name: string;
    issuing_organization?: string;
  }[];
  projects: {
    name: string;
    description: string;
    link?: string;
  }[];
  github_url?: string;
  linkedin_url?: string;
  resume_url?: string;
  extracted_links?: string[];
}

/**
 * Extracts embedded links from a PDF using pdf-lib
 * @param pdfBuffer PDF file buffer
 * @returns Promise with array of extracted URLs
 */
export async function extractLinksFromPDF(pdfBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const extractedLinks: string[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
             
      try {
        // Get the page's annotation array
        const pageDict = page.node;
        const annotations = pageDict.lookup(PDFName.of('Annots'));
                
        if (annotations) {
          // Handle PDFArray of references
          let annotationArray: any[] = [];
          
          if (annotations && typeof annotations === 'object' && 'array' in annotations) {
            // This is a PDFArray with references
            const pdfArray = annotations as { array: any[] };

            for (const ref of pdfArray.array) {
              // Resolve the reference to get the actual annotation object
              const annotation = pdfDoc.context.lookup(ref);
              if (annotation) {
                annotationArray.push(annotation);
              }
            }
          } else if (Array.isArray(annotations)) {
            annotationArray = annotations;
          } else {
            annotationArray = [annotations];
          }
          
          for (let j = 0; j < annotationArray.length; j++) {
            const annotation = annotationArray[j];
            
            if (annotation && typeof annotation === 'object') {
              // Get the annotation subtype
              let subtype: string | undefined;
              
              if (annotation.dict) {
                // This is a PDFDict object
                const subtypeObj = annotation.dict.get(PDFName.of('Subtype'));
                subtype = subtypeObj?.decodeText?.() || subtypeObj?.toString();
              } else if (annotation.lookup) {
                // This is a PDFObject with lookup method
                const subtypeObj = annotation.lookup(PDFName.of('Subtype'));
                subtype = subtypeObj?.decodeText?.() || subtypeObj?.toString();
              }
              
              // Check if it's a link annotation
              if (subtype === 'Link' || subtype === '/Link') {
                // Get the action dictionary
                let uri: string | undefined;
                
                if (annotation.dict) {
                  const action = annotation.dict.get(PDFName.of('A'));
                  if (action && action.dict) {
                    const uriObj = action.dict.get(PDFName.of('URI'));
                    uri = uriObj?.decodeText?.() || uriObj?.toString();
                  }
                } else if (annotation.lookup) {
                  const action = annotation.lookup(PDFName.of('A'));
                  if (action && typeof action === 'object') {
                    const uriObj = action.lookup(PDFName.of('URI'));
                    uri = uriObj?.decodeText?.() || uriObj?.toString();
                  }
                }
                if (uri && typeof uri === 'string') {
                  if (!extractedLinks.includes(uri)) {
                    extractedLinks.push(uri);
                  }
                }
              }
            }
          }
        }
      } catch (pageError) {
        console.warn(`Error processing page ${i + 1}:`, pageError);
      }
    }

    return extractedLinks;
  } catch (error) {
    console.error('Error extracting links from PDF:', error);
    return [];
  }
}

/**
 * Renders a single PDF.js page to text, inlining any hyperlink URL right
 * after the text it's attached to (e.g. "My Pull Requests (https://...)").
 * This lets link-bearing bullet points survive into the plain-text pipeline
 * instead of losing the URL and keeping only the anchor text.
 *
 * Falls back to plain text-only rendering (no link matching) if the
 * annotation/position APIs aren't available or throw for any reason.
 */
async function renderPageWithInlineLinks(pageData: any, collectedLinks: string[]): Promise<string> {
  try {
    const [annotations, textContent] = await Promise.all([
      pageData.getAnnotations(),
      pageData.getTextContent(),
    ]);

    const linkAnnotations = (annotations || []).filter(
      (a: any) => a?.subtype === 'Link' && typeof a?.url === 'string' && a.url.length > 0
    );

    if (linkAnnotations.length === 0) {
      // No links on this page — just join the text plainly.
      return (textContent.items || []).map((item: any) => item.str).join(' ');
    }

    let pageText = '';
    let lastY: number | null = null;
    let lastMatchedUrl: string | null = null;

    for (const item of textContent.items || []) {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x0 = transform[4];
      const y0 = transform[5];
      const width = typeof item.width === 'number' ? item.width : 0;
      const height = Math.abs(transform[3]) || 10;
      const x1 = x0 + width;
      const y1 = y0 + height;

      // Rough line-break detection based on vertical position changes
      if (lastY !== null && Math.abs(y0 - lastY) > 2) {
        pageText += '\n';
        lastMatchedUrl = null; // don't carry a match across lines
      }

      pageText += item.str;

      // Find a link annotation whose rect overlaps this text item's box
      const matched = linkAnnotations.find((ann: any) => {
        const rect = ann.rect;
        if (!Array.isArray(rect) || rect.length < 4) return false;
        const [ax0, ay0, ax1, ay1] = rect;
        const overlapX = x0 < ax1 && x1 > ax0;
        const overlapY = y0 < ay1 && y1 > ay0;
        return overlapX && overlapY;
      });

      if (matched && matched.url !== lastMatchedUrl) {
        // Only append once per contiguous run of the same link, so a
        // multi-word anchor ("My Pull Requests") doesn't repeat the URL
        // after every word.
        pageText += ` (${matched.url})`;
        if (!collectedLinks.includes(matched.url)) {
          collectedLinks.push(matched.url);
        }
        lastMatchedUrl = matched.url;
      } else if (!matched) {
        lastMatchedUrl = null;
      }

      pageText += ' ';
      lastY = y0;
    }

    return pageText;
  } catch (renderError) {
    console.warn('Falling back to plain text render for page (link matching failed):', renderError);
    try {
      const textContent = await pageData.getTextContent();
      return (textContent.items || []).map((item: any) => item.str).join(' ');
    } catch (fallbackError) {
      console.warn('Plain text fallback also failed for page:', fallbackError);
      return '';
    }
  }
}

/**
 * Extracts text content from a PDF using pdf-parse, inlining hyperlink URLs
 * into the text next to their anchor text, and returns both the text and a
 * de-duplicated list of every link found (position-matched + fallback scan).
 * @param pdfBuffer PDF file buffer
 * @returns Promise with extracted text and links
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<{ text: string; links: string[] }> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const collectedLinks: string[] = [];

    const pdfData = await pdfParse(Buffer.from(pdfBuffer), {
      pagerender: (pageData: any) => renderPageWithInlineLinks(pageData, collectedLinks),
    });

    const extractedText = await cleanTextWithAI(pdfData.text);

    // Merge in the annotation-only scan as a fallback, in case the
    // position-based matching above missed a link on some page.
    const fallbackLinks = await extractLinksFromPDF(pdfBuffer);
    for (const link of fallbackLinks) {
      if (!collectedLinks.includes(link)) {
        collectedLinks.push(link);
      }
    }

    return {
      text: extractedText,
      links: collectedLinks
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Utility function to retry API calls with simple fixed delay
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param delay Delay in milliseconds between retries
 * @returns Promise with the result of the function
 */
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 3000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit or overload error
      const isRetryableError =
        error instanceof Error && (
          error.message.includes('overloaded') ||
          error.message.includes('rate limit') ||
          error.message.includes('503') ||
          error.message.includes('429') ||
          error.message.includes('quota exceeded')
        );

      if (attempt === maxRetries || !isRetryableError) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Uses Mistral to add spacing to concatenated text
 */
async function cleanTextWithAI(text: string): Promise<string> {
  return retryWithDelay(async () => {
    const prompt = `
     Fix this resume text with strict requirements:
     SECTION IDENTIFICATION:
        - Lines starting with "Description", "Experience", etc. are section headers
        - ALL lines in Description section must start with bullet points
        - Only text after a blank line following section headers can be bullet points

     1. BULLET POINTS (•, *, -):
        - NEVER split any bullet point across lines
        - Combine any bullet fragments into complete single-line bullets
        - Preserve the original bullet character (•, *, or -)
        - Only fix spacing BETWEEN words, never within proper nouns/technical terms
        - If the first point in regular text does not start with a bullet, add a bullet point at the start of the first line.
        - If a bullet point is missing a bullet character, add it at the start of the line.
        - ALL the points under DESCRIPTION should START with a BULLET character.

     2. LINE BREAKS:
        - Remove ALL mid-sentence line breaks
        - Keep exactly one line break between distinct bullet points
        - Keep exactly two line breaks between sections

     3. SPACING:
        - Add missing spaces between words ("ImplementedAES-200" → "Implemented AES-200")
        - Also add a space when a lowercase letter is immediately followed by an uppercase letter in all sections of the resume.
        - Never modify:
          * Technical terms ("RESTful", "CRUD")
          * Proper nouns ("GLibC", "PBKDF2")
          * Numbers/dates ("2000+", "2023-2024")
          * Project names ("ELISA project")

     4. SPECIAL CASES:
        - Preserve all hyphenated terms as-is ("end-to-end")
        - Keep all acronyms intact ("APIs" not "A P Is")
        - Maintain exact company/product names ("Intel/Mobileye")

     5. LINKS:
        - If any text contains a URL inside parentheses, e.g. "My Pull Requests (https://github.com/...)", NEVER remove, alter, reformat, or split that parenthetical URL. Keep it exactly as-is, attached right after the text it follows, on the same bullet line.
        - Do not add spacing inside the URL itself, even if it contains characters like "?" or "&".

     REQUIRED OUTPUT FORMAT:
     - Each bullet point exactly one line
     - Add bullet to first point.
     - No trailing spaces
     - No empty lines between bullets
     - Exactly one blank line between sections

      Examples:
      - "VSCodeand" should become "VSCode and"
      - "developingcross-platform" should become "developing cross-platform"
      - "Serverusing" should become "Server using"

      Text to fix:
      ${text}

      Return only the corrected text with proper spacing, no additional commentary.
      `;

    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
    });
    const response = result.choices?.[0]?.message?.content as string ?? ''
    return response.trim();
  }, 3, 3000).catch((error) => {
    console.error('Error cleaning text with AI:', error);
    return text;
  });
}
/**
 * Uses Mistral API to analyze the resume text and extract relevant information
 */
export async function analyzeWithMistral(text: string, extractedLinks: string[] = []): Promise<ParsedResumeData> {
  const prompt = `
    You are a strict parsing engine. Analyze this resume text and the following array of extracted links, and extract the following information in strict JSON format.

    CRITICAL BOUNDARY RULES:
    - "achievements": Look ONLY under explicit headings like "Achievements", "Awards", "Honors", "Extracurricular" or "Accomplishments". Items here MUST be structured as single-line bulleted milestones or honors (e.g., "Meta Hacker Cup Global Rank 1654", "CodeForces Expert"). If a milestone (like GSoC or LFX) is formatted as a full structural role with multiple descriptive work bullet points, do NOT put it here—it belongs strictly in "experiences". If no dedicated achievements heading or single-line honors exist, return an empty array [].
    - "experiences": Look under "Experience", "Work History", "Employment", OR "Open Source"/"Open Source Contributions".
      * Open Source bullet points name the specific project/organization contributed to, and can appear in several formats, not just one: "ProjectName | short description | contribution stat" (e.g. "RustPython | Python Interpreter in Rust | 8 merged"), OR "OrgName - description" (e.g. "DeepChem - Added the DNABERT-2 model wrapper to DeepChem's infrastructure, along with tests for the integration"), OR any other separator such as ":" or "–" between a bolded org/project name and its description. In every one of these formats, the token before the separator is the project/org name and goes in "company"; everything after the separator is the description.
      * If MULTIPLE open-source bullet points name the SAME project/org (e.g. two separate bullets both starting with "DeepChem -"), merge them into a SINGLE experience entry for that org — combine all of that org's bullets into that one entry's "description" (each bullet still on its own line per LINE BREAK PRESERVATION). Do NOT create duplicate experience entries for the same org.
      * Only when an open-source bullet point genuinely does NOT name any specific project or organization, default the "company" to "Open Source Contributions" and the "role" to "Open Source Contributor".
      * Set "role" to "Open Source Contributor" for all open-source entries regardless of whether a specific project name was found, unless the resume explicitly states a different role/title for that contribution.
      * MENTORSHIP-STYLE ENTRIES: Some entries are formatted as a bold program/heading name on its own line (e.g. "Google Summer of Code", "LFX Mentorship", "MLH Fellowship") followed by an italic or plain line like "{Role} at {Org}: {skills/tools list}" (e.g. "Mentee at Invesalius: Python, VTK, wxPython, NumPy, PyTorch, ONNX"). For these:
        - "company" = the organization named after "at" (e.g. "Invesalius"), NOT the program name.
        - "role" = the bold program/heading name combined with the role word from the second line, e.g. "Google Summer of Code Mentee", NOT just "Mentee" alone.
        - "description" = the remaining text after the colon (the skills/tools list), or any bullet points under that entry.
        - Do NOT drop the program name just because it sits on its own heading line separate from the "{Role} at {Org}" line directly below it — always fold it into "role".
      * Open-source entries frequently have NO explicit dates listed at all (unlike a formal "GSoC" or "LFX Mentorship" role which usually does have dates). When no date is given for a specific open-source entry, set "start_date" to null, "end_date" to null, and "is_current" to false. Do NOT guess, infer, or reuse a date from a different entry.
      * This section MUST be represented as one or more experience entries, never dropped or merged elsewhere.
      * CRITICAL: Do NOT include campus leadership, club memberships, volunteering, or "Positions of Responsibility" (like coding club members, college fest volunteers, or student society roles) in this experiences array.
      * If no formal employment or open-source history exists, return an empty array [].
    - "projects": Look ONLY under "Projects" or "Academic Projects".

    COMPANY NAME EXTRACTION (applies to "company" in "experiences"):
    - Extract ONLY the actual organization/company/project name (e.g., "PrepAiro", "RustPython", "DeepChem").
    - Do NOT append or merge work-mode, employment-type, or location qualifiers into the company name — this includes words like "Remote", "Hybrid", "On-site", "Onsite", "In-office", "Full-time", "Part-time", "Internship", or city/country names.
    - If the resume shows these next to the company name (e.g., "PrepAiro — Hybrid", "PrepAiro (Remote)", "PrepAiro | Bengaluru | Hybrid"), strip them entirely and keep only the clean company name, e.g. "PrepAiro".
    - For open-source entries specifically, do not strip the project/org name itself thinking it's a qualifier — "RustPython" in "RustPython | Python Interpreter in Rust | 8 merged", or "DeepChem" in "DeepChem - Added the DNABERT-2 model wrapper...", is the company/project name, not a mode/location word, and must be kept as the company.

    LINE BREAK PRESERVATION (applies to "description" in both "experiences" and "projects"):
    - The source text uses bullet characters (•, *, -) to separate distinct points. Preserve that structure.
    - Join each distinct bullet point with a literal "\\n" newline character inside the JSON string value, in the same order they appear in the resume. Do NOT collapse multiple bullets into one run-on sentence or paragraph.
    - Keep each bullet's own text on its own line; do not add a bullet character yourself, just separate the lines with "\\n".
    - If a description in the source is a single paragraph with no bullets, return it as a single line with no "\\n".
    - Never insert "\\n" in the middle of a single bullet/sentence — only between distinct bullet points.
    - This rule applies equally to project descriptions — do NOT flatten multi-bullet project descriptions into one paragraph.

    INLINE LINK PRESERVATION (applies to "description" in both "experiences" and "projects"):
    - Some bullet points contain a URL in parentheses immediately after some anchor text, e.g. "All merged pull requests: My Pull Requests (https://github.com/pulls?q=...)".
    - You MUST keep that URL exactly as-is, in place, as part of the bullet's text in the description field. Do NOT drop it, summarize it away, or move it out of the bullet.
    - Only pull a URL out into "github_url" or "linkedin_url" if it is actually a github.com or linkedin.com profile/account URL matching those specific fields — a project or PR link (e.g. a github.com/pulls or github.com/<user>/<repo> link, or any other site) stays inline in the description, it does NOT get assigned to github_url.
    - Do not invent or guess a URL that isn't present in the source text.

    Fields to extract:
    1. Full name
    2. Email address
    3. A list of technical skills and technologies [First find the skills section from the resume. If its not present keep it empty]
    4. The primary domain/field analyse it effectively after analysing the skillset (e.g., Frontend Development, cybersecurity, backend development, devops, Data Science etc)
    5. Graduation year (YYYY format)
    6. A list of notable achievements. ONLY extract from a section explicitly labeled "Achievements", "Awards", "Honors", "Extracurricular" or "Accomplishments" in the resume. If no such section exists or no achievements are explicitly listed under it, return an empty array []. Do NOT extract from projects, experiences, or certifications sections. Do NOT infer, guess, or hallucinate achievements. [Dont put any dates for achievements]
    7. Work experiences take it from the experience section of the resume (including company name, role, description, start date, end date, and if it's current). Follow the COMPANY NAME EXTRACTION, LINE BREAK PRESERVATION, and INLINE LINK PRESERVATION rules. Each distinct open-source project/org counts as its own separate experience (merging same-org bullets into one entry per the "experiences" rule above), and may have null start/end dates if none are given.
    8. Certifications take it from the certifications section of the resume (including certification name, issuing organization)
    9. Projects: take it from the projects section of the resume (including project name, description, and link if present). Follow the LINE BREAK PRESERVATION and INLINE LINK PRESERVATION rules for description.
    10. GitHub URL if present (choose the correct one from the extracted links array, do not guess)
    11. LinkedIn URL if present (choose the correct one from the extracted links array, do not guess)

    Resume text:
    ${text}

    Extracted links:
    ${JSON.stringify(extractedLinks)}

    Return ONLY a raw JSON object with these exact keys (no markdown formatting, no code blocks). Remember: "company" must be a clean name with no mode/location qualifiers (but DO keep a specific open-source project/org name as the company when one is given, and merge repeated bullets for the same org into one entry), description fields must use literal "\\n" characters between bullet points, properly escaped as valid JSON string content, any inline "(https://...)" URL found in the source text must be preserved verbatim inside the relevant bullet in the description, and start_date/end_date may be null when the resume gives no date for that entry.
    {
      "name": "full name",
      "email": "email address",
      "skills": ["skill1", "skill2"],
      "domain": "domain name",
      "graduation_year": YYYY or null,
      "achievements": [], 
      "experiences": [
        {
          "company": "clean company or open-source project/org name, e.g. PrepAiro, RustPython, or DeepChem",
          "role": "job title or Open Source Contributor",
          "description": "bullet one\\nbullet two with a link (https://example.com)\\nbullet three",
          "start_date": "YYYY-MM-DD or null",
          "end_date": "YYYY-MM-DD or null",
          "is_current": boolean
        }
      ],
      "certifications": [
        {
          "name": "certification name",
          "issuing_organization": "issuing organization"
        }
      ],
      "projects": [
        {
          "name": "project name",
          "description": "bullet one\\nbullet two",
          "link": "project link or null"
        }
      ],
      "github_url": "github profile url or null",
      "linkedin_url": "linkedin profile url or null"
    }
  `;

  return retryWithDelay(async () => {
    const result = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
    });
    const response = result.choices?.[0]?.message?.content as string ?? ''
    const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const parsed = JSON.parse(jsonStr);

      // Calculate year of study based on graduation year
      let yearOfStudy: number | undefined;
      if (parsed.graduation_year) {
        const currentYear = new Date().getFullYear();
        const yearsRemaining = parsed.graduation_year - currentYear;
        if (yearsRemaining >= 1 && yearsRemaining <= 4) {
          yearOfStudy = yearsRemaining;
        }
      }

     // Normalize description line breaks, ensure each line ends with a period,
      // and prefix each line with a bullet character for display
      const normalizeDescription = (desc: string | undefined | null): string => {
        if (!desc) return '';
        return desc
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map(line => {
            let trimmed = line.trim();
            if (!trimmed) return trimmed;

            // Strip any bullet character the model may have already added,
            // so we don't end up with double bullets like "• • text"
            trimmed = trimmed.replace(/^[•*\-]\s*/, '');

            // If the line ends with a URL in parentheses, add the period
            // BEFORE the parenthetical rather than after it
            const urlTrailingMatch = trimmed.match(/^(.*\S)(\s*\((https?:\/\/[^\s)]+)\))$/);
            if (urlTrailingMatch) {
              const [, mainText, , url] = urlTrailingMatch;
              const punctuated = /[.!?:;]$/.test(mainText) ? mainText : `${mainText}.`;
              return `• ${punctuated} (${url})`;
            }

            // Add a period if the line doesn't already end with terminal punctuation
            const punctuated = /[.!?:;]$/.test(trimmed) ? trimmed : `${trimmed}.`;
            return `• ${punctuated}`;
          })
          .filter(line => line.length > 0)
          .join('\n')
          .trim();
      };

      // Strip any work-mode / location qualifiers that slipped into the
      // company name (e.g. "PrepAiro Hybrid", "PrepAiro - Remote", "PrepAiro (Onsite)").
      // Deliberately does NOT touch a project/org name like "RustPython" or
      // "DeepChem" since those don't match any of the mode/location keywords below.
      const normalizeCompany = (company: string | undefined | null): string => {
        if (!company) return '';
        return company
          .replace(
            /\s*[-–—|,(]*\s*(remote|hybrid|on[\s-]?site|onsite|in[\s-]?office|work\s+from\s+home|wfh|full[\s-]?time|part[\s-]?time)\)?\s*$/gi,
            ''
          )
          .trim();
      };

      // Merge duplicate experience entries that share the same normalized
      // company name (e.g. two separate "DeepChem - ..." open-source bullets)
      // into one entry, combining their descriptions.
      const mergeDuplicateCompanies = (
        exps: { company: string; role: string; description: string; start_date: string | null; end_date: string | null; is_current: boolean }[]
      ) => {
        const merged: typeof exps = [];
        const indexByCompany = new Map<string, number>();

        for (const exp of exps) {
          const key = (exp.company || '').trim().toLowerCase();
          if (key && indexByCompany.has(key)) {
            const existingIndex = indexByCompany.get(key)!;
            const existing = merged[existingIndex];
            const combinedDescription = [existing.description, exp.description]
              .filter(Boolean)
              .join('\n');
            merged[existingIndex] = {
              ...existing,
              description: combinedDescription,
              // Prefer whichever entry actually has dates, if either does
              start_date: existing.start_date ?? exp.start_date,
              end_date: existing.end_date ?? exp.end_date,
              is_current: existing.is_current || exp.is_current,
            };
          } else {
            merged.push(exp);
            if (key) {
              indexByCompany.set(key, merged.length - 1);
            }
          }
        }

        return merged;
      };

      const rawExperiences = (parsed.experiences || []).map((exp: any) => ({
        ...exp,
        company: normalizeCompany(exp.company),
        description: normalizeDescription(exp.description),
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
      }));

      const experiences = mergeDuplicateCompanies(rawExperiences);

      const projects = (parsed.projects || []).map((proj: any) => ({
        ...proj,
        description: normalizeDescription(proj.description),
      }));

      return {
        name: parsed.name || '',
        email: parsed.email || '',
        skills: parsed.skills || [],
        domain: parsed.domain,
        year: yearOfStudy,
        achievements: (parsed.achievements || []),
        experiences,
        certifications: (parsed.certifications || []),
        projects,
        github_url: parsed.github_url,
        linkedin_url: parsed.linkedin_url,
        extracted_links: extractedLinks
      };
    } catch (e) {
      throw new Error('Failed to parse Mistral response: ' + e);
    }
  }, 3, 3000); // 3 retries with 3 second base delay
}

/**
 * Updates user profile in Supabase with extracted skills
 */
async function updateUserProfile(userId: string, skills: string[]): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required for profile update');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ skills })
      .eq('id', userId)
      .select();
    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateUserProfile:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Parses the extracted text to identify skills, domain, year, and achievements
 */
export async function parseResumeText(text: string, userId: string): Promise<ParsedResumeData> {
  if (!userId) {
    throw new Error('User ID is required for resume parsing');
  }

  try {
    const cleanedText = await cleanTextWithAI(text);
    const parsedData = await analyzeWithMistral(cleanedText);
    await updateUserProfile(userId, parsedData.skills);
    return parsedData;
  } catch (error) {
    console.error('Error in parseResumeText:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}