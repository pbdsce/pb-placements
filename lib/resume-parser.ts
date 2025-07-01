import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

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
  github_url?: string;
  linkedin_url?: string;
  resume_url?: string;
  resume_filename?: string;
}

/**
 * Extracts text content from a PDF using pdf-parse
 * @param pdfBuffer PDF file buffer
 * @returns Promise with extracted text
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(Buffer.from(pdfBuffer));
    console.log('Extracted PDF text:', pdfData.text);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * 
 * Uses Gemini API to analyze the resume text and extract relevant information
 */
export async function analyzeWithGemini(text: string): Promise<ParsedResumeData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Analyze this resume text and extract the following information in JSON format:
    1. Full name
    2. Email address
    3. A list of technical skills and technologies [Here First find the skills section from the resume. If its not present keep it empty]
    4. The primary domain/field (e.g., Frontend Development, Data Science)
    5. Graduation year (YYYY format)
    6. A list of notable achievements [Dont put any dates for achievements]
    7. Work experiences (including company name, role, description, start date, end date, and if it's current)
    8. GitHub URL if present
    9. LinkedIn URL if present must be like [https://linkedin.com/in/username]

    Resume text:
    ${text}

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
      "github_url": "github profile url or null",
      "linkedin_url": "linkedin profile url or null"
    }
  `;

  console.log('Sending to Gemini:', prompt);
  const result = await model.generateContent(prompt);
  const response = result.response;
  const jsonStr = response.text().replace(/```json\n?|\n?```/g, '').trim();
  console.log('Gemini response:', jsonStr);
  
  try {
    const parsed = JSON.parse(jsonStr);
    console.log('Parsed response:', parsed);

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
      year: yearOfStudy,
      achievements: parsed.achievements || [],
      experiences: parsed.experiences || [],
      github_url: parsed.github_url,
      linkedin_url: parsed.linkedin_url
    };
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return {
      name: '',
      email: '',
      skills: [],
      domain: undefined,
      year: undefined,
      achievements: [],
      experiences: [],
      github_url: undefined,
      linkedin_url: undefined
    };
  }
}

/**
 * Updates user profile in Supabase with extracted skills
 */
async function updateUserProfile(userId: string, skills: string[]): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required for profile update');
  }

  try {
    console.log('Updating profile for user:', userId, 'with skills:', skills);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ skills })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint);
      throw error;
    }

    console.log('Profile update successful:', data);
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
    console.log('Successfully parsed resume data:', parsedData);

    await updateUserProfile(userId, parsedData.skills);
    console.log('Successfully updated user profile with skills');

    return parsedData;
  } catch (error) {
    console.error('Error in parseResumeText:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Keep the existing helper functions as fallback
const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'Next.js', 'Nuxt.js', 'Svelte', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind',
  'Bootstrap', 'Material UI', 'Chakra UI', 'GraphQL', 'REST', 'SQL', 'NoSQL',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'AWS', 'Azure', 'GCP', 'Vercel',
  'Netlify', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'GitLab',
  'Bitbucket', 'Jest', 'Mocha', 'Cypress', 'Selenium', 'Redux', 'MobX', 'Zustand',
  'Python', 'Django', 'Flask', 'FastAPI', 'Ruby', 'Rails', 'PHP', 'Laravel',
  'Symfony', 'Java', 'Spring', 'Kotlin', 'Swift', 'Objective-C', 'C#', '.NET',
  'C++', 'C', 'Rust', 'Go', 'Scala', 'Elixir', 'Haskell', 'Clojure', 'Unity',
  'Unreal Engine', 'Flutter', 'React Native', 'Ionic', 'Electron', 'PWA',
  'WebSockets', 'WebRTC', 'Three.js', 'D3.js', 'TensorFlow', 'PyTorch', 'scikit-learn',
  'Pandas', 'NumPy', 'R', 'MATLAB', 'Tableau', 'Power BI', 'Excel', 'Word', 'PowerPoint',
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'After Effects',
  'Premiere Pro', 'Blender', 'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence', 'Trello',
  'Asana', 'Notion', 'Slack', 'Teams', 'Zoom', 'WebEx', 'Google Meet', 'Skype',
  'Linux', 'Windows', 'macOS', 'iOS', 'Android', 'Ubuntu', 'Debian', 'CentOS',
  'Red Hat', 'Bash', 'PowerShell', 'CMD', 'Terminal', 'SSH', 'FTP', 'HTTP', 'HTTPS',
  'TCP/IP', 'DNS', 'DHCP', 'VPN', 'SSL', 'TLS', 'OAuth', 'JWT', 'SAML', 'Auth0',
  'Okta', 'Cognito', 'Firebase Auth', 'Active Directory', 'LDAP', 'SEO', 'SEM',
  'Google Analytics', 'Hotjar', 'Mixpanel', 'Segment', 'Amplitude', 'Optimizely',
  'A/B Testing', 'Web Vitals', 'Lighthouse', 'Webpack', 'Rollup', 'Vite', 'Parcel',
  'Babel', 'ESLint', 'Prettier', 'Husky', 'Lint-Staged', 'Storybook', 'Docz',
  'JSDoc', 'TypeDoc', 'Swagger', 'OpenAPI', 'Postman', 'Insomnia', 'curl', 'wget',
  'Redis', 'Memcached', 'Elasticsearch', 'Kibana', 'Logstash', 'Grafana', 'Prometheus',
  'New Relic', 'Datadog', 'Sentry', 'Bugsnag', 'LogRocket', 'PagerDuty', 'Twilio',
  'SendGrid', 'Mailchimp', 'Stripe', 'PayPal', 'Braintree', 'Square', 'Adyen',
  'WordPress', 'Drupal', 'Magento', 'Shopify', 'WooCommerce', 'BigCommerce',
  'Salesforce', 'HubSpot', 'Marketo', 'Pardot', 'Eloqua', 'Zendesk', 'Intercom',
  'Crisp', 'Drift', 'Algolia', 'Meilisearch', 'WebAssembly', 'WASM', 'Rust', 'WebGL',
];

const DOMAINS = [
  'Web Development', 'Frontend Development', 'Backend Development',
  'Full Stack Development', 'Mobile Development', 'iOS Development',
  'Android Development', 'Cross-Platform Development', 'Game Development',
  'DevOps', 'SRE', 'Cloud Engineering', 'Data Science', 'Machine Learning',
  'Artificial Intelligence', 'Data Engineering', 'Data Analytics',
  'Business Intelligence', 'UI/UX Design', 'Product Design', 'Graphic Design',
  'Product Management', 'Project Management', 'QA Engineering', 'Testing',
  'Security Engineering', 'Cybersecurity', 'Blockchain Development',
  'AR/VR Development', 'Embedded Systems', 'IoT Development',
  'Network Engineering', 'Systems Administration', 'Database Administration',
  'Technical Support', 'Technical Writing'
];

const YEAR_PATTERNS = [
  { pattern: /1st year|first year|freshman/i, year: 1 },
  { pattern: /2nd year|second year|sophomore/i, year: 2 },
  { pattern: /3rd year|third year|junior/i, year: 3 },
  { pattern: /4th year|fourth year|senior/i, year: 4 },
  { pattern: /5th year|fifth year/i, year: 5 },
];

const ACHIEVEMENT_PATTERNS = [
  /(?:won|winner of|awarded|recipient of|selected for|finalist in|placed \d+(?:st|nd|rd|th) in)\s+([^.]+)/gi,
  /(?:hackathon|competition|contest|challenge|award|scholarship|fellowship|grant)\s+([^.]+)/gi,
  /(?:open source contributor|maintainer|creator of)\s+([^.]+)/gi,
  /(?:published|author of|co-authored)\s+([^.]+)/gi,
  /(?:intern|internship|interned)\s+(?:at|with)\s+([^.]+)/gi,
  /(?:gsoc|google summer of code|mlh fellow)/gi,
];

function extractSkills(text: string): string[] {
  const skills: string[] = [];
  const textLower = text.toLowerCase();
  
  for (const skill of COMMON_SKILLS) {
    const skillLower = skill.toLowerCase();
    if (textLower.includes(skillLower)) {
      skills.push(skill);
    }
  }
  
  return Array.from(new Set(skills));
}

function extractDomain(text: string): string | undefined {
  const textLower = text.toLowerCase();
  
  for (const domain of DOMAINS) {
    const domainLower = domain.toLowerCase();
    if (textLower.includes(domainLower)) {
      return domain;
    }
  }
  
  return inferDomainFromSkills(extractSkills(text));
}

function inferDomainFromSkills(skills: string[]): string | undefined {
  const domainSkillMap: Record<string, string[]> = {
    'Frontend Development': [
      'React', 'Vue', 'Angular', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind',
      'Bootstrap', 'Material UI', 'Chakra UI', 'JavaScript', 'TypeScript'
    ],
    'Backend Development': [
      'Node.js', 'Express', 'Django', 'Flask', 'Laravel', 'Spring', 'Ruby on Rails',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST'
    ],
    'Mobile Development': [
      'Swift', 'Objective-C', 'Kotlin', 'Java', 'Flutter', 'React Native',
      'Ionic', 'Android', 'iOS'
    ],
    'Data Science': [
      'Python', 'R', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy',
      'MATLAB', 'Tableau', 'Power BI'
    ],
    'DevOps': [
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'Terraform',
      'Ansible', 'Prometheus', 'Grafana'
    ],
    'UI/UX Design': [
      'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign'
    ],
  };
  
  const domainMatchCounts: Record<string, number> = {};
  
  for (const [domain, domainSkills] of Object.entries(domainSkillMap)) {
    domainMatchCounts[domain] = skills.filter(skill => 
      domainSkills.includes(skill)
    ).length;
  }
  
  let bestMatch: string | undefined;
  let maxMatches = 0;
  
  for (const [domain, count] of Object.entries(domainMatchCounts)) {
    if (count > maxMatches) {
      maxMatches = count;
      bestMatch = domain;
    }
  }
  
  return maxMatches >= 2 ? bestMatch : undefined;
}

function extractYearOfStudy(text: string): number | undefined {
  for (const { pattern, year } of YEAR_PATTERNS) {
    if (pattern.test(text)) {
      return year;
    }
  }
  
  return undefined;
}

function extractAchievements(text: string): string[] {
  const achievements: string[] = [];
  
  for (const pattern of ACHIEVEMENT_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        achievements.push(match[1].trim());
      } else if (match[0]) {
        achievements.push(match[0].trim());
      }
    }
  }
  
  return Array.from(new Set(achievements));
}