type S = Record<string, unknown>

// propertyOrdering is written from the key order below, so the declared
// order of these objects is the order Gemini emits.
function obj(properties: Record<string, S>, required: string[] = [], description?: string): S {
  const schema: S = { type: 'object', properties, propertyOrdering: Object.keys(properties) }
  if (description) schema.description = description
  if (required.length) schema.required = required
  return schema
}

const str = (description: string): S => ({ type: 'string', description })
const num = (description: string): S => ({ type: 'number', description })
const bool = (description: string): S => ({ type: 'boolean', description })
const strArr = (description: string): S => ({ type: 'array', description, items: { type: 'string' } })

export const PROFILE_SCHEMA = obj(
  {
    name: str('Full name exactly as written on the CV. Empty string if not stated.'),
    email: str('Email address. Empty string if not stated.'),
    phone: str('Phone number as written. Empty string if not stated.'),
    location: str('City only, e.g. "Bengaluru". Empty string if not stated.'),
    openToRelocation: bool('true unless the CV explicitly rules out relocation.'),
    currentRole: str('Most recent job title. Empty string if not stated.'),
    experienceYears: num(
      'Total full-time work experience in years. Decimal allowed, e.g. 3.5. 0 when no work history is stated.',
    ),
    summary: str('Third-person professional summary, 2-3 sentences, built only from stated experience.'),
    skills: strArr('Concrete skills and technologies as a flat list. No proficiency levels, no grouping.'),
    education: {
      type: 'array',
      description: 'Degrees and certifications, newest first.',
      items: obj({
        degree: str('Degree, diploma or certification name.'),
        institution: str('Institution name.'),
        year: str('Graduation year as "YYYY". Empty string if not stated.'),
      }),
    },
    experience: {
      type: 'array',
      description: 'Roles, newest first. Only roles that appear on the CV.',
      items: obj({
        role: str('Job title exactly as written on the CV.'),
        company: str('Employer exactly as written on the CV.'),
        location: str('City if stated, else empty string.'),
        start: str('Start date as "Mon YYYY", e.g. "Mar 2021". Empty string if not stated.'),
        end: str('End date as "Mon YYYY". Empty string when the role is current.'),
        current: bool('true only for a role with no end date.'),
        bullets: strArr('Achievement bullets. Preserve source wording and numbers.'),
      }),
    },
    projects: {
      type: 'array',
      description: 'Notable projects named on the CV.',
      items: obj({
        name: str('Project name.'),
        description: str('One sentence describing what it does and the stack.'),
      }),
    },
    certifications: strArr('Certifications and licenses, as named.'),
    noticePeriod: str('Notice period as stated, e.g. "30 days". Empty string if not stated.'),
    compTargetMinLPA: num('Expected CTC floor in lakhs per annum. Omit if not stated.'),
    compTargetMaxLPA: num('Expected CTC ceiling in lakhs per annum. Omit if not stated.'),
    sectors: strArr('Industries worked in or wanted, e.g. "fintech". Empty when unstated.'),
    dealbreakers: strArr(
      'Conditions the CV states they will not accept, e.g. "relocating to Delhi". Empty when none are stated.',
    ),
    targetRoles: strArr('Roles the CV indicates they want next.'),
    narrative: str('Two-sentence third-person positioning statement for their target roles.'),
  },
  [
    'name',
    'openToRelocation',
    'experienceYears',
    'skills',
    'education',
    'experience',
    'projects',
    'certifications',
    'sectors',
    'dealbreakers',
    'targetRoles',
  ],
  'Structured CV data. Every field must be derivable from the source text; otherwise leave it empty.',
)

export const SEARCH_CONFIG_SCHEMA = obj(
  {
    roles: strArr('3-6 target job titles matched to the candidate level, e.g. "Senior Backend Engineer".'),
    queries: strArr(
      '4-8 search queries. Each is a phrase a real job seeker types: seniority + role + city, e.g. "senior backend engineer Bangalore".',
    ),
    positiveKeywords: strArr(
      '5-12 words that signal a good match. These are matched against job TITLES alongside roles, so they must be words that plausibly appear in a title.',
    ),
    negativeKeywords: strArr(
      'Words matched against job TITLES to reject a posting, e.g. "internship", "fresher", "trainee", "contract".',
    ),
    seniorityBoost: strArr('Seniority words that raise ranking when present in a title, e.g. "staff", "principal".'),
    locations: strArr('Preferred cities used to filter job locations, e.g. "Bangalore", "Remote".'),
  },
  ['roles', 'queries', 'positiveKeywords', 'negativeKeywords', 'seniorityBoost', 'locations'],
  'Search strategy for discovering jobs. Counts are guidance, not limits: quality of each term matters more than filling the range.',
)

export const FIT_BATCH_SCHEMA = obj(
  {
    results: {
      type: 'array',
      description:
        'Exactly one entry per input job, in input order, jobIndex ascending from 0. Never omit, merge or repeat a jobIndex.',
      items: obj(
        {
          jobIndex: num('Zero-based index of the job this result scores. Must be unique and in range.'),
          fitScore: num('0-100. How well this posting matches the candidate.'),
          fitReason: str('1-2 sentences naming the deciding factor. Never a generic restatement.'),
          strengths: strArr('Up to 4 short strings naming concrete matches.'),
          gaps: strArr('Up to 4 short strings naming concrete mismatches.'),
          verdict: {
            type: 'string',
            format: 'enum',
            description: 'apply = worth applying now; maybe = borderline; skip = clear mismatch.',
            enum: ['apply', 'maybe', 'skip'],
          },
        },
        ['jobIndex', 'fitScore', 'fitReason', 'strengths', 'gaps', 'verdict'],
        'One fit assessment.',
      ),
    },
  },
  ['results'],
  'Batch fit assessment for a list of jobs scored against one candidate.',
)

export const CV_SCHEMA = obj(
  {
    name: str('Candidate full name.'),
    title: str('Headline tailored to the target job, e.g. "Senior Backend Engineer".'),
    email: str('Email address.'),
    phone: str('Phone number.'),
    location: str('City, e.g. "Bengaluru".'),
    linkedin: str('LinkedIn URL if the candidate profile provides one. Omit when absent.'),
    summary: str('3-4 line professional summary mirroring the target job keywords. Budget: 40 words.'),
    skills: strArr('Core skills as a flat list, max 12 entries. Rendered as its own section.'),
    sections: {
      type: 'array',
      description:
        'ONLY Experience, Projects, Education, Certifications. Never Professional Summary or Core Skills — the renderer supplies those.',
      items: obj(
        {
          title: str('Section heading, one of: Experience, Projects, Education, Certifications.'),
          items: {
            type: 'array',
            description: 'Entries within the section.',
            items: obj(
              {
                heading: str(
                  'One line: role, company, city and dates, e.g. "Senior Software Engineer, Acme Corp - Bengaluru (2020-2024)".',
                ),
                subheading: str('Optional second line, e.g. team or scope. Omit when not useful.'),
                bullets: strArr('Up to 4 bullets, each up to 22 words, starting with an action verb.'),
              },
              ['heading', 'bullets'],
            ),
          },
        },
        ['title', 'items'],
      ),
    },
    notes: strArr(
      'Up to 3 pointers shown to the candidate under "Before You Send". Max 16 words each. These are user-facing, not internal.',
    ),
  },
  ['name', 'title', 'email', 'phone', 'location', 'summary', 'skills', 'sections', 'notes'],
  'One-page ATS resume. Must fit a single A4 page: summary 40 words, skills max 12, max 3 roles, max 4 bullets per role.',
)
