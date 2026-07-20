// ─────────────────────────────────────────────────────────────────
// DateDuel Copy System
// Two languages. One tone: bold, minimal, slightly provocative.
// Greek is NOT a literal translation — it's a tonal adaptation.
// ─────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'gr'

export interface Copy {
  // Nav
  nav: { cta: string; login: string }

  // Hero
  hero: {
    eyebrow:    string
    h1:         string[]   // split so <em> can wrap the accent word
    accentWord: string
    sub:        string
    typewriter: string[]
    ctaPrimary: string
    ctaSecond:  string
  }

  // Proof strip
  proof: {
    showUpRate:  string
    betsPlaced:  string
    ghosting:    string
  }

  // Scenario section
  scenario: {
    label:  string
    lines:  string[]        // last line is always the punch
  }

  // Why section
  why: {
    label:    string
    headline: string
    cards: {
      icon:  string
      title: string
      body:  string
    }[]
  }

  // Stats section
  stats: {
    items: { suffix: string; label: string }[]
  }

  // Testimonials
  testimonials: {
    quote: string
    name:  string
  }[]

  // Filter section
  filter: {
    headline: string
    line1:    string
    line2:    string
  }

  // CTA section
  cta: {
    label:       string
    headline:    string
    sub:         string
    placeholder: string
    button:      string
    fine:        string
  }

  // Final hook
  hook: {
    line: string
    cta:  string
  }

  // Footer
  footer: { tagline: string; copy: string }
}

// ── ENGLISH ────────────────────────────────────────────────────
const en: Copy = {
  nav: { cta: 'Start Playing', login: 'Log In' },

  hero: {
    eyebrow:    'mystery dating through play',
    h1:         ['Meet someone without knowing', 'what they', '.'],
    accentWord: 'look like',
    sub:        'Play. Connect. Discover who they really are.',
    typewriter: ['ghosting.', 'maybe.', 'disappearing.', 'excuses.'],
    ctaPrimary: 'Start Playing',
    ctaSecond:  'Create Account',
  },

  proof: {
    showUpRate: 'show-up rate',
    betsPlaced: 'duels played',
    ghosting:   'ghosting',
  },

  scenario: {
    label: '',
    lines: [],
  },

  why: {
    label:    'why dateduel',
    headline: 'Curiosity comes\nbefore appearance.',
    cards: [
      {
        icon:  '🎭',
        title: 'Mystery before appearance',
        body:  'Get to know the person before you see the photo.',
      },
      {
        icon:  '🎮',
        title: 'Play before judging',
        body:  "Your first impression isn't based on looks.",
      },
      {
        icon:  '💬',
        title: 'Real connections',
        body:  'Conversations that start from genuine curiosity.',
      },
      {
        icon:  '✨',
        title: 'Discovery over swiping',
        body:  'Less scrolling. More meeting people.',
      },
    ],
  },

  stats: {
    items: [
      { suffix: '%', label: 'of duels result in a real date' },
      { suffix: '%', label: 'say personality matters more than photos' },
      { suffix: '%', label: 'ghosting rate among confirmed duels' },
    ],
  },

  testimonials: [
    { quote: '"I fell for who they were before I saw them."', name: 'Alex, 27' },
    { quote: '"It feels intense… but in a good way."',                   name: 'Maria, 24' },
  ],

  filter: {
    headline: "This isn't for everyone.",
    line1:    "If you're just browsing — you'll hate it.",
    line2:    "If you're serious — you'll get it.",
  },

  cta: {
    label:       'ready?',
    headline:    "Meet someone\nworth discovering.",
    sub:         'No algorithms. No endless swiping.\nJust curiosity, play, and real discovery.',
    placeholder: 'your@email.com',
    button:      'Start Playing →',
    fine:        'No spam. No pressure. Just decisions.',
  },

  hook: {
    line: "The best connections begin when you don't know everything at first.",
    cta:  'Start playing →',
  },

  footer: {
    tagline: 'No exit strategy..',
    copy:    '© 2026 DateDuel',
  },
}

