import { z } from 'zod'

const MetaSchema = z.object({
  month: z.string(),
  office_name: z.string(),
  phone: z.string(),
  website: z.string(),
  email: z.string().email(),
})

const CoverSchema = z.object({
  hero_image_url: z.string().url(),
  teasers: z.array(z.string().max(40)).min(3).max(5),
})

const DirectorUpdateSchema = z.object({
  body_md: z.string(),
  pull_quote: z.string().max(140),
  signature_name: z.string(),
  signature_title: z.string(),
})

const EventCardSchema = z.object({
  type: z.literal('event'),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string(),
  description: z.string(),
})

const PhotoCardSchema = z.object({
  type: z.literal('photo'),
  image_url: z.string().url(),
  caption: z.string(),
})

const EventUnion = z.discriminatedUnion('type', [EventCardSchema, PhotoCardSchema])

const ClientStorySchema = z.object({
  headline: z.string(),
  image_url: z.string().url(),
  body_md: z.string(),
})

const SpotlightSchema = z.object({
  image_url: z.string().url(),
  name: z.string(),
  role: z.string(),
  years: z.number().int().positive(),
  quote: z.string().max(120),
  bio_md: z.string(),
})

const TipsSchema = z.object({
  image_url: z.string().url(),
  bullets: z.array(z.string()).length(5),
})

const AnniversarySchema = z.object({
  name: z.string(),
  years: z.number().int().positive(),
  note: z.string().optional(),
})

const CommunitySchema = z.object({
  recruitment_cta_md: z.string(),
  awards_md: z.string(),
  anniversaries: z.array(AnniversarySchema).max(6),
})

export const NewsletterSchema = z.object({
  meta: MetaSchema,
  cover: CoverSchema,
  director_update: DirectorUpdateSchema,
  events: z.array(EventUnion).max(6),
  client_story: ClientStorySchema,
  spotlight: SpotlightSchema,
  tips: TipsSchema,
  community: CommunitySchema,
})

export type Newsletter = z.infer<typeof NewsletterSchema>
export type EventItem = z.infer<typeof EventUnion>
export type AnniversaryItem = z.infer<typeof AnniversarySchema>
