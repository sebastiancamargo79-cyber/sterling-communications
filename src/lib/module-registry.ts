export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'array' | 'events'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
}

export interface ModuleDef {
  name: string        // :::module:Name key, e.g. "Meta"
  label: string       // human label
  storageKey: string  // newsletter schema key, e.g. "meta"
  fields: FieldDef[]
  aiPromptTemplate: string
}

export const MODULE_REGISTRY: ModuleDef[] = [
  {
    name: 'Meta',
    label: 'Metadata',
    storageKey: 'meta',
    fields: [
      { key: 'month', label: 'Month', type: 'text', placeholder: 'March 2025' },
      { key: 'office_name', label: 'Office Name', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'website', label: 'Website', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
    ],
    aiPromptTemplate: `Generate the metadata section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
month: "Month Year"
office_name: "Home Instead [City]"
phone: "phone number"
website: "website url"
email: "email address"`,
  },
  {
    name: 'Cover',
    label: 'Cover Page',
    storageKey: 'cover',
    fields: [
      { key: 'hero_image_url', label: 'Hero Image URL', type: 'url' },
      { key: 'teasers', label: 'Teasers (3–5 lines)', type: 'array' },
    ],
    aiPromptTemplate: `Generate the cover section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
hero_image_url: "https://picsum.photos/seed/homecare/800/533"
teasers:
  - "Teaser line 1"
  - "Teaser line 2"
  - "Teaser line 3"
  - "Teaser line 4"
  - "Teaser line 5"
Include 3 to 5 teasers that preview newsletter content. Each max 40 characters.`,
  },
  {
    name: 'DirectorUpdate',
    label: "Director's Update",
    storageKey: 'director_update',
    fields: [
      { key: 'body_md', label: 'Body (Markdown)', type: 'textarea' },
      { key: 'pull_quote', label: 'Pull Quote (max 140 chars)', type: 'text' },
      { key: 'signature_name', label: 'Signature Name', type: 'text' },
      { key: 'signature_title', label: 'Signature Title', type: 'text' },
    ],
    aiPromptTemplate: `Write the Director's Update section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
body_md: |
  [3-4 paragraphs of warm, professional letter from the managing director. Use markdown.]
pull_quote: "[Inspiring quote from the director, max 140 chars]"
signature_name: "[Director's name]"
signature_title: "[Director's title]"`,
  },
  {
    name: 'Events',
    label: 'Events Diary',
    storageKey: 'events',
    fields: [
      { key: 'events', label: 'Events (YAML list)', type: 'events' },
    ],
    aiPromptTemplate: `Generate the events diary section for a Home Instead franchise newsletter.
Output only valid YAML — a list of 3–5 items, each either an event or photo type:

Event format:
- type: event
  title: "Event Title"
  date: "Day DD Month YYYY"
  time: "H:MM am – H:MM pm"
  location: "Location Name"
  description: "Brief description"

Photo format:
- type: photo
  image_url: "https://picsum.photos/seed/somekey/400/300"
  caption: "Caption text"

Mix event and photo items.`,
  },
  {
    name: 'ClientStory',
    label: 'Client Story',
    storageKey: 'client_story',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'image_url', label: 'Image URL', type: 'url' },
      { key: 'body_md', label: 'Story (Markdown)', type: 'textarea' },
    ],
    aiPromptTemplate: `Write the Client Story section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
headline: "[Compelling headline, e.g. 'A Life Well Lived: [Name]'s Story']"
image_url: "https://picsum.photos/seed/[name]/800/450"
body_md: |
  [4-5 paragraphs telling the client's story with warmth and dignity. Use markdown.]`,
  },
  {
    name: 'StaffSpotlight',
    label: 'Staff Spotlight',
    storageKey: 'spotlight',
    fields: [
      { key: 'image_url', label: 'Photo URL', type: 'url' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'years', label: 'Years with Company', type: 'number' },
      { key: 'quote', label: 'Quote (max 120 chars)', type: 'text' },
      { key: 'bio_md', label: 'Bio (Markdown)', type: 'textarea' },
    ],
    aiPromptTemplate: `Write the Staff Spotlight section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
image_url: "https://picsum.photos/seed/[name]/400/400"
name: "[Full name]"
role: "[Job title]"
years: [integer]
quote: "[Inspiring quote from the staff member, max 120 chars]"
bio_md: |
  [3-4 paragraphs about the staff member's background, role, and personality. Use markdown.]`,
  },
  {
    name: 'Tips',
    label: 'Wellbeing Tips',
    storageKey: 'tips',
    fields: [
      { key: 'image_url', label: 'Image URL', type: 'url' },
      { key: 'bullets', label: 'Tips (exactly 5)', type: 'array' },
    ],
    aiPromptTemplate: `Write the Wellbeing Tips section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
image_url: "https://picsum.photos/seed/[season]/400/400"
bullets:
  - "[Tip 1]"
  - "[Tip 2]"
  - "[Tip 3]"
  - "[Tip 4]"
  - "[Tip 5]"
Provide exactly 5 practical wellbeing tips relevant to elderly care.`,
  },
  {
    name: 'Community',
    label: 'Community & Anniversaries',
    storageKey: 'community',
    fields: [
      { key: 'recruitment_cta_md', label: 'Recruitment CTA (Markdown)', type: 'textarea' },
      { key: 'awards_md', label: 'Awards (Markdown)', type: 'textarea' },
      { key: 'anniversaries', label: 'Anniversaries (YAML list)', type: 'array' },
    ],
    aiPromptTemplate: `Write the Community section for a Home Instead franchise newsletter.
Output only valid YAML with these fields:
recruitment_cta_md: |
  [2-3 paragraphs recruiting Care Professionals. Use markdown with bold headings.]
awards_md: |
  [1-2 paragraphs about any awards, achievements, or recognition. Use markdown.]
anniversaries:
  - name: "[Staff name]"
    years: [integer]
    note: "[Optional congratulatory note]"
Include 3–6 staff work anniversaries.`,
  },
]

export const AVAILABLE_MODULES = MODULE_REGISTRY.map((m) => m.name)

export function getModuleDef(name: string): ModuleDef | undefined {
  return MODULE_REGISTRY.find((m) => m.name === name)
}