// ── GREEK ──────────────────────────────────────────────────────
// Tonal notes:
// - Shorter sentences land harder in Greek
// - "Αυτή" instead of "she" — more personal, almost cinematic
// - Avoid literal translations where they sound stiff
// - The scenario should read like a countdown, not a description
const gr: Copy = {
  nav: { cta: 'Ξεκίνα', login: 'Σύνδεση' },

  hero: {
    eyebrow:    'Δεν υπάρχει έξοδος. Απλά δείξου.',
    h1:         ['Γνώρισε κάποιον χωρίς να ξέρεις', 'πώς', '.'],
    accentWord: 'μοιάζει',
    sub:        'Παίξε. Συνδέσου. Ανακάλυψε ποιος είναι πραγματικά.',
    typewriter: ['ghosting.', 'ίσως.', 'εξαφανίσεις.', 'δικαιολογίες.'],
    ctaPrimary: 'Ξεκίνα να παίζεις',
    ctaSecond:  'Δημιουργία λογαριασμού',
  },

  proof: {
    showUpRate: 'εμφανίστηκαν',
    betsPlaced: 'duels',
    ghosting:   'ghosting',
  },

  scenario: {
    label: '',
    lines: [],
  },

  why: {
    label:    'γιατί dateduel',
    headline: 'Η περιέργεια έρχεται\nπριν την εμφάνιση.',
    cards: [
      {
        icon:  '🎭',
        title: 'Μυστήριο πριν την εμφάνιση',
        body:  'Γνώρισε τον άνθρωπο πριν δεις τη φωτογραφία.',
      },
      {
        icon:  '🎮',
        title: 'Παίξε πριν κρίνεις',
        body:  'Η πρώτη εντύπωση δεν βασίζεται στην εμφάνιση.',
      },
      {
        icon:  '💬',
        title: 'Αληθινές συνδέσεις',
        body:  'Οι συζητήσεις ξεκινούν από την περιέργεια.',
      },
      {
        icon:  '✨',
        title: 'Ανακάλυψη αντί για swipe',
        body:  'Λιγότερο scrolling. Περισσότερη γνωριμία.',
      },
    ],
  },

  stats: {
    items: [
      { suffix: '%', label: 'των στοιχημάτων οδηγούν σε πραγματικό ραντεβού' },
      { suffix: 'x', label: 'πιο πιθανό να εμφανιστείς όταν κάτι διακυβεύεται' },
      { suffix: '%', label: 'ghosting σε επιβεβαιωμένα duels' },
    ],
  },

  testimonials: [
    { quote: '"Πρώτη φορά πήγα σε ραντεβού που είχα κλείσει."', name: 'Αλέξης, 27' },
    { quote: '"Νιώθεις ένταση… αλλά με την καλή έννοια."',       name: 'Μαρία, 24' },
  ],

  filter: {
    headline: 'Δεν είναι για όλους.',
    line1:    'Αν απλά περιηγείσαι — θα το μισήσεις.',
    line2:    'Αν είσαι σοβαρός — θα το καταλάβεις.',
  },

  cta: {
    label:       'έτοιμος;',
    headline:    'Δες αν θα\nεμφανιζόσουν πραγματικά.',
    sub:         'Χωρίς αλγόριθμους. Χωρίς ατελείωτο swipe.\nΜόνο περιέργεια, παιχνίδι και αληθινή ανακάλυψη.',
    placeholder: 'το@email.σου',
    button:      'Ξεκίνα να παίζεις →',
    fine:        'Χωρίς spam. Χωρίς πίεση. Μόνο αποφάσεις.',
  },

  hook: {
    line: 'Οι καλύτερες γνωριμίες ξεκινούν όταν δεν ξέρεις τα πάντα από την πρώτη στιγμή.',
    cta:  'Ξεκίνα να παίζεις →',
  },

  footer: {
    tagline: 'Παίξε. Συνδέσου. Ανακάλυψε.',
    copy:    '© 2026 DateDuel',
  },
}

export const COPY: Record<Lang, Copy> = { en, gr }

