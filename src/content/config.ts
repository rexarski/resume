// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const link = z.object({
  label: z.string(),
  href: z.string().url(),
});

const resume = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().optional(),
      website: link,
      links: z.array(link),
    }),
    education: z.array(z.object({
      school: z.string(),
      location: z.string(),
      degree: z.string(),
      dates: z.string(),
    })),
    skills: z.array(z.object({
      category: z.string(),
      items: z.string(),
    })),
    experience: z.array(z.object({
      company: z.string(),
      location: z.string(),
      title: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    })),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),
      links: z.array(link),
    })),
  }),
});

export const collections = { resume };
