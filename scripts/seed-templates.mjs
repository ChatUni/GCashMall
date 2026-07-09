// Seeds the Quick Create starter-story templates into the DB `templates` collection.
// - Auto-generates a 1-sentence hook per template from its prompt (OpenAI chat).
// - Cover URLs point at the Cloudinary "GCash/quick create" folder.
// Usage: node scripts/seed-templates.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Load .env into process.env (db.js reads MONGODB_URI + VITE_APP_DISPLAY_NAME)
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
Object.assign(process.env, env)

const CDN = (id) => `https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create/idea-${id}.webp`

const templates = [
  {
    id: 'isekai', name: 'Isekai Adventure', order: 1, targetAudience: 'Teens, Young Adults',
    tags: ['Epic Fantasy', 'Adventure', 'Hopeful', 'Emotional'],
    prompt: `A shy 17-year-old high school student named Kai lives an ordinary life until a mysterious eclipse opens a glowing portal beneath his school. He awakens in a breathtaking fantasy world filled with floating islands, ancient dragons, magical forests, and powerful kingdoms. Everyone believes he is the long-awaited "World Traveler" destined to stop an ancient evil that is beginning to awaken.

Kai quickly discovers he possesses no combat abilities, making him an unlikely hero. His only companion is Lyra, a cheerful young mage who insists that destiny chose him for a reason. As they journey together, Kai slowly unlocks mysterious powers connected to his memories from Earth while making new friends and enemies.

Episode 1 should introduce this beautiful fantasy world, establish Kai's personality, show his first meeting with Lyra, and end with the discovery of an enormous dragon that unexpectedly recognizes Kai as its true master.`,
  },
  {
    id: 'highSchoolRomance', name: 'High School Romance', order: 2, targetAudience: 'Teens, Young Adults',
    tags: ['Romantic Comedy', 'Slice of Life', 'Emotional', 'Heartwarming'],
    prompt: `At Sakura High School, two students couldn't be more different. Aoi is the school's top student—organized, serious, and determined to earn a scholarship. Haru is outgoing, popular, and constantly skips class to pursue music.

When they're unexpectedly assigned to organize the school's cultural festival together, constant arguments slowly turn into friendship. As they spend more time together, they begin discovering hidden struggles behind each other's seemingly perfect lives.

Episode 1 introduces the school, the classmates, their first awkward meeting, and the teacher assigning them to work together. Just as they reluctantly agree, they discover an old photograph suggesting their families were connected years ago.`,
  },
  {
    id: 'fantasyHero', name: 'Fantasy Hero', order: 3, targetAudience: 'Teens, Young Adults',
    tags: ["Hero's Journey", 'Fantasy Adventure', 'Inspirational'],
    prompt: `In the Kingdom of Eldoria, magical power determines social status. Riku, a poor orphan raised in a small village, has no magic at all and dreams of becoming a knight despite constant ridicule.

Everything changes when he accidentally discovers an ancient crystal hidden inside forgotten ruins. The crystal awakens a legendary Guardian Spirit that chooses him as its new protector, granting him abilities unlike traditional magic.

Episode 1 introduces the kingdom, Riku's humble life, his dream of becoming a hero, and his discovery of the crystal. As he returns to the village, mysterious shadow creatures appear, forcing him to use his newly awakened powers for the first time.`,
  },
  {
    id: 'demonHunter', name: 'Demon Hunter', order: 4, targetAudience: 'Teens, Young Adults',
    tags: ['Dark Fantasy', 'Supernatural Action', 'Suspense'],
    prompt: `Every night after sunset, demons secretly enter the modern city through invisible portals that ordinary people cannot see. Ren belongs to an ancient organization of Demon Hunters responsible for protecting humanity from these hidden threats.

Although respected as one of the youngest hunters, Ren hides a dangerous secret: half of his soul was fused with a powerful demon during childhood. Every battle risks awakening the darkness inside him.

Episode 1 begins with an ordinary school day before transforming into a high-speed battle against terrifying demons in the city streets. During the fight, Ren unexpectedly loses control of his hidden power, attracting the attention of the mysterious Demon King.`,
  },
  {
    id: 'dragonAcademy', name: 'Dragon Academy', order: 5, targetAudience: 'Kids, Teens',
    tags: ['Adventure', 'Friendship', 'Mystery', 'Coming-of-Age'],
    prompt: `Dragon Academy is the world's most prestigious school, where young riders are chosen by dragons through an ancient bonding ceremony. Only the strongest students earn the honor of becoming Dragon Riders.

Riku dreams of attending the academy but possesses no magical ability, making his acceptance nearly impossible. During the entrance ceremony, a forgotten dragon egg suddenly hatches and chooses him instead of the elite candidates, shocking everyone.

Now admired by some and hated by many, Riku must survive dangerous training while uncovering the truth behind the mysterious dragon, Luna. Hidden beneath the academy lies an ancient conspiracy that threatens both dragons and humanity.

Episode 1 introduces Dragon Academy, the entrance ceremony, Luna's hatching, and ends with the academy headmaster quietly revealing that this dragon should have been extinct centuries ago.`,
  },
  {
    id: 'sciFiMecha', name: 'Sci-Fi Mecha', order: 6, targetAudience: 'Teens, Young Adults',
    tags: ['Sci-Fi', 'Action', 'Adventure', 'Inspirational'],
    prompt: `Hundreds of years after Earth was devastated by war, humanity now survives in gigantic floating cities protected by powerful combat mechas. Kai is a talented young mechanic who spends his days repairing damaged robots while dreaming of becoming a pilot.

During a routine repair mission beneath the city, Kai discovers an ancient experimental mecha hidden deep underground. Unlike modern machines, this legendary unit responds only to him.

Episode 1 introduces the futuristic city, Kai's daily life, his friends, and the accidental activation of the forgotten mecha. As alarms sound throughout the city, mysterious enemy drones launch an unexpected attack, forcing Kai into his first battle.`,
  },
  {
    id: 'cuteAnimal', name: 'Cute Animal Story', order: 7, targetAudience: 'Kids, Families',
    tags: ['Family-Friendly', 'Heartwarming', 'Magical', 'Emotional'],
    prompt: `In a magical forest where every animal possesses a unique gift, Mochi is the smallest fox spirit and believes he is too weak to help anyone. Although cheerful and kind, he constantly compares himself to stronger animals.

One day Mochi meets Lily, a lonely girl who has lost her way while searching for her grandmother's cottage. Together they begin an unforgettable journey through enchanted forests, meeting magical creatures and helping others along the way.

Episode 1 introduces Mochi's home, his insecurities, Lily's arrival, and ends with the discovery that the forest itself is slowly losing its magic because an ancient Tree Spirit has fallen asleep.`,
  },
  {
    id: 'comedySliceOfLife', name: 'Comedy Slice of Life', order: 8, targetAudience: 'Teens, Young Adults',
    tags: ['Lighthearted', 'Comedy', 'Slice of Life', 'Friendship'],
    prompt: `Four completely different high school students accidentally become members of the school's newest club after each of them mistakenly signs the wrong application form. Unfortunately, nobody—including the teacher—knows what the club is actually supposed to do.

Determined not to let the club disappear, they invent ridiculous weekly activities that somehow always end in hilarious chaos. Despite constant failures and misunderstandings, they gradually become close friends.

Episode 1 introduces each member, their unique personalities, the accidental formation of the club, and their first disastrous attempt to organize a school event, ending with everyone laughing together despite the complete failure.`,
  },
]

// Generate a punchy one-sentence hook from the prompt via OpenAI chat
const generateHook = async (t) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You write a single punchy one-sentence hook (max ~18 words) for an anime series. Reply with only the sentence, no quotes, no extra text.' },
        { role: 'user', content: `Title: ${t.name}\n\n${t.prompt}` },
      ],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`hook ${t.id}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '')
}

const { save, remove } = await import('../netlify/functions/utils/db.js')

const docs = []
for (const t of templates) {
  const hook = await generateHook(t)
  console.log(`hook[${t.id}]: ${hook}`)
  docs.push({
    name: t.name,
    cover: CDN(t.id),
    prompt: t.prompt,
    hook,
    tags: t.tags,
    targetAudience: t.targetAudience,
    order: t.order,
    createdAt: new Date(),
  })
}

await remove('templates', {})
for (const d of docs) await save('templates', d)
console.log(`Seeded ${docs.length} templates.`)
process.exit(0)