// ═══════════════════════════════════════════════════════════════
// APP SCREEN COPY (in-app screens, separate from landing)
// EN: cool, minimal.  GR: human, direct, emotional.
// ═══════════════════════════════════════════════════════════════
export interface AppCopy {
  splash:  { title: string; tagline: string; start: string; haveAccount: string }
  home:    { greeting: string; titleTop: string; titleBottom: string; play: string }
  game:    { you: string; vs: string; timer: string; ctaPicked: string; ctaEmpty: string
             whisperBold: string; whisperHonest: string; whisperSafe: string
             next: string; lastQ: string; progress: string }
  result:  { vibeReading: string; you: string; nextProfile: string; different: string; same: string; playAgain: string; continue: string }
  dating:  { pass: string; play: string; like: string; online: string; offline: string; matchTitle: string; matchSub: string; startGame: string; sendMsg: string; postTitle: string; postSub: string; rematchBtn: string; chatBtn: string; lockDate: string }
  games:   { selectTitle: string; selectSub: string; c4Title: string; c4Desc: string; c4Label: string; tttTitle: string; tttDesc: string; tttLabel: string; ludoTitle: string; ludoDesc: string; ludoLabel: string
             play: string; back: string; you: string; sofia: string
             yourTurn: string; sofiaTurn: string; accept: string; skip: string; draw: string
             accepted: string; skipped: string; sofiaThinking: string; deckEmpty: string; cardDone: string
             roll: string; rolling: string; rolled: string; finish: string; youWin: string; bothWin: string; rematch: string; tapToFlip: string
             playAgain: string; tryAnother: string; lockDuel: string; gameOver: string
             goalCard: string; goalBoard: string; thinking: string; sofiaWent: string; sofiaPassed: string
             youWinCard: string; sofiaWinCard: string; tieCard: string
             msgWin: string; msgLose: string; msgTie: string; pts: string; vs: string }
  bet:     { backHint: string; yourStake: string; bothShow: string; bothShowSub: string
             noShow: string; noShowSub: string; cta: string; ctaHint: string; answersIn: string }
  commit:  { eyebrow: string; titleA: string; titleB: string; titleC: string; intro: string
             countdown: string; ctaReady: string; ctaWait: string; fine: string; locked: string; lockedSub: string
             rules: { icon: string; title: string; body: string }[] }
  locked:  { eyebrow: string; waitingTitle: string; waitingSub: string; committedTitle: string; committedSub: string
             bothTitle: string; bothSub: string; statusWaiting: string; statusMaybe: string; statusClose: string
             you: string; sofia: string; bothIn: string; footer: string
             successTitle: string; successAccent: string; successSub: string
             rewardLabel: string; reward: string; penaltyLabel: string; penalty: string; ctaDontGhost: string }
}

