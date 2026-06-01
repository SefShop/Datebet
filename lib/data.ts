import { Profile, GameQuestion, BiQuestion } from '@/types'
import type { Lang } from '@/lib/copy'

export const MOCK_PROFILE: Profile = {
  id: '1',
  name: 'Sofia',
  age: 26,
  location: 'Athens',
  distance: '2km away',
  emoji: '👩',
  compatibility: 89,
}

// Rotating pool — 25 questions × 5 categories, bilingual. Localized at render.
export const QUESTION_POOL: BiQuestion[] = [

  // ════════ 1. ATTRACTION & DATING ENERGY ════════
  {
    id: 'q1', category: 'attraction',
    type: { en: 'first move.', gr: 'πρώτη κίνηση.' },
    question: { en: "You spot someone across the room. What's your move?", gr: "Βλέπεις κάποιον απέναντι. Τι κάνεις;" },
    options: [
      { id: 'a', emoji: '👀', text: { en: "Hold the eye contact", gr: "Κρατάς το βλέμμα" },    sub: { en: "let them come to you", gr: "ας έρθει εκείνος" } },
      { id: 'b', emoji: '🚶', text: { en: "Walk over, no plan",    gr: "Πας από κει, χωρίς πλάνο" }, sub: { en: "improvise it", gr: "στο φυσικό" } },
      { id: 'c', emoji: '🍸', text: { en: "Send a drink",          gr: "Στέλνεις ένα ποτό" },    sub: { en: "old-school flex", gr: "κλασικό φλεξ" } },
      { id: 'd', emoji: '😶', text: { en: "Nothing. Freeze.",      gr: "Τίποτα. Παγώνεις." },    sub: { en: "and regret it later", gr: "και το μετανιώνεις" } },
    ],
  },
  {
    id: 'q2', category: 'attraction',
    type: { en: 'be honest.', gr: 'πες αλήθεια.' },
    question: { en: "What actually makes you lose interest fastest?", gr: "Τι σε κάνει να χάνεις το ενδιαφέρον πιο γρήγορα;" },
    options: [
      { id: 'a', emoji: '🥱', text: { en: "No banter",           gr: "Μηδέν τσιλιμπουρδίσματα" }, sub: { en: "dead conversation", gr: "νεκρή κουβέντα" } },
      { id: 'b', emoji: '📍', text: { en: "Always available",     gr: "Πάντα διαθέσιμος" },       sub: { en: "no mystery left", gr: "κανένα μυστήριο" } },
      { id: 'c', emoji: '🪞', text: { en: "Too into themselves",  gr: "Πολύ ερωτευμένος με τον εαυτό του" }, sub: { en: "mirror, not a date", gr: "καθρέφτης, όχι ραντεβού" } },
      { id: 'd', emoji: '🚩', text: { en: "Rude to the waiter",   gr: "Αγενής στον σερβιτόρο" },  sub: { en: "the real tell", gr: "το πραγματικό σημάδι" } },
    ],
  },
  {
    id: 'q3', category: 'attraction',
    type: { en: 'this is a tell.', gr: 'αυτό λέει πολλά.' },
    question: { en: "First thing you notice on a date?", gr: "Τι προσέχεις πρώτο σε ένα ραντεβού;" },
    options: [
      { id: 'a', emoji: '😏', text: { en: "How they smile",  gr: "Πώς χαμογελάει" },   sub: { en: "or don't", gr: "ή δεν χαμογελάει" } },
      { id: 'b', emoji: '🗣️', text: { en: "How they talk",   gr: "Πώς μιλάει" },        sub: { en: "words matter", gr: "οι λέξεις μετράνε" } },
      { id: 'c', emoji: '👟', text: { en: "The shoes",       gr: "Τα παπούτσια" },     sub: { en: "judge me later", gr: "κρίνε με μετά" } },
      { id: 'd', emoji: '⚡', text: { en: "The energy",      gr: "Η ενέργεια" },       sub: { en: "you just feel it", gr: "απλώς το νιώθεις" } },
    ],
  },
  {
    id: 'q4', category: 'attraction',
    type: { en: 'choose.', gr: 'διάλεξε.' },
    question: { en: "Confidence or mystery — what pulls you in?", gr: "Αυτοπεποίθηση ή μυστήριο — τι σε τραβάει;" },
    options: [
      { id: 'a', emoji: '🔥', text: { en: "Confidence",          gr: "Αυτοπεποίθηση" },       sub: { en: "say it with your chest", gr: "πες το με σιγουριά" } },
      { id: 'b', emoji: '🌙', text: { en: "Mystery",             gr: "Μυστήριο" },            sub: { en: "make me work for it", gr: "κάνε με να ψαχτώ" } },
      { id: 'c', emoji: '🎭', text: { en: "Both, switching",     gr: "Και τα δύο, εναλλάξ" },  sub: { en: "keep me guessing", gr: "κράτα με σε αγωνία" } },
      { id: 'd', emoji: '😂', text: { en: "Just make me laugh",  gr: "Απλώς κάνε με να γελάσω" }, sub: { en: "humor wins", gr: "το χιούμορ κερδίζει" } },
    ],
  },
  {
    id: 'q5', category: 'attraction',
    type: { en: 'risky question.', gr: 'επικίνδυνη ερώτηση.' },
    question: { en: "How fast do you catch feelings?", gr: "Πόσο γρήγορα ερωτεύεσαι;" },
    options: [
      { id: 'a', emoji: '⚡', text: { en: "Instantly",            gr: "Ακαριαία" },          sub: { en: "all in, every time", gr: "όλα ή τίποτα, πάντα" } },
      { id: 'b', emoji: '🐢', text: { en: "Painfully slow",       gr: "Βασανιστικά αργά" },   sub: { en: "guard's always up", gr: "πάντα σε άμυνα" } },
      { id: 'c', emoji: '🎢', text: { en: "Depends on them",      gr: "Εξαρτάται από εκείνον" }, sub: { en: "case by case", gr: "κατά περίπτωση" } },
      { id: 'd', emoji: '🙅', text: { en: "I don't. Allegedly.",  gr: "Δεν ερωτεύομαι. Λέμε τώρα." }, sub: { en: "sure you don't", gr: "ναι, καλά" } },
    ],
  },

  // ════════ 2. PERSONALITY & BEHAVIOR ════════
  {
    id: 'q6', category: 'personality',
    type: { en: 'be honest.', gr: 'πες αλήθεια.' },
    question: { en: "It's 2am. You're awake. What's actually going on?", gr: "2 τα ξημερώματα. Είσαι ξύπνιος. Τι παίζει;" },
    options: [
      { id: 'a', emoji: '📱', text: { en: "Doomscrolling",        gr: "Ατελείωτο scroll" },     sub: { en: "the usual spiral", gr: "η γνωστή κατρακύλα" } },
      { id: 'b', emoji: '🧠', text: { en: "Overthinking",         gr: "Υπερανάλυση" },          sub: { en: "something from 3 years ago", gr: "κάτι από 3 χρόνια πριν" } },
      { id: 'c', emoji: '🍿', text: { en: "One more episode",     gr: "Άλλο ένα επεισόδιο" },   sub: { en: "it's a lie", gr: "ψέμα και το ξέρεις" } },
      { id: 'd', emoji: '💭', text: { en: "Thinking about them",  gr: "Σκέφτεσαι εκείνον/η" },  sub: { en: "you know who", gr: "ξέρεις ποιον" } },
    ],
  },
  {
    id: 'q7', category: 'personality',
    type: { en: 'no wrong answer. lie.', gr: 'δεν υπάρχει λάθος. πες ψέματα.' },
    question: { en: "Your group chat would describe you as...", gr: "Η παρέα σου θα σε περιέγραφε ως..." },
    options: [
      { id: 'a', emoji: '🤡', text: { en: "The chaos one",       gr: "Ο χαοτικός" },          sub: { en: "never a dull moment", gr: "ποτέ βαρετά" } },
      { id: 'b', emoji: '🧊', text: { en: "The calm one",        gr: "Ο ήρεμος" },            sub: { en: "secretly unhinged", gr: "κρυφά τρελός" } },
      { id: 'c', emoji: '👑', text: { en: "The main character",  gr: "Ο πρωταγωνιστής" },     sub: { en: "you said it, not me", gr: "εσύ το είπες" } },
      { id: 'd', emoji: '🫶', text: { en: "The therapist",       gr: "Ο ψυχολόγος της παρέας" }, sub: { en: "everyone's problems, none of yours", gr: "όλων τα προβλήματα, κανένα δικό σου" } },
    ],
  },
  {
    id: 'q8', category: 'personality',
    type: { en: 'this says everything.', gr: 'αυτό τα λέει όλα.' },
    question: { en: "How do you handle being wrong?", gr: "Πώς αντιδράς όταν κάνεις λάθος;" },
    options: [
      { id: 'a', emoji: '🙇', text: { en: "Admit it fast",        gr: "Το παραδέχεσαι αμέσως" }, sub: { en: "rare and respected", gr: "σπάνιο και τιμητικό" } },
      { id: 'b', emoji: '⚖️', text: { en: "Debate to the end",    gr: "Το παλεύεις μέχρι τέλους" }, sub: { en: "I'll find a loophole", gr: "θα βρω παραθυράκι" } },
      { id: 'c', emoji: '😬', text: { en: "Change the subject",   gr: "Αλλάζεις θέμα" },        sub: { en: "smooth, very smooth", gr: "πολύ διακριτικά" } },
      { id: 'd', emoji: '🤐', text: { en: "Quietly never forget", gr: "Σιωπηλά δεν ξεχνάς ποτέ" }, sub: { en: "I'll bring it up in 2027", gr: "θα το θυμηθώ το 2027" } },
    ],
  },
  {
    id: 'q9', category: 'personality',
    type: { en: 'choose.', gr: 'διάλεξε.' },
    question: { en: "Pick your toxic trait — we all have one.", gr: "Διάλεξε το toxic σου — όλοι έχουμε ένα." },
    options: [
      { id: 'a', emoji: '⏰', text: { en: "Always late",       gr: "Πάντα αργοπορημένος" }, sub: { en: "time is fake", gr: "ο χρόνος είναι ψέμα" } },
      { id: 'b', emoji: '📵', text: { en: "Slow texter",       gr: "Αργείς να απαντήσεις" }, sub: { en: "saw it. forgot.", gr: "το είδα. το ξέχασα." } },
      { id: 'c', emoji: '🎯', text: { en: "Too blunt",         gr: "Πολύ ωμός" },           sub: { en: "you'll know where you stand", gr: "θα ξέρεις πού πατάς" } },
      { id: 'd', emoji: '🥶', text: { en: "Avoid hard talks",  gr: "Αποφεύγεις τις δύσκολες κουβέντες" }, sub: { en: "feelings? in this economy?", gr: "συναισθήματα; τώρα;" } },
    ],
  },
  {
    id: 'q10', category: 'personality',
    type: { en: 'would you rather.', gr: 'τι θα προτιμούσες.' },
    question: { en: "Pick your villain origin story.", gr: "Διάλεξε το villain origin story σου." },
    options: [
      { id: 'a', emoji: '💔', text: { en: "Heartbreak",     gr: "Ερωτική απογοήτευση" }, sub: { en: "the classic", gr: "το κλασικό" } },
      { id: 'b', emoji: '🏢', text: { en: "Terrible job",   gr: "Απαίσια δουλειά" },     sub: { en: "corporate trauma", gr: "εταιρικό τραύμα" } },
      { id: 'c', emoji: '👨‍👩‍👧', text: { en: "Family drama", gr: "Οικογενειακό δράμα" }, sub: { en: "too relatable", gr: "πολύ relatable" } },
      { id: 'd', emoji: '🌍', text: { en: "Just vibes",     gr: "Έτσι, χωρίς λόγο" },    sub: { en: "born this way", gr: "γεννήθηκα έτσι" } },
    ],
  },

  // ════════ 3. EMOTIONAL DEPTH ════════
  {
    id: 'q11', category: 'emotional',
    type: { en: 'gets real.', gr: 'σοβαρεύουμε.' },
    question: { en: "What do you actually want right now?", gr: "Τι θες πραγματικά αυτή τη στιγμή;" },
    options: [
      { id: 'a', emoji: '🔥', text: { en: "Something real",  gr: "Κάτι αληθινό" },     sub: { en: "done with the games", gr: "τέλος τα παιχνίδια" } },
      { id: 'b', emoji: '😈', text: { en: "Something fun",   gr: "Κάτι διασκεδαστικό" }, sub: { en: "no strings", gr: "χωρίς δεσμεύσεις" } },
      { id: 'c', emoji: '🤷', text: { en: "No idea honestly",gr: "Ειλικρινά, ιδέα" },   sub: { en: "figuring it out", gr: "το ψάχνω ακόμα" } },
      { id: 'd', emoji: '✨', text: { en: "To be surprised", gr: "Να εκπλαγώ" },        sub: { en: "open to anything", gr: "ανοιχτός σε όλα" } },
    ],
  },
  {
    id: 'q12', category: 'emotional',
    type: { en: 'soft launch.', gr: 'σιγά σιγά.' },
    question: { en: "What makes you feel safe with someone?", gr: "Τι σε κάνει να νιώθεις ασφάλεια με κάποιον;" },
    options: [
      { id: 'a', emoji: '🤫', text: { en: "They keep secrets",     gr: "Κρατάει μυστικά" },       sub: { en: "the vault", gr: "θησαυροφυλάκιο" } },
      { id: 'b', emoji: '🎯', text: { en: "They're consistent",    gr: "Είναι σταθερός" },        sub: { en: "no mixed signals", gr: "χωρίς διπλά μηνύματα" } },
      { id: 'c', emoji: '😌', text: { en: "Silence isn't awkward", gr: "Η σιωπή δεν είναι άβολη" }, sub: { en: "just being", gr: "απλώς να υπάρχεις" } },
      { id: 'd', emoji: '🫂', text: { en: "They show up",          gr: "Εμφανίζεται" },           sub: { en: "actions, not words", gr: "πράξεις, όχι λόγια" } },
    ],
  },
  {
    id: 'q13', category: 'emotional',
    type: { en: 'be honest.', gr: 'πες αλήθεια.' },
    question: { en: "When you're hurt, what do you actually do?", gr: "Όταν πληγώνεσαι, τι κάνεις στ' αλήθεια;" },
    options: [
      { id: 'a', emoji: '🚪', text: { en: "Go quiet, disappear", gr: "Σωπαίνεις, εξαφανίζεσαι" }, sub: { en: "the slow fade", gr: "σιγά σιγά χάνεσαι" } },
      { id: 'b', emoji: '🗯️', text: { en: "Say it straight",     gr: "Το λες ευθέως" },          sub: { en: "no guessing games", gr: "χωρίς μαντεψιές" } },
      { id: 'c', emoji: '🎭', text: { en: "Act like I'm fine",   gr: "Κάνεις πως είσαι καλά" },  sub: { en: "I'm not fine", gr: "δεν είσαι καλά" } },
      { id: 'd', emoji: '🍷', text: { en: "Call my people",      gr: "Παίρνεις τους δικούς σου" }, sub: { en: "group debrief", gr: "ομαδική ανάλυση" } },
    ],
  },
  {
    id: 'q14', category: 'emotional',
    type: { en: 'no lying now.', gr: 'τώρα μη λες ψέματα.' },
    question: { en: "What scares you more?", gr: "Τι σε φοβίζει πιο πολύ;" },
    options: [
      { id: 'a', emoji: '🫥', text: { en: "Being forgotten",    gr: "Να σε ξεχάσουν" },         sub: { en: "the quiet fear", gr: "ο σιωπηλός φόβος" } },
      { id: 'b', emoji: '🔒', text: { en: "Being fully known",  gr: "Να σε γνωρίσουν πλήρως" },  sub: { en: "seen, flaws and all", gr: "με όλα τα ελαττώματα" } },
      { id: 'c', emoji: '🌀', text: { en: "Settling too soon",  gr: "Να βολευτείς νωρίς" },     sub: { en: "what if there's better", gr: "κι αν υπάρχει καλύτερο" } },
      { id: 'd', emoji: '🕰️', text: { en: "Running out of time",gr: "Να σου τελειώσει ο χρόνος" }, sub: { en: "the clock thing", gr: "το θέμα με το ρολόι" } },
    ],
  },
  {
    id: 'q15', category: 'emotional',
    type: { en: 'this one lingers.', gr: 'αυτή μένει.' },
    question: { en: "Be honest — do you still think about an ex?", gr: "Πες αλήθεια — σκέφτεσαι ακόμα κάποιον/α ex;" },
    options: [
      { id: 'a', emoji: '🙃', text: { en: "Only when a song plays", gr: "Μόνο όταν παίζει ένα τραγούδι" }, sub: { en: "damn that song", gr: "γαμώτο αυτό το τραγούδι" } },
      { id: 'b', emoji: '🧹', text: { en: "Nope, cleared cache",   gr: "Όχι, καθάρισα" },         sub: { en: "deleted, allegedly", gr: "διαγράφηκε, λέμε" } },
      { id: 'c', emoji: '😶‍🌫️', text: { en: "More than I admit",   gr: "Πιο πολύ απ' όσο παραδέχομαι" }, sub: { en: "we don't talk about it", gr: "δεν το συζητάμε" } },
      { id: 'd', emoji: '🤝', text: { en: "We're cool now",        gr: "Είμαστε οκ πλέον" },      sub: { en: "growth, baby", gr: "ωριμότητα, μωρό μου" } },
    ],
  },

  // ════════ 4. CHAOS / FUN / UNEXPECTED ════════
  {
    id: 'q16', category: 'chaos',
    type: { en: 'choose fast.', gr: 'γρήγορα.' },
    question: { en: "It's 3am and the night took a turn. You're...", gr: "3 τα ξημερώματα κι η νύχτα ξέφυγε. Είσαι..." },
    options: [
      { id: 'a', emoji: '🕺', text: { en: "Still out, no plan",     gr: "Ακόμα έξω, χωρίς πλάνο" }, sub: { en: "the night's young", gr: "η νύχτα είναι μικρή" } },
      { id: 'b', emoji: '🌯', text: { en: "In line for food",       gr: "Στην ουρά για φαγητό" },  sub: { en: "priorities straight", gr: "σωστές προτεραιότητες" } },
      { id: 'c', emoji: '🚕', text: { en: "Already home, smug",     gr: "Ήδη σπίτι, καμαρωτός" },  sub: { en: "left at a normal hour", gr: "έφυγες σε λογική ώρα" } },
      { id: 'd', emoji: '📞', text: { en: "Texting someone risky",  gr: "Γράφεις σε κάποιον επικίνδυνο" }, sub: { en: "we've all been there", gr: "όλοι το έχουμε κάνει" } },
    ],
  },
  {
    id: 'q17', category: 'chaos',
    type: { en: 'be honest.', gr: 'πες αλήθεια.' },
    question: { en: "Your search history would reveal you're a...", gr: "Το ιστορικό σου θα αποκάλυπτε ότι είσαι..." },
    options: [
      { id: 'a', emoji: '🩺', text: { en: "Hypochondriac",        gr: "Υποχόνδριος" },          sub: { en: "WebMD says it's fatal", gr: "το Google λέει θανατηφόρο" } },
      { id: 'b', emoji: '🕵️', text: { en: "Professional stalker",  gr: "Επαγγελματίας stalker" }, sub: { en: "found their cousin's blog", gr: "βρήκες και το blog του ξαδέρφου" } },
      { id: 'c', emoji: '🧠', text: { en: "3am rabbit-holer",      gr: "Νυχτερινός ψάχτης" },    sub: { en: "how do whales sleep", gr: "πώs κοιμούνται οι φάλαινες" } },
      { id: 'd', emoji: '🛒', text: { en: "Impulse shopper",       gr: "Αγοράζεις παρορμητικά" }, sub: { en: "cart full at midnight", gr: "γεμάτο καλάθι τα μεσάνυχτα" } },
    ],
  },
  {
    id: 'q18', category: 'chaos',
    type: { en: 'would you rather.', gr: 'τι θα προτιμούσες.' },
    question: { en: "Pick the red flag you'd still date.", gr: "Διάλεξε το red flag που θα έβγαινες παρ' όλα αυτά." },
    options: [
      { id: 'a', emoji: '😤', text: { en: "Always running late",  gr: "Πάντα αργοπορημένος" },  sub: { en: "but worth the wait", gr: "αλλά αξίζει η αναμονή" } },
      { id: 'b', emoji: '📸', text: { en: "Posts everything",     gr: "Ανεβάζει τα πάντα" },    sub: { en: "you'll be content", gr: "θα γίνεις περιεχόμενο" } },
      { id: 'c', emoji: '🎤', text: { en: "Won't shut up",        gr: "Δεν σταματάει να μιλάει" }, sub: { en: "never a silence", gr: "ποτέ σιωπή" } },
      { id: 'd', emoji: '🃏', text: { en: "Too unpredictable",    gr: "Πολύ απρόβλεπτος" },     sub: { en: "chaos is exciting", gr: "το χάος συναρπάζει" } },
    ],
  },
  {
    id: 'q19', category: 'chaos',
    type: { en: 'this is a trap.', gr: 'παγίδα είναι.' },
    question: { en: "We're stranded somewhere. Where'd you want it to be?", gr: "Μείναμε κάπου αποκλεισμένοι. Πού θα ήθελες;" },
    options: [
      { id: 'a', emoji: '🏝️', text: { en: "Deserted island",   gr: "Έρημο νησί" },         sub: { en: "just us, dramatic", gr: "μόνο εμείς, δραματικά" } },
      { id: 'b', emoji: '🏔️', text: { en: "Snowed-in cabin",   gr: "Καλύβα στα χιόνια" },  sub: { en: "one fireplace", gr: "ένα τζάκι" } },
      { id: 'c', emoji: '🛫', text: { en: "Airport overnight",  gr: "Αεροδρόμιο όλη νύχτα" }, sub: { en: "weirdly romantic", gr: "παραδόξως ρομαντικό" } },
      { id: 'd', emoji: '🚗', text: { en: "Roadtrip, no signal",gr: "Roadtrip, χωρίς σήμα" }, sub: { en: "off the grid", gr: "εκτός δικτύου" } },
    ],
  },
  {
    id: 'q20', category: 'chaos',
    type: { en: 'last call.', gr: 'τελευταία κλήση.' },
    question: { en: "How do you actually flirt?", gr: "Πώς φλερτάρεις στ' αλήθεια;" },
    options: [
      { id: 'a', emoji: '😏', text: { en: "Roast them lovingly", gr: "Τον δουλεύεις με αγάπη" }, sub: { en: "insults = affection", gr: "πείραγμα = στοργή" } },
      { id: 'b', emoji: '🫠', text: { en: "Get shy and weird",   gr: "Ντρέπεσαι και χαζεύεις" }, sub: { en: "it's charming, trust", gr: "είναι γλυκό, πίστεψέ με" } },
      { id: 'c', emoji: '🎯', text: { en: "Direct, no games",    gr: "Ευθέως, χωρίς παιχνίδια" }, sub: { en: "I like you. done.", gr: "μ' αρέσεις. τέλος." } },
      { id: 'd', emoji: '🦚', text: { en: "Show off a little",   gr: "Κάνεις λίγο φιγούρα" },   sub: { en: "watch this", gr: "για δες εδώ" } },
    ],
  },

  // ════════ 5. REAL-LIFE SCENARIOS ════════
  {
    id: 'q21', category: 'scenario',
    type: { en: 'this says everything.', gr: 'αυτό τα λέει όλα.' },
    question: { en: "First date. You pick the place. Where?", gr: "Πρώτο ραντεβού. Διαλέγεις εσύ. Πού;" },
    options: [
      { id: 'a', emoji: '🍷', text: { en: "Wine bar",        gr: "Wine bar" },        sub: { en: "smooth, maybe too smooth", gr: "άνετο, ίσως πολύ άνετο" } },
      { id: 'b', emoji: '🌮', text: { en: "Taco spot",       gr: "Για street food" }, sub: { en: "messy = comfortable", gr: "ακατάστατο = άνετο" } },
      { id: 'c', emoji: '🎨', text: { en: "Gallery opening", gr: "Έκθεση τέχνης" },   sub: { en: "you read the room", gr: "διαβάζεις την ατμόσφαιρα" } },
      { id: 'd', emoji: '🎳', text: { en: "Bowling",         gr: "Bowling" },         sub: { en: "chaotic good", gr: "χαοτικά καλό" } },
    ],
  },
  {
    id: 'q22', category: 'scenario',
    type: { en: 'be honest.', gr: 'πες αλήθεια.' },
    question: { en: "They text 'we need to talk.' First thought?", gr: "Σου γράφει «πρέπει να μιλήσουμε». Πρώτη σκέψη;" },
    options: [
      { id: 'a', emoji: '💀', text: { en: "It's over",            gr: "Τελείωσε" },           sub: { en: "spiral initiated", gr: "ξεκίνησε η κατρακύλα" } },
      { id: 'b', emoji: '🛡️', text: { en: "What did I do",        gr: "Τι έκανα" },           sub: { en: "defense mode on", gr: "άμυνα on" } },
      { id: 'c', emoji: '😐', text: { en: "Finally, let's talk",  gr: "Επιτέλους, ας μιλήσουμε" }, sub: { en: "weirdly calm", gr: "παραδόξως ήρεμος" } },
      { id: 'd', emoji: '📵', text: { en: "Leave on read",        gr: "Το αφήνεις στο read" }, sub: { en: "deal with it tomorrow", gr: "αύριο το βλέπουμε" } },
    ],
  },
  {
    id: 'q23', category: 'scenario',
    type: { en: 'choose.', gr: 'διάλεξε.' },
    question: { en: "Date's going badly. What do you do?", gr: "Το ραντεβού πάει χάλια. Τι κάνεις;" },
    options: [
      { id: 'a', emoji: '🎬', text: { en: "Fake an emergency",    gr: "Σκαρώνεις έκτακτο" },     sub: { en: "the classic exit", gr: "η κλασική έξοδος" } },
      { id: 'b', emoji: '😬', text: { en: "Ride it out politely",  gr: "Το αντέχεις ευγενικά" }, sub: { en: "suffer in silence", gr: "υποφέρεις σιωπηλά" } },
      { id: 'c', emoji: '🗣️', text: { en: "Say it's not working",  gr: "Λες ότι δεν παίζει" },   sub: { en: "rip the bandaid", gr: "ξεκόλλα το γρήγορα" } },
      { id: 'd', emoji: '🍸', text: { en: "Order another drink",   gr: "Παραγγέλνεις άλλο ποτό" }, sub: { en: "salvage mission", gr: "αποστολή διάσωσης" } },
    ],
  },
  {
    id: 'q24', category: 'scenario',
    type: { en: 'the ghosting one.', gr: 'το ghosting θέμα.' },
    question: { en: "Someone ghosts you after a great date. You assume...", gr: "Κάποιος σε κάνει ghost μετά από τέλειο ραντεβού. Υποθέτεις..." },
    options: [
      { id: 'a', emoji: '🪞', text: { en: "Something I said",     gr: "Κάτι είπα" },          sub: { en: "instant replay begins", gr: "ξεκινάει το replay" } },
      { id: 'b', emoji: '😮‍💨', text: { en: "They chickened out",  gr: "Φοβήθηκε" },           sub: { en: "classic", gr: "κλασικό" } },
      { id: 'c', emoji: '🙃', text: { en: "Their loss",           gr: "Δική του ζημιά" },     sub: { en: "confidence mode: on", gr: "αυτοπεποίθηση: on" } },
      { id: 'd', emoji: '📵', text: { en: "They lost my number",  gr: "Έχασε το νούμερό μου" }, sub: { en: "benefit of the doubt", gr: "το ωφέλημα της αμφιβολίας" } },
    ],
  },
  {
    id: 'q25', category: 'scenario',
    type: { en: 'final answer.', gr: 'τελική απάντηση.' },
    question: { en: "Three dates in. No kiss yet. You...", gr: "Τρία ραντεβού. Ακόμα κανένα φιλί. Εσύ..." },
    options: [
      { id: 'a', emoji: '😘', text: { en: "Make the move yourself",    gr: "Κάνεις εσύ την κίνηση" }, sub: { en: "done waiting", gr: "τέλος η αναμονή" } },
      { id: 'b', emoji: '🤔', text: { en: "Assume they're not into it", gr: "Υποθέτεις ότι δεν γουστάρει" }, sub: { en: "spiral quietly", gr: "κατρακυλάς σιωπηλά" } },
      { id: 'c', emoji: '🧊', text: { en: "Respect the slow burn",     gr: "Σέβεσαι το σιγανό φιτίλι" }, sub: { en: "patience is hot", gr: "η υπομονή είναι σέξι" } },
      { id: 'd', emoji: '🚪', text: { en: "Start losing interest",     gr: "Αρχίζεις να χάνεις ενδιαφέρον" }, sub: { en: "tick tock", gr: "τικ τακ" } },
    ],
  },
]

// Returns a flat, single-language question for rendering.
export function localizeQuestion(q: BiQuestion, lang: Lang): GameQuestion {
  return {
    id: q.id, category: q.category,
    type: q.type[lang], question: q.question[lang],
    options: q.options.map(o => ({ id: o.id, emoji: o.emoji, text: o.text[lang], sub: o.sub[lang] })),
  }
}

export const BET_AMOUNTS = [
  { value: 1,  label: '1 credit' },
  { value: 2,  label: '2 credits ⭐' },
  { value: 5,  label: '5 credits 🔥' },
]
