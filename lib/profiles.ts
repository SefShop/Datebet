import type { Lang } from '@/lib/copy'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface UserProfile {
  id: string; name: string; age: number
  photo: string           // Pexels CDN URL (free commercial use)
  gradient: string        // fallback/overlay color
  location: { en: string; gr: string }
  online: boolean
  interests: string[]
  bio: { en: string; gr: string }
}

const px = (id: number, w=600, h=800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`

export const PROFILES: UserProfile[] = [
  {
    id:'p1', name:'Sofia', age:24, photo:px(31040033), gradient:'linear-gradient(135deg,#6c63ff,#a855f7)',
    location:{en:'Athens',gr:'Αθήνα'}, online:true,
    interests:['Coffee','Travel','Music','Cinema'],
    bio:{en:"Love deep talks, spontaneous plans and good coffee ☕",gr:"Βαθιές κουβέντες, αυθόρμητα σχέδια κι ωραίος καφές ☕"},
  },
  {
    id:'p2', name:'Elena', age:26, photo:px(11411119), gradient:'linear-gradient(135deg,#fd297b,#ff655b)',
    location:{en:'Thessaloniki',gr:'Θεσσαλονίκη'}, online:true,
    interests:['Yoga','Wine','Art','Hiking'],
    bio:{en:"Looking for someone who can keep up.",gr:"Ψάχνω κάποιον που θα με προλάβει."},
  },
  {
    id:'p3', name:'Maria', age:23, photo:px(247350), gradient:'linear-gradient(135deg,#38bdf8,#6366f1)',
    location:{en:'Mykonos',gr:'Μύκονος'}, online:false,
    interests:['Dancing','Cooking','Dogs','Beach'],
    bio:{en:"Will definitely steal your hoodie.",gr:"Σίγουρα θα σου κλέψω το hoodie."},
  },
  {
    id:'p4', name:'Anna', age:25, photo:px(16152597), gradient:'linear-gradient(135deg,#f59e0b,#ef4444)',
    location:{en:'Crete',gr:'Κρήτη'}, online:true,
    interests:['Photography','Books','Sunsets','Food'],
    bio:{en:"Night drives and deep conversations.",gr:"Νυχτερινές βόλτες και βαθιές κουβέντες."},
  },
  {
    id:'p5', name:'Demi', age:22, photo:px(7325119), gradient:'linear-gradient(135deg,#ec4899,#8b5cf6)',
    location:{en:'Limassol',gr:'Λεμεσός'}, online:false,
    interests:['Music','Tattoos','Cats','Late nights'],
    bio:{en:"Chaos with good intentions.",gr:"Χάος με καλές προθέσεις."},
  },
  {
    id:'p6', name:'Iro', age:27, photo:px(30712815), gradient:'linear-gradient(135deg,#14b8a6,#06b6d4)',
    location:{en:'Heraklion',gr:'Ηράκλειο'}, online:true,
    interests:['Sailing','Cooking','Jazz','Films'],
    bio:{en:"If you can make me laugh, you're already winning.",gr:"Αν με κάνεις να γελάσω, ήδη κερδίζεις."},
  },
  {
    id:'p7', name:'Naya', age:24, photo:px(29852896), gradient:'linear-gradient(135deg,#f472b6,#c084fc)',
    location:{en:'Nicosia',gr:'Λευκωσία'}, online:true,
    interests:['Fitness','Travel','Brunch','Dogs'],
    bio:{en:"Competitive about everything. Even board games.",gr:"Ανταγωνιστική σε όλα. Ακόμα και στα επιτραπέζια."},
  },
]

// ── Fetch real profiles from Supabase ────────────────────────────
export async function fetchProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured()) return PROFILES  // fallback to demo

  try {
    // Get current user to exclude
    const { data: { user } } = await supabase.auth.getUser()
    const currentId = user?.id

    let query = supabase
      .from('profiles')
      .select('*')
      .limit(50)  // fetch up to 50 profiles

    if (currentId) {
      query = query.neq('id', currentId)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) return PROFILES  // fallback

    // Map Supabase rows to UserProfile format
    return data.map((row: any, i: number) => ({
      id: row.id,
      name: row.name || 'Player',
      age: row.age || 0,
      photo: row.photo || '',
      gradient: PROFILES[i % PROFILES.length]?.gradient || 'linear-gradient(135deg,#fd297b,#ff655b)',
      location: { en: row.location || '', gr: row.location || '' },
      online: Math.random() < 0.6,  // simulated for now
      interests: [],
      bio: { en: row.bio || '', gr: row.bio || '' },
    }))
  } catch {
    return PROFILES  // fallback on any error
  }
}

// Simple match state
let _match: UserProfile | null = null
export function setCurrentMatch(p: UserProfile) { _match = p }
export function getCurrentMatch(): UserProfile { return _match ?? PROFILES[0] }
