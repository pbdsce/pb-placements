import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, PDFName } from 'pdf-lib';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

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
    start_date: string;
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
 * Extracts text content from a PDF using pdf-parse
 * @param pdfBuffer PDF file buffer
 * @returns Promise with extracted text and links
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<{ text: string; links: string[] }> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(Buffer.from(pdfBuffer));
    const extractedText = pdfData.text;
    const extractedLinks = await extractLinksFromPDF(pdfBuffer);
    return {
      text: extractedText,
      links: extractedLinks
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
 * Uses Gemini API to analyze the resume text and extract relevant information
 */
export async function analyzeWithGemini(text: string, extractedLinks: string[] = []): Promise<ParsedResumeData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Analyze this resume text and the following array of extracted links, and extract the following information in JSON format:
    1. Full name
    2. Email address
    3. A list of technical skills and technologies [Here First find the skills section from the resume. If its not present keep it empty]
    4. The primary domain/field analyse it effectively after analysing the skillset (e.g., Frontend Development,cybersecurity,backend development,devops,Data Science etc)
    5. Graduation year (YYYY format)
    6. A list of notable achievements, take it from the achievements section of resume only. [Dont put any dates for achievements]
    7. Work experiences take it from the experience section of the resume (including company name, role, description, start date, end date, and if it's current)
    8. Certifications take it from the certifications section of the resume (including certification name, issuing organization)
    9. Projects: take it from the projects section of the resume (including project name, description, and link if present)
    10. GitHub URL if present (choose the correct one from the extracted links array, do not guess)
    11. LinkedIn URL if present (choose the correct one from the extracted links array, do not guess)

    Resume text:
    ${text}

    Extracted links:
    ${JSON.stringify(extractedLinks)}

    Return ONLY a raw JSON object with these exact keys (no markdown formatting, no code blocks):
    {
      "name": "full name",
      "email": "email address",
      "skills": ["skill1", "skill2"],
      "domain": "domain name",
      "graduation_year": YYYY or null,
      "achievements": ["achievement1", "achievement2"],
      "experiences": [
        {
          "company": "company name",
          "role": "job title",
          "description": "job description",
          "start_date": "YYYY-MM-DD",
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
          "description": "project description",
          "link": "project link or null"
        }
      ],
      "github_url": "github profile url or null",
      "linkedin_url": "linkedin profile url or null"
    }
  `;

  return retryWithDelay(async () => {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonStr = response.text().replace(/```json\n?|\n?```/g, '').trim();
    
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
      
      return {
        name: parsed.name || '',
        email: parsed.email || '',
        skills: parsed.skills || [],
        domain: parsed.domain,
        achievements: (parsed.achievements || []),
        experiences: (parsed.experiences || []),
        certifications: (parsed.certifications || []),
        projects: (parsed.projects || []),
        github_url: parsed.github_url,
        linkedin_url: parsed.linkedin_url,
        extracted_links: extractedLinks
      };
    } catch (e) {
      throw new Error('Failed to parse Gemini response: ' + e);
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
    const parsedData = await analyzeWithGemini(text);
    await updateUserProfile(userId, parsedData.skills);
    return parsedData;
  } catch (error) {
    console.error('Error in parseResumeText:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
