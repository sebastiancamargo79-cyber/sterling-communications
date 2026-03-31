export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const OPTIONAL_MODULES = [
  { name: 'Cover', label: 'Cover Page' },
  { name: 'DirectorUpdate', label: "Director's Update" },
  { name: 'Events', label: 'Events Diary' },
  { name: 'ClientStory', label: 'Client Story' },
  { name: 'StaffSpotlight', label: 'Staff Spotlight' },
  { name: 'Tips', label: 'Wellbeing Tips' },
  { name: 'Community', label: 'Community & Anniversaries' },
]

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { messages, selectedModules, clientName, modulePickerShown } = await req.json() as {
    messages: ChatMessage[]
    selectedModules: string[]
    clientName: string
    modulePickerShown: boolean
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  const optionalList = OPTIONAL_MODULES.filter(m => m.name !== 'Cover')
    .map(m => `- ${m.name}: ${m.label}`)
    .join('\n')

  const systemPrompt = `You are a friendly editorial assistant helping plan a newsletter edition for ${clientName}, a home care franchise.

Your job is to collect everything needed to generate a great newsletter through a short, focused conversation. Work through these steps:

STEP 1 — THEME
On your first turn, ask about the general theme or vibe for this edition. Examples: "Easter themed", "summer wellness focus", "staff appreciation special", "new season kickoff". Keep it open and inviting.

STEP 2 — SECTIONS (show module picker once)
${
  modulePickerShown
    ? `The section picker has already been shown. Currently selected: ${selectedModules.length > 0 ? selectedModules.join(', ') : 'none yet — encourage the user to pick at least one'}.`
    : `Once you know the theme, set "showModulePicker": true so the user can check which optional sections to include. Do this in your second or third message. The Cover page is always included — the user picks from optional sections.`
}

STEP 3 — GATHER DETAILS
For each selected section, ask 1–2 targeted questions. Ask about one or two sections at a time:
- Cover: any specific welcome tone or key stories to tease in the intro?
- DirectorUpdate: who is signing it? what should the message focus on?
- Events: what events are coming up? (name, rough date, location)
- ClientStory: who is the client to feature? any known story details?
- StaffSpotlight: who should be spotlighted? name, role, how long with the company?
- Tips: any specific wellness theme or particular tips in mind?
- Community: any staff anniversaries (names + years)? awards or achievements? recruitment focus?

STEP 4 — SIGNAL READY
When you have the theme and enough details for Cover plus all selected sections, set "isReady": true and populate "modulesBrief" with generation instructions. End with something like: "Perfect — I've got everything I need! Hit Generate Newsletter below."

Available optional sections:
${optionalList}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "reply": "Your conversational message to the user",
  "isReady": false,
  "showModulePicker": false,
  "modulesBrief": {}
}

Rules:
- "isReady": true only when you have theme + enough detail for Cover + all selected sections
- "showModulePicker": true exactly ONCE; ${modulePickerShown ? 'NEVER set it again — already shown' : 'set when transitioning from theme to sections'}
- "modulesBrief" keys must be exact module names: Cover, DirectorUpdate, Events, ClientStory, StaffSpotlight, Tips, Community
- Each modulesBrief value: 1–3 sentences with the theme, tone, and any specific details gathered
- Always include Cover in modulesBrief when isReady is true
- Only include modulesBrief keys for Cover + the selected sections
- Do NOT ask about office name, phone, email, or website — those are pre-filled automatically
- Be warm, concise, and efficient — keep messages brief`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: {
    reply: string
    isReady: boolean
    showModulePicker: boolean
    modulesBrief: Record<string, string>
  }
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = { reply: raw, isReady: false, showModulePicker: false, modulesBrief: {} }
  }

  return NextResponse.json({
    reply: parsed.reply ?? '',
    isReady: Boolean(parsed.isReady),
    // Guard: never re-trigger picker if already shown
    showModulePicker: Boolean(parsed.showModulePicker) && !modulePickerShown,
    modulesBrief: parsed.modulesBrief ?? {},
  })
}