const appEn: AppCopy = {
  splash: { title: 'Play a game together', tagline: 'No chat. Just interaction.', start: 'Start', haveAccount: 'I already have an account' },
  home:   { greeting: 'good evening.', titleTop: 'find your', titleBottom: 'player two.', play: 'Start Game' },
  game:   { you: 'you', vs: 'vs', timer: 'answer before she does',
            ctaPicked: 'lock it in. no regrets.', ctaEmpty: 'pick one.',
            whisperBold: 'you went bold last time.', whisperHonest: 'you were honest last round.', whisperSafe: 'you played it safe before.',
            next: 'Next →', lastQ: 'Choose Game →', progress: 'of' },
  result: { vibeReading: 'vibe reading', you: 'you', nextProfile: 'next profile', different: 'different', same: 'same', playAgain: 'play another round →', continue: 'Choose Game →' },
  dating: {
    pass: 'Skip', play: 'Challenge ⚡', like: 'Challenge 🎮', online: 'Online', offline: 'Offline',
    matchTitle: 'Challenge Accepted!', matchSub: 'Time to play together.',
    startGame: 'Start Playing →', sendMsg: 'Chat first',
    postTitle: 'That was fun.', postSub: 'Now imagine this… in real life.',
    rematchBtn: 'Rematch', chatBtn: 'Keep chatting', lockDate: 'Lock the date →',
  },
  games: {
    selectTitle: 'pick your challenge', selectSub: 'now the fun part. choose how you play.',
    c4Title: 'Connect 4', c4Desc: 'Drop discs. Think fast.', c4Label: 'Most played',
    tttTitle: 'Tic Tac Toe', tttDesc: 'Classic. Quick. Brutal.', tttLabel: 'Quick round',
    ludoTitle: 'Mini Ludo', ludoDesc: 'Roll. Move. Race her.', ludoLabel: 'Chill game',
    play: 'play →', back: '← back', you: 'you', sofia: 'opponent',
    yourTurn: 'your turn', sofiaTurn: "opponent's turn", accept: 'accept', skip: 'skip', draw: 'draw a card',
    accepted: 'you went for it.', skipped: 'you passed.', sofiaThinking: 'opponent is reading it...', deckEmpty: 'deck empty. nice run.', cardDone: 'play again',
    roll: 'roll', rolling: 'rolling...', rolled: 'you rolled', finish: 'finish', youWin: 'you reached the end first.', bothWin: 'you made it. together.', rematch: 'play again', tapToFlip: 'tap to flip',
    playAgain: 'play again →', tryAnother: 'try another game →', lockDuel: 'start a real duel (coming soon)', gameOver: 'that was fun.',
    goalCard: '🎯 most cards taken wins', goalBoard: '🏁 race to the finish',
    thinking: 'opponent is thinking...', sofiaWent: 'opponent went for it.', sofiaPassed: 'opponent passed.',
    youWinCard: 'you won.', sofiaWinCard: 'opponent got you this time.', tieCard: "dead even. a real tie.",
    msgWin: 'she likes someone who commits.', msgLose: "she's tougher than she looks.", msgTie: 'perfectly synced. suspicious.', pts: 'pts', vs: 'vs',
  },
  bet:    { backHint: 'your answers are in.\nnow commit to the date.', yourStake: 'your stake',
            bothShow: 'both show up', bothShowSub: 'you each get {x} credits back. doubled.',
            noShow: 'someone no-shows', noShowSub: 'the no-show loses {x} credits. no exceptions.',
            cta: 'start the duel →', ctaHint: 'read the next screen before confirming.', answersIn: '' },
  commit: { eyebrow: 'before you lock in', titleA: 'this is', titleB: 'a commitment', titleC: 'not a swipe.',
            intro: "you're staking {x} credits on showing up for {name}. she'll stake the same. the duel is real. make sure you are too.",
            countdown: 'read this. {s}s', ctaReady: 'understood. lock it in.', ctaWait: 'read the rules first...',
            fine: 'by confirming, you accept the duel terms.', locked: 'duel locked.', lockedSub: 'your stake is in.\nnow we wait for her.',
            rules: [
              { icon: '🚫', title: 'no backing out.',        body: 'once locked, leaving costs you. not a metaphor — your credits go with you.' },
              { icon: '⏱️', title: '24 hours. hard stop.',    body: 'the date happens within 24h of both locking in. no extensions.' },
              { icon: '📍', title: 'check-in required.',      body: "both of you check in at the same place. that's the proof." },
              { icon: '💸', title: 'no-show = credits gone.', body: 'the person who bails loses their stake. no second chances.' },
            ] },
  locked: { eyebrow: 'duel in progress', waitingTitle: "she hasn't committed yet.", waitingSub: "your stake is locked. hers isn't.",
            committedTitle: 'she committed.', committedSub: "she'll see it soon.",
            bothTitle: 'both locked.', bothSub: 'the duel is real now.',
            statusWaiting: 'almost there.', statusMaybe: 'could go either way.', statusClose: 'any second now.',
            you: 'you', sofia: 'opponent', bothIn: 'both in', footer: "you'll know when she commits.",
            successTitle: 'she committed.', successAccent: 'the duel is set.',
            successSub: '{x} credits each. 24 hours.\nnow go make it worth it.',
            rewardLabel: 'both show up', reward: '+{x} credits',
            penaltyLabel: 'someone no-shows', penalty: '-{x} for the no-show',
            ctaDontGhost: "don't be the no-show →" },
}

const appGr: AppCopy = {
  splash: { title: 'Παίξτε ένα παιχνίδι μαζί', tagline: 'Χωρίς chat. Μόνο αλληλεπίδραση.', start: 'Ξεκίνα', haveAccount: 'Έχω ήδη λογαριασμό' },
  home:   { greeting: 'καλησπέρα.', titleTop: 'βρες τον/την', titleBottom: 'player two σου.', play: 'Ξεκίνα παιχνίδι' },
  game:   { you: 'εσύ', vs: 'vs', timer: 'απάντησε πριν από εκείνη',
            ctaPicked: 'κλείδωσέ το. χωρίς τύψεις.', ctaEmpty: 'διάλεξε.',
            whisperBold: 'την προηγούμενη το ρίσκαρες.', whisperHonest: 'τον προηγούμενο γύρο ήσουν ειλικρινής.', whisperSafe: 'πριν το έπαιξες ασφαλές.',
            next: 'Επόμενη →', lastQ: 'Διάλεξε παιχνίδι →', progress: 'από' },
  result: { vibeReading: 'η χημεία σας', you: 'εσύ', nextProfile: 'επόμενο προφίλ', different: 'διαφορετικά', same: 'ίδια', playAgain: 'παίξε άλλον έναν γύρο →', continue: 'Διάλεξε παιχνίδι →' },
  dating: {
    pass: 'Πέρνα', play: 'Πρόκληση ⚡', like: 'Πρόκληση 🎮', online: 'Online', offline: 'Offline',
    matchTitle: 'Πρόκληση Αποδεκτή!', matchSub: 'Ώρα να παίξετε μαζί.',
    startGame: 'Ξεκίνα να παίζεις →', sendMsg: 'Πρώτα chat',
    postTitle: 'Ωραία ήταν.', postSub: 'Τώρα φαντάσου αυτό… στην πραγματικότητα.',
    rematchBtn: 'Ρεβάνς', chatBtn: 'Συνέχισε κουβέντα', lockDate: 'Κλείδωσε το ραντεβού →',
  },
  games: {
    selectTitle: 'διάλεξε πρόκληση', selectSub: 'τώρα το ωραίο. διάλεξε πώς θα παίξετε.',
    c4Title: 'Σκορ 4', c4Desc: 'Ρίξε δίσκους. Σκέψου γρήγορα.', c4Label: 'Δημοφιλές',
    tttTitle: 'Τρίλιζα', tttDesc: 'Κλασικό. Γρήγορο. Σκληρό.', tttLabel: 'Γρήγορος γύρος',
    ludoTitle: 'Mini Ludo', ludoDesc: 'Ρίξε. Προχώρα. Νίκησέ την.', ludoLabel: 'Χαλαρό',
    play: 'παίξε →', back: '← πίσω', you: 'εσύ', sofia: 'αντίπαλος',
    yourTurn: 'σειρά σου', sofiaTurn: 'σειρά αντιπάλου', accept: 'το δέχομαι', skip: 'πάσο', draw: 'τράβα κάρτα',
    accepted: 'το έκανες.', skipped: 'πάσαρες.', sofiaThinking: 'ο αντίπαλος το διαβάζει...', deckEmpty: 'τέλος η τράπουλα. ωραία ήταν.', cardDone: 'παίξε ξανά',
    roll: 'ρίξε', rolling: 'ρίχνει...', rolled: 'έφερες', finish: 'τέλος', youWin: 'έφτασες πρώτος στο τέλος.', bothWin: 'τα καταφέρατε. μαζί.', rematch: 'παίξε ξανά', tapToFlip: 'πάτα να γυρίσεις',
    playAgain: 'παίξε ξανά →', tryAnother: 'άλλο παιχνίδι →', lockDuel: 'ξεκίνα αληθινό duel (σύντομα)', gameOver: 'ωραία ήταν.',
    goalCard: '🎯 όποιος πάρει πιο πολλές κάρτες', goalBoard: '🏁 τρέξε ως το τέλος',
    thinking: 'ο αντίπαλος σκέφτεται...', sofiaWent: 'ο αντίπαλος το έκανε.', sofiaPassed: 'ο αντίπαλος πάσαρε.',
    youWinCard: 'νίκησες!', sofiaWinCard: 'σε κέρδισε αυτή τη φορά.', tieCard: 'απόλυτη ισοπαλία.',
    msgWin: 'της αρέσει κάποιος που δεσμεύεται.', msgLose: 'είναι πιο σκληρή απ' + "'" + ' ό,τι δείχνει.', msgTie: 'τέλεια ταιριαστοί. ύποπτο.', pts: 'πόντοι', vs: 'vs',
  },
  bet:    { backHint: 'οι απαντήσεις σας μπήκαν.\nτώρα δεσμεύσου για το ραντεβού.', yourStake: 'το στοίχημά σου',
            bothShow: 'εμφανίζεστε κι οι δύο', bothShowSub: 'παίρνετε ο καθένας {x} credits πίσω. διπλά.',
            noShow: 'κάποιος δεν εμφανίζεται', noShowSub: 'όποιος λείψει χάνει {x} credits. χωρίς εξαιρέσεις.',
            cta: 'ξεκίνα το duel →', ctaHint: 'διάβασε την επόμενη οθόνη πριν επιβεβαιώσεις.', answersIn: '' },
  commit: { eyebrow: 'πριν κλειδώσεις', titleA: 'αυτό είναι', titleB: 'δέσμευση', titleC: 'όχι swipe.',
            intro: 'ποντάρεις {x} credits στο ότι θα εμφανιστείς για τη {name}. θα ποντάρει κι εκείνη το ίδιο. το duel είναι αληθινό. φρόντισε να είσαι κι εσύ.',
            countdown: 'διάβασέ το. {s}δ', ctaReady: 'το κατάλαβα. κλείδωσέ το.', ctaWait: 'διάβασε πρώτα τους κανόνες...',
            fine: 'επιβεβαιώνοντας, αποδέχεσαι τους όρους του duel.', locked: 'το duel κλείδωσε.', lockedSub: 'το στοίχημά σου μπήκε.\nτώρα περιμένουμε εκείνη.',
            rules: [
              { icon: '🚫', title: 'δεν κάνεις πίσω.',          body: 'μόλις κλειδώσει, το να φύγεις κοστίζει. όχι μεταφορικά — τα credits φεύγουν μαζί σου.' },
              { icon: '⏱️', title: '24 ώρες. τελεία.',          body: 'το ραντεβού γίνεται μέσα σε 24 ώρες από τη στιγμή που κλειδώνετε κι οι δύο. χωρίς παρατάσεις.' },
              { icon: '📍', title: 'απαιτείται check-in.',       body: 'κάνετε check-in κι οι δύο στο ίδιο μέρος. αυτή είναι η απόδειξη.' },
              { icon: '💸', title: 'δεν ήρθες = credits χάθηκαν.', body: 'όποιος κάνει πίσω χάνει το στοίχημά του. χωρίς δεύτερες ευκαιρίες.' },
            ] },
  locked: { eyebrow: 'duel σε εξέλιξη', waitingTitle: 'δεν έχει δεσμευτεί ακόμα.', waitingSub: 'το δικό σου κλείδωσε. το δικό της όχι.',
            committedTitle: 'δεσμεύτηκε.', committedSub: 'θα το δει σύντομα.',
            bothTitle: 'κλειδώσατε κι οι δύο.', bothSub: 'τώρα το duel είναι αληθινό.',
            statusWaiting: 'σχεδόν φτάσαμε.', statusMaybe: 'όλα ανοιχτά.', statusClose: 'από στιγμή σε στιγμή.',
            you: 'εσύ', sofia: 'αντίπαλος', bothIn: 'κι οι δύο μέσα', footer: 'θα μάθεις μόλις δεσμευτεί.',
            successTitle: 'δεσμεύτηκε.', successAccent: 'το duel ορίστηκε.',
            successSub: '{x} credits ο καθένας. 24 ώρες.\nκάν' + "'" + 'το να αξίζει.',
            rewardLabel: 'εμφανίζεστε κι οι δύο', reward: '+{x} credits',
            penaltyLabel: 'κάποιος δεν εμφανίζεται', penalty: '-{x} για όποιον λείψει',
            ctaDontGhost: 'μην είσαι εσύ που θα λείψει →' },
}

export const APP_COPY: Record<Lang, AppCopy> = { en: appEn, gr: appGr }
