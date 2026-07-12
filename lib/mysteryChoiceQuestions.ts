// Mystery Choice — dating conversation engine
// DateDuel is NOT a trivia game. Every question exists to help two people
// on a first or second date understand each other and spark real conversation
// afterward. Questions are organized into 5 conversation themes mapped to
// fixed round positions, and each answer carries trait metadata used for a
// meaningful, conversation-oriented compatibility reveal (not a raw score).

export type MysteryChoiceTheme = 'ice_breaker' | 'lifestyle' | 'personality' | 'relationships' | 'future'
export type MysteryQuestionType = 'binary' | 'multi'

export interface MysteryQuestion {
  id: string
  category: MysteryChoiceTheme   // conversation theme (also drives which round it appears in)
  difficulty: 1 | 2 | 3           // kept for type compatibility; theme now drives round placement
  conversationGoal: string        // why this question exists — what it helps two people learn
  conversationGoalGr: string
  weight: number                  // 1-3, how much this question matters for compatibility
  type: MysteryQuestionType       // 'binary' = either/or (2 options), 'multi' = 4-option single-select
  question: string
  questionGr: string
  options: string[]
  optionsGr: string[]
  optionTraits: string[][]        // traits earned per option (parallel to options), e.g. ['likes_travel']
}

// Emoji per theme, used when rendering a round (visual only)
export const THEME_EMOJI: Record<MysteryChoiceTheme, [string, string]> = {
  ice_breaker: ['☕', '👋'],
  lifestyle: ['🌿', '⚡'],
  personality: ['📚', '🧠'],
  relationships: ['❤️', '💬'],
  future: ['💍', '🌟'],
}

// Round position → conversation theme (rounds are 0-indexed: round 0 = Round 1)
export const ROUND_THEME_ORDER: MysteryChoiceTheme[] = [
  'ice_breaker', 'ice_breaker', 'lifestyle', 'lifestyle', 'personality',
  'personality', 'relationships', 'relationships', 'future', 'future',
]

// 72 conversation-focused questions across 5 themes
export const MYSTERY_QUESTIONS: MysteryQuestion[] = [
  { id: 'ice_breaker_weekend', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Understand how they enjoy free time', conversationGoalGr: 'Κατανόηση του πώς περνά τον ελεύθερο χρόνο', weight: 2, type: 'multi', question: 'How do you usually spend your weekends?', questionGr: 'Πώς περνάς συνήθως τα Σαββατοκύριακά σου;', options: ['Exploring outdoors', 'Relaxing at home', 'Out with friends', 'Trying new places'], optionsGr: ['Εξερεύνηση έξω', 'Χαλάρωση σπίτι', 'Έξοδος με φίλους', 'Δοκιμή νέων μερών'], optionTraits: [['outdoor_person'], ['homebody'], ['social'], ['adventurous']] },
  { id: 'ice_breaker_vacation', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn their travel style', conversationGoalGr: 'Μάθε το στιλ ταξιδιού του/της', weight: 2, type: 'multi', question: 'What type of vacation do you enjoy?', questionGr: 'Τι είδους διακοπές απολαμβάνεις;', options: ['Beach relaxation', 'Adventure trip', 'City exploring', 'Cozy cabin getaway'], optionsGr: ['Χαλάρωση σε παραλία', 'Ταξίδι περιπέτειας', 'Εξερεύνηση πόλης', 'Καλύβα στη φύση'], optionTraits: [['relaxed'], ['adventurous'], ['likes_travel'], ['homebody']] },
  { id: 'ice_breaker_date_style', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn their preferred first-date vibe', conversationGoalGr: 'Μάθε το στιλ πρώτου ραντεβού που προτιμά', weight: 1, type: 'binary', question: 'Coffee date or dinner date?', questionGr: 'Ραντεβού για καφέ ή για δείπνο;', options: ['Coffee date', 'Dinner date'], optionsGr: ['Καφές', 'Δείπνο'], optionTraits: [['casual'], ['romantic']] },
  { id: 'ice_breaker_morning_night', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Understand their daily rhythm', conversationGoalGr: 'Κατανόηση του καθημερινού ρυθμού', weight: 1, type: 'binary', question: 'Morning person or night person?', questionGr: 'Πρωινός ή νυχτερινός τύπος;', options: ['Morning person', 'Night person'], optionsGr: ['Πρωινός τύπος', 'Νυχτερινός τύπος'], optionTraits: [['early_riser'], ['night_owl']] },
  { id: 'ice_breaker_unwind', category: 'ice_breaker', difficulty: 2, conversationGoal: 'See how they decompress', conversationGoalGr: 'Δες πώς αποφορτίζεται', weight: 2, type: 'multi', question: 'What\'s your favorite way to unwind after a long day?', questionGr: 'Ποιος είναι ο αγαπημένος σου τρόπος να χαλαρώνεις μετά από μια κουραστική μέρα;', options: ['Watching a movie', 'Going for a walk', 'Talking to someone', 'Reading or music'], optionsGr: ['Ταινία', 'Βόλτα', 'Κουβέντα με κάποιον', 'Διάβασμα ή μουσική'], optionTraits: [['homebody'], ['outdoor_person'], ['social'], ['introvert']] },
  { id: 'ice_breaker_city_nature', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn their environment preference', conversationGoalGr: 'Μάθε την προτίμηση περιβάλλοντος', weight: 1, type: 'binary', question: 'City life or nature escapes?', questionGr: 'Ζωή στην πόλη ή αποδράσεις στη φύση;', options: ['City life', 'Nature escapes'], optionsGr: ['Πόλη', 'Φύση'], optionTraits: [['city_person'], ['outdoor_person']] },
  { id: 'ice_breaker_foodie', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Discover their food personality', conversationGoalGr: 'Ανακάλυψε την προσωπικότητα φαγητού', weight: 2, type: 'multi', question: 'What\'s your go-to way to enjoy good food?', questionGr: 'Ποιος είναι ο αγαπημένος σου τρόπος να απολαμβάνεις καλό φαγητό;', options: ['Trying new restaurants', 'A favorite go-to spot', 'Cooking at home', 'Street food adventures'], optionsGr: ['Νέα εστιατόρια', 'Το αγαπημένο σου μέρος', 'Μαγειρική σπίτι', 'Street food περιπέτειες'], optionTraits: [['adventurous'], ['creature_of_habit'], ['homebody'], ['adventurous']] },
  { id: 'ice_breaker_rainy_day', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn their comfort-day preferences', conversationGoalGr: 'Μάθε τις προτιμήσεις τους σε μια ήσυχη μέρα', weight: 1, type: 'multi', question: 'What\'s your ideal rainy day activity?', questionGr: 'Ποια είναι η ιδανική σου δραστηριότητα σε μια βροχερή μέρα;', options: ['Movies and blankets', 'Reading a book', 'Cooking something warm', 'Catching up with someone'], optionsGr: ['Ταινίες και κουβέρτες', 'Διάβασμα', 'Μαγειρική κάτι ζεστό', 'Κουβέντα με κάποιον'], optionTraits: [['homebody'], ['introvert'], ['homebody'], ['social']] },
  { id: 'ice_breaker_dream_getaway', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn what recharges them most', conversationGoalGr: 'Μάθε τι τους φορτίζει περισσότερο', weight: 2, type: 'multi', question: 'If you could take a weekend getaway right now, where would you go?', questionGr: 'Αν μπορούσες να πας ένα Σαββατοκύριακο απόδρασης τώρα, πού θα πήγαινες;', options: ['A beach somewhere warm', 'A cabin in the mountains', 'A city I\'ve never visited', 'Nowhere — staying home sounds perfect'], optionsGr: ['Παραλία κάπου ζεστά', 'Καλύβα στα βουνά', 'Μια πόλη που δεν έχω επισκεφτεί', 'Πουθενά — το σπίτι ακούγεται τέλειο'], optionTraits: [['relaxed'], ['outdoor_person'], ['adventurous'], ['homebody']] },
  { id: 'ice_breaker_season', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Light, easy conversation starter', conversationGoalGr: 'Ελαφριά, εύκολη αφορμή συζήτησης', weight: 1, type: 'multi', question: 'What\'s your favorite season?', questionGr: 'Ποια είναι η αγαπημένη σου εποχή;', options: ['Summer', 'Winter', 'Spring', 'Autumn'], optionsGr: ['Καλοκαίρι', 'Χειμώνας', 'Άνοιξη', 'Φθινόπωρο'], optionTraits: [['outdoor_person'], ['homebody'], ['romantic'], ['relaxed']] },
  { id: 'ice_breaker_text_call', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn communication preference', conversationGoalGr: 'Μάθε προτίμηση επικοινωνίας', weight: 1, type: 'binary', question: 'Better texter or better caller?', questionGr: 'Καλύτερος/η στα μηνύματα ή στις κλήσεις;', options: ['Texter', 'Caller'], optionsGr: ['Μηνύματα', 'Κλήσεις'], optionTraits: [['introvert'], ['social']] },
  { id: 'ice_breaker_plans_style', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn planning style early', conversationGoalGr: 'Μάθε το στιλ σχεδιασμού νωρίς', weight: 1, type: 'binary', question: 'Plan ahead or decide on the day?', questionGr: 'Σχεδιάζεις από πριν ή αποφασίζεις την ίδια μέρα;', options: ['Plan ahead', 'Decide on the day'], optionsGr: ['Σχεδιάζω από πριν', 'Αποφασίζω την ίδια μέρα'], optionTraits: [['planner'], ['spontaneous']] },
  { id: 'ice_breaker_hosting', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn their social hosting style', conversationGoalGr: 'Μάθε το κοινωνικό στιλ φιλοξενίας', weight: 1, type: 'binary', question: 'Host the get-together or show up as a guest?', questionGr: 'Φιλοξενείς τη συγκέντρωση ή πηγαίνεις ως καλεσμένος/η;', options: ['Host it', 'Show up as a guest'], optionsGr: ['Φιλοξενώ', 'Καλεσμένος/η'], optionTraits: [['social'], ['relaxed']] },
  { id: 'ice_breaker_first_impression', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn what stands out to them', conversationGoalGr: 'Μάθε τι τους κάνει εντύπωση', weight: 2, type: 'multi', question: 'What usually makes a great first impression on you?', questionGr: 'Τι σου κάνει συνήθως καλή πρώτη εντύπωση;', options: ['A genuine sense of humor', 'Confidence', 'Kindness to others', 'Good conversation'], optionsGr: ['Αυθεντικό χιούμορ', 'Αυτοπεποίθηση', 'Καλοσύνη προς άλλους', 'Καλή κουβέντα'], optionTraits: [['playful'], ['confident'], ['kind'], ['deep_talker']] },
  { id: 'ice_breaker_energy_source', category: 'ice_breaker', difficulty: 2, conversationGoal: 'Learn how they recharge socially', conversationGoalGr: 'Μάθε πώς επαναφορτίζεται κοινωνικά', weight: 2, type: 'multi', question: 'After a busy week, what sounds most appealing?', questionGr: 'Μετά από μια γεμάτη εβδομάδα, τι σου ακούγεται πιο ελκυστικό;', options: ['A night out with friends', 'A quiet night alone', 'One-on-one time with someone', 'An active outing'], optionsGr: ['Βραδιά έξω με φίλους', 'Ήσυχη βραδιά μόνος/η', 'Χρόνος έναν προς έναν', 'Δραστήρια έξοδος'], optionTraits: [['extrovert'], ['introvert'], ['romantic'], ['outdoor_person']] },
  { id: 'lifestyle_hobby', category: 'lifestyle', difficulty: 2, conversationGoal: 'Discover what they\'re passionate about', conversationGoalGr: 'Ανακάλυψε το πάθος του/της', weight: 2, type: 'multi', question: 'What hobby do you enjoy the most?', questionGr: 'Ποιο χόμπι απολαμβάνεις περισσότερο;', options: ['Something creative', 'Sports or fitness', 'Reading or learning', 'Being outdoors'], optionsGr: ['Κάτι δημιουργικό', 'Άθλημα ή γυμναστική', 'Διάβασμα ή μάθηση', 'Στη φύση'], optionTraits: [['creative'], ['active'], ['curious'], ['outdoor_person']] },
  { id: 'lifestyle_relax_after_work', category: 'lifestyle', difficulty: 2, conversationGoal: 'See how they wind down daily', conversationGoalGr: 'Δες πώς αποφορτίζεται καθημερινά', weight: 1, type: 'multi', question: 'How do you usually relax after work?', questionGr: 'Πώς χαλαρώνεις συνήθως μετά τη δουλειά;', options: ['Exercise', 'TV or a show', 'Cooking', 'Calling someone I care about'], optionsGr: ['Άσκηση', 'Τηλεόραση ή σειρά', 'Μαγειρική', 'Κλήση σε κάποιον που νοιάζομαι'], optionTraits: [['active'], ['homebody'], ['homebody'], ['romantic']] },
  { id: 'lifestyle_plan_spontaneous', category: 'lifestyle', difficulty: 2, conversationGoal: 'Understand how they approach life', conversationGoalGr: 'Κατανόηση του πώς προσεγγίζει τη ζωή', weight: 2, type: 'binary', question: 'Do you enjoy planning or being spontaneous?', questionGr: 'Απολαμβάνεις τον σχεδιασμό ή τον αυθορμητισμό;', options: ['Planning', 'Being spontaneous'], optionsGr: ['Σχεδιασμό', 'Αυθορμητισμό'], optionTraits: [['planner'], ['spontaneous']] },
  { id: 'lifestyle_home_vibe', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn what home feels like to them', conversationGoalGr: 'Μάθε τι σημαίνει σπίτι γι\' αυτούς', weight: 1, type: 'multi', question: 'What does your ideal living space feel like?', questionGr: 'Πώς νιώθεις τον ιδανικό σου χώρο διαβίωσης;', options: ['Clean and minimal', 'Cozy and full of memories', 'Always ready for guests', 'Wherever feels peaceful'], optionsGr: ['Καθαρό και μινιμαλιστικό', 'Ζεστό και γεμάτο αναμνήσεις', 'Πάντα έτοιμο για καλεσμένους', 'Όπου νιώθεις ηρεμία'], optionTraits: [['planner'], ['sentimental'], ['social'], ['relaxed']] },
  { id: 'lifestyle_cook_order', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn their everyday routine', conversationGoalGr: 'Μάθε την καθημερινή του/της ρουτίνα', weight: 1, type: 'binary', question: 'Cook at home or order in?', questionGr: 'Μαγειρεύεις σπίτι ή παραγγέλνεις;', options: ['Cook at home', 'Order in'], optionsGr: ['Μαγειρεύω σπίτι', 'Παραγγέλνω'], optionTraits: [['homebody'], ['relaxed']] },
  { id: 'lifestyle_pets', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn if pets matter to them', conversationGoalGr: 'Μάθε αν τα κατοικίδια έχουν σημασία', weight: 1, type: 'multi', question: 'How do you feel about pets in your life?', questionGr: 'Πώς νιώθεις για τα κατοικίδια στη ζωή σου;', options: ['Can\'t live without one', 'Would love one someday', 'Happy to be around them, not for me', 'Not really a pet person'], optionsGr: ['Δεν ζω χωρίς', 'Θα ήθελα κάποια μέρα', 'Χαίρομαι να είμαι κοντά τους, όχι για μένα', 'Όχι ιδιαίτερα'], optionTraits: [['pet_lover'], ['pet_lover'], ['relaxed'], ['independent']] },
  { id: 'lifestyle_work_life_balance', category: 'lifestyle', difficulty: 2, conversationGoal: 'Understand their priorities', conversationGoalGr: 'Κατανόηση των προτεραιοτήτων τους', weight: 2, type: 'binary', question: 'Do you prioritize work-life balance or ambition and drive?', questionGr: 'Δίνεις προτεραιότητα στην ισορροπία ζωής-δουλειάς ή στη φιλοδοξία;', options: ['Balance', 'Ambition and drive'], optionsGr: ['Ισορροπία', 'Φιλοδοξία'], optionTraits: [['balanced'], ['career_focused']] },
  { id: 'lifestyle_active_lifestyle', category: 'lifestyle', difficulty: 2, conversationGoal: 'See how movement fits their life', conversationGoalGr: 'Δες πώς η κίνηση ταιριάζει στη ζωή τους', weight: 1, type: 'multi', question: 'How active is your day-to-day lifestyle?', questionGr: 'Πόσο δραστήριος είναι ο καθημερινός σου τρόπος ζωής;', options: ['Very active — I move every day', 'Active a few times a week', 'I prefer calm and steady', 'Depends on my mood'], optionsGr: ['Πολύ δραστήριος — κάθε μέρα', 'Δραστήριος μερικές φορές τη βδομάδα', 'Προτιμώ την ηρεμία', 'Εξαρτάται από τη διάθεσή μου'], optionTraits: [['active'], ['active'], ['relaxed'], ['spontaneous']] },
  { id: 'lifestyle_host_guest', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn how they show hospitality', conversationGoalGr: 'Μάθε πώς δείχνει φιλοξενία', weight: 1, type: 'binary', question: 'Do you enjoy hosting people or visiting others?', questionGr: 'Σου αρέσει να φιλοξενείς κόσμο ή να επισκέπτεσαι άλλους;', options: ['Hosting people', 'Visiting others'], optionsGr: ['Φιλοξενώ', 'Επισκέπτομαι'], optionTraits: [['social'], ['relaxed']] },
  { id: 'lifestyle_minimalist_collector', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn their relationship with things', conversationGoalGr: 'Μάθε τη σχέση τους με τα πράγματα', weight: 1, type: 'binary', question: 'Minimalist or sentimental collector?', questionGr: 'Μινιμαλιστής/τρια ή συναισθηματικός συλλέκτης;', options: ['Minimalist', 'Sentimental collector'], optionsGr: ['Μινιμαλιστής/τρια', 'Συναισθηματικός συλλέκτης'], optionTraits: [['planner'], ['sentimental']] },
  { id: 'lifestyle_tech_balance', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn their relationship with tech', conversationGoalGr: 'Μάθε τη σχέση τους με την τεχνολογία', weight: 1, type: 'multi', question: 'How do you feel about unplugging from technology?', questionGr: 'Πώς νιώθεις για το να αποσυνδέεσαι από την τεχνολογία;', options: ['I love a full digital detox', 'I unplug sometimes', 'I\'m always a bit connected', 'I couldn\'t imagine unplugging'], optionsGr: ['Λατρεύω πλήρη αποσύνδεση', 'Αποσυνδέομαι μερικές φορές', 'Είμαι πάντα λίγο συνδεδεμένος/η', 'Δεν θα μπορούσα να αποσυνδεθώ'], optionTraits: [['outdoor_person'], ['balanced'], ['career_focused'], ['career_focused']] },
  { id: 'lifestyle_money_style', category: 'lifestyle', difficulty: 2, conversationGoal: 'Understand their money mindset', conversationGoalGr: 'Κατανόηση της νοοτροπίας τους για τα χρήματα', weight: 2, type: 'multi', question: 'How would you describe your relationship with money?', questionGr: 'Πώς θα περιέγραφες τη σχέση σου με τα χρήματα;', options: ['I save carefully for the future', 'I spend on experiences I\'ll remember', 'A healthy mix of both', 'I don\'t think about it much'], optionsGr: ['Αποταμιεύω προσεκτικά για το μέλλον', 'Ξοδεύω σε εμπειρίες που θα θυμάμαι', 'Υγιής συνδυασμός και των δύο', 'Δεν το σκέφτομαι πολύ'], optionTraits: [['planner'], ['spontaneous'], ['balanced'], ['relaxed']] },
  { id: 'lifestyle_morning_routine', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn their daily structure', conversationGoalGr: 'Μάθε την καθημερινή δομή τους', weight: 1, type: 'binary', question: 'Structured morning routine or wing it as you go?', questionGr: 'Δομημένη πρωινή ρουτίνα ή αυτοσχεδιασμός;', options: ['Structured routine', 'Wing it'], optionsGr: ['Δομημένη ρουτίνα', 'Αυτοσχεδιασμός'], optionTraits: [['planner'], ['spontaneous']] },
  { id: 'lifestyle_weekday_weekend', category: 'lifestyle', difficulty: 2, conversationGoal: 'Learn how they balance structure and freedom', conversationGoalGr: 'Μάθε πώς ισορροπούν δομή και ελευθερία', weight: 1, type: 'multi', question: 'How do your weekdays usually feel compared to weekends?', questionGr: 'Πώς νιώθουν συνήθως οι καθημερινές σου σε σχέση με τα Σαββατοκύριακα;', options: ['Very structured, then I let loose', 'Pretty similar every day', 'Busy all week, need full rest after', 'I keep some spontaneity every day'], optionsGr: ['Πολύ δομημένες, μετά χαλαρώνω', 'Αρκετά όμοιες κάθε μέρα', 'Γεμάτες όλη τη βδομάδα, χρειάζομαι ξεκούραση', 'Κρατάω αυθορμητισμό κάθε μέρα'], optionTraits: [['planner'], ['balanced'], ['career_focused'], ['spontaneous']] },
  { id: 'personality_laugh', category: 'personality', difficulty: 2, conversationGoal: 'Learn their sense of humor', conversationGoalGr: 'Μάθε το χιούμορ τους', weight: 2, type: 'multi', question: 'What makes you laugh the most?', questionGr: 'Τι σε κάνει να γελάς περισσότερο;', options: ['Witty, clever jokes', 'Silly, goofy humor', 'Sarcasm', 'Funny stories from real life'], optionsGr: ['Έξυπνα, ευφυή αστεία', 'Χαζό, παιχνιδιάρικο χιούμορ', 'Σαρκασμός', 'Αστείες ιστορίες από την πραγματική ζωή'], optionTraits: [['witty'], ['playful'], ['witty'], ['storyteller']] },
  { id: 'personality_friends_describe', category: 'personality', difficulty: 2, conversationGoal: 'See how others see them', conversationGoalGr: 'Δες πώς τους βλέπουν οι άλλοι', weight: 2, type: 'multi', question: 'How do your friends usually describe you?', questionGr: 'Πώς σε περιγράφουν συνήθως οι φίλοι σου;', options: ['The dependable one', 'The funny one', 'The adventurous one', 'The thoughtful listener'], optionsGr: ['Ο/Η αξιόπιστος/η', 'Ο/Η αστείος/α', 'Ο/Η περιπετειώδης', 'Ο/Η στοχαστικός ακροατής'], optionTraits: [['dependable'], ['playful'], ['adventurous'], ['deep_talker']] },
  { id: 'personality_motivation', category: 'personality', difficulty: 2, conversationGoal: 'Understand what drives them', conversationGoalGr: 'Κατανόηση του τι τους παρακινεί', weight: 2, type: 'multi', question: 'What motivates you most in life?', questionGr: 'Τι σε παρακινεί περισσότερο στη ζωή;', options: ['Growth and self-improvement', 'Family and close relationships', 'Achievement and success', 'Freedom and new experiences'], optionsGr: ['Ανάπτυξη και αυτοβελτίωση', 'Οικογένεια και στενές σχέσεις', 'Επίτευξη και επιτυχία', 'Ελευθερία και νέες εμπειρίες'], optionTraits: [['growth_minded'], ['likes_family'], ['career_focused'], ['adventurous']] },
  { id: 'personality_introvert_extrovert', category: 'personality', difficulty: 2, conversationGoal: 'Learn their social energy', conversationGoalGr: 'Μάθε την κοινωνική τους ενέργεια', weight: 2, type: 'binary', question: 'Do you recharge alone or around people?', questionGr: 'Επαναφορτίζεσαι μόνος/η ή με κόσμο γύρω σου;', options: ['Alone', 'Around people'], optionsGr: ['Μόνος/η', 'Με κόσμο'], optionTraits: [['introvert'], ['extrovert']] },
  { id: 'personality_stress_handling', category: 'personality', difficulty: 2, conversationGoal: 'Learn how they cope under pressure', conversationGoalGr: 'Μάθε πώς αντιμετωπίζουν την πίεση', weight: 2, type: 'multi', question: 'How do you usually handle a stressful day?', questionGr: 'Πώς αντιμετωπίζεις συνήθως μια αγχωτική μέρα;', options: ['Talk it through with someone', 'Need quiet time alone', 'Get moving — exercise helps', 'Distract myself with something fun'], optionsGr: ['Το συζητάς με κάποιον', 'Χρειάζεσαι ήσυχο χρόνο μόνος/η', 'Κινείσαι — η άσκηση βοηθά', 'Αποσπάς την προσοχή σου με κάτι διασκεδαστικό'], optionTraits: [['deep_talker'], ['introvert'], ['active'], ['playful']] },
  { id: 'personality_heart_head', category: 'personality', difficulty: 2, conversationGoal: 'Learn their decision-making style', conversationGoalGr: 'Μάθε το στιλ λήψης αποφάσεων', weight: 2, type: 'binary', question: 'Do you decide with your heart or your head?', questionGr: 'Αποφασίζεις με την καρδιά ή το μυαλό;', options: ['Heart', 'Head'], optionsGr: ['Καρδιά', 'Μυαλό'], optionTraits: [['romantic'], ['planner']] },
  { id: 'personality_proud_of', category: 'personality', difficulty: 2, conversationGoal: 'Learn what they value about themselves', conversationGoalGr: 'Μάθε τι εκτιμούν στον εαυτό τους', weight: 2, type: 'multi', question: 'What are you most proud of in yourself?', questionGr: 'Για τι είσαι πιο περήφανος/η στον εαυτό σου;', options: ['How far I\'ve grown', 'The people I care for', 'What I\'ve built or achieved', 'Staying true to myself'], optionsGr: ['Πόσο έχεις εξελιχθεί', 'Οι άνθρωποι που νοιάζεσαι', 'Ό,τι έχεις χτίσει', 'Το ότι μένεις πιστός/ή στον εαυτό σου'], optionTraits: [['growth_minded'], ['likes_family'], ['career_focused'], ['independent']] },
  { id: 'personality_strength_in_relationship', category: 'personality', difficulty: 2, conversationGoal: 'Learn their relational strengths', conversationGoalGr: 'Μάθε τα δυνατά σημεία τους στη σχέση', weight: 2, type: 'multi', question: 'What do you think you bring most to a relationship?', questionGr: 'Τι πιστεύεις ότι προσφέρεις περισσότερο σε μια σχέση;', options: ['Loyalty', 'Humor and lightness', 'Deep emotional support', 'Adventure and spontaneity'], optionsGr: ['Αφοσίωση', 'Χιούμορ και ελαφρότητα', 'Βαθιά συναισθηματική στήριξη', 'Περιπέτεια και αυθορμητισμό'], optionTraits: [['dependable'], ['playful'], ['deep_talker'], ['spontaneous']] },
  { id: 'personality_recharge', category: 'personality', difficulty: 2, conversationGoal: 'Learn what restores their energy', conversationGoalGr: 'Μάθε τι τους επαναφορτίζει', weight: 1, type: 'binary', question: 'Do you recharge best with rest or with activity?', questionGr: 'Επαναφορτίζεσαι καλύτερα με ξεκούραση ή δραστηριότητα;', options: ['Rest', 'Activity'], optionsGr: ['Ξεκούραση', 'Δραστηριότητα'], optionTraits: [['relaxed'], ['active']] },
  { id: 'personality_optimist_realist', category: 'personality', difficulty: 2, conversationGoal: 'Learn their outlook on life', conversationGoalGr: 'Μάθε την οπτική τους στη ζωή', weight: 1, type: 'binary', question: 'Optimist or realist?', questionGr: 'Αισιόδοξος/η ή ρεαλιστής/τρια;', options: ['Optimist', 'Realist'], optionsGr: ['Αισιόδοξος/η', 'Ρεαλιστής/τρια'], optionTraits: [['optimist'], ['realist']] },
  { id: 'personality_competitive', category: 'personality', difficulty: 2, conversationGoal: 'Learn their playful side', conversationGoalGr: 'Μάθε την παιχνιδιάρικη πλευρά τους', weight: 1, type: 'binary', question: 'Competitive or laid-back when playing games?', questionGr: 'Ανταγωνιστικός/ή ή χαλαρός/ή σε παιχνίδια;', options: ['Competitive', 'Laid-back'], optionsGr: ['Ανταγωνιστικός/ή', 'Χαλαρός/ή'], optionTraits: [['playful'], ['relaxed']] },
  { id: 'personality_creative_outlet', category: 'personality', difficulty: 2, conversationGoal: 'Learn how they express themselves', conversationGoalGr: 'Μάθε πώς εκφράζονται', weight: 1, type: 'multi', question: 'How do you like to express yourself creatively?', questionGr: 'Πώς σου αρέσει να εκφράζεσαι δημιουργικά;', options: ['Music', 'Writing', 'Cooking', 'I don\'t feel very creative'], optionsGr: ['Μουσική', 'Γράψιμο', 'Μαγειρική', 'Δεν νιώθω πολύ δημιουργικός/ή'], optionTraits: [['creative'], ['creative'], ['creative'], ['realist']] },
  { id: 'personality_feel_most_myself', category: 'personality', difficulty: 2, conversationGoal: 'Learn where they feel authentic', conversationGoalGr: 'Μάθε πού νιώθουν αυθεντικοί', weight: 2, type: 'multi', question: 'When do you feel most like yourself?', questionGr: 'Πότε νιώθεις πιο πολύ τον εαυτό σου;', options: ['With close friends', 'Alone with my thoughts', 'Out exploring something new', 'With the people I love most'], optionsGr: ['Με στενούς φίλους', 'Μόνος/η με τις σκέψεις μου', 'Εξερευνώντας κάτι νέο', 'Με τους ανθρώπους που αγαπώ περισσότερο'], optionTraits: [['extrovert'], ['introvert'], ['adventurous'], ['likes_family']] },
  { id: 'personality_show_care', category: 'personality', difficulty: 2, conversationGoal: 'Learn their care language', conversationGoalGr: 'Μάθε τη γλώσσα φροντίδας τους', weight: 2, type: 'multi', question: 'How do you naturally show someone you care?', questionGr: 'Πώς δείχνεις φυσικά ότι νοιάζεσαι;', options: ['Doing thoughtful things for them', 'Telling them directly', 'Spending quality time together', 'Physical affection'], optionsGr: ['Κάνοντας πράγματα γι\' αυτούς', 'Λέγοντάς το απευθείας', 'Ποιοτικός χρόνος μαζί', 'Σωματική τρυφερότητα'], optionTraits: [['dependable'], ['deep_talker'], ['romantic'], ['romantic']] },
  { id: 'personality_small_joy', category: 'personality', difficulty: 2, conversationGoal: 'Light, warm conversation starter', conversationGoalGr: 'Ζεστή αφορμή συζήτησης', weight: 1, type: 'multi', question: 'What\'s a small thing that instantly makes your day better?', questionGr: 'Ποιο μικρό πράγμα σου φτιάχνει αμέσως τη μέρα;', options: ['A good song', 'A message from someone I love', 'Sunshine and fresh air', 'A good meal'], optionsGr: ['Ένα καλό τραγούδι', 'Ένα μήνυμα από κάποιον που αγαπώ', 'Λιακάδα και καθαρός αέρας', 'Ένα καλό γεύμα'], optionTraits: [['creative'], ['romantic'], ['outdoor_person'], ['homebody']] },
  { id: 'relationships_most_important', category: 'relationships', difficulty: 2, conversationGoal: 'Understand their core relationship value', conversationGoalGr: 'Κατανόηση της βασικής αξίας τους σε μια σχέση', weight: 3, type: 'multi', question: 'What\'s most important to you in a relationship?', questionGr: 'Τι είναι πιο σημαντικό για σένα σε μια σχέση;', options: ['Trust', 'Communication', 'Respect', 'Having fun together'], optionsGr: ['Εμπιστοσύνη', 'Επικοινωνία', 'Σεβασμός', 'Διασκέδαση μαζί'], optionTraits: [['romantic'], ['deep_talker'], ['dependable'], ['playful']] },
  { id: 'relationships_show_affection', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their love language', conversationGoalGr: 'Μάθε τη γλώσσα αγάπης τους', weight: 2, type: 'multi', question: 'How do you usually show affection?', questionGr: 'Πώς δείχνεις συνήθως τρυφερότητα;', options: ['Words and compliments', 'Physical closeness', 'Thoughtful gestures', 'Quality time together'], optionsGr: ['Λόγια και κομπλιμέντα', 'Σωματική εγγύτητα', 'Στοχαστικές χειρονομίες', 'Ποιοτικός χρόνος μαζί'], optionTraits: [['deep_talker'], ['romantic'], ['dependable'], ['romantic']] },
  { id: 'relationships_disagreements', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their conflict style', conversationGoalGr: 'Μάθε το στιλ σύγκρουσής τους', weight: 3, type: 'multi', question: 'How do you usually solve disagreements?', questionGr: 'Πώς λύνεις συνήθως τις διαφωνίες;', options: ['Talk it out right away', 'Need a little space first', 'Try to find a compromise fast', 'Use humor to ease the tension'], optionsGr: ['Το συζητάς αμέσως', 'Χρειάζεσαι λίγο χώρο πρώτα', 'Ψάχνεις γρήγορα συμβιβασμό', 'Χρησιμοποιείς χιούμορ'], optionTraits: [['deep_talker'], ['introvert'], ['dependable'], ['playful']] },
  { id: 'relationships_trust', category: 'relationships', difficulty: 2, conversationGoal: 'Learn what builds trust for them', conversationGoalGr: 'Μάθε τι χτίζει εμπιστοσύνη γι\' αυτούς', weight: 3, type: 'multi', question: 'What makes you trust someone?', questionGr: 'Τι σε κάνει να εμπιστεύεσαι κάποιον;', options: ['Consistency over time', 'Honesty even when it\'s hard', 'How they treat other people', 'Following through on their word'], optionsGr: ['Συνέπεια στον χρόνο', 'Ειλικρίνεια ακόμα κι όταν είναι δύσκολο', 'Πώς φέρονται στους άλλους', 'Τηρούν αυτά που λένε'], optionTraits: [['dependable'], ['deep_talker'], ['kind'], ['dependable']] },
  { id: 'relationships_independence_closeness', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their closeness needs', conversationGoalGr: 'Μάθε τις ανάγκες εγγύτητας', weight: 2, type: 'binary', question: 'Do you need more independence or more closeness in a relationship?', questionGr: 'Χρειάζεσαι περισσότερη ανεξαρτησία ή εγγύτητα σε μια σχέση;', options: ['Independence', 'Closeness'], optionsGr: ['Ανεξαρτησία', 'Εγγύτητα'], optionTraits: [['independent'], ['romantic']] },
  { id: 'relationships_support_style', category: 'relationships', difficulty: 2, conversationGoal: 'Learn how they want to be supported', conversationGoalGr: 'Μάθε πώς θέλουν να τους στηρίζουν', weight: 2, type: 'multi', question: 'When you\'re going through something hard, what helps most?', questionGr: 'Όταν περνάς κάτι δύσκολο, τι βοηθάει περισσότερο;', options: ['Someone who just listens', 'Someone who helps me problem-solve', 'Someone who distracts me with fun', 'Space to process alone first'], optionsGr: ['Κάποιος που απλά ακούει', 'Κάποιος που βοηθά να λύσω το πρόβλημα', 'Κάποιος που με αποσπά με διασκέδαση', 'Χώρος για να το επεξεργαστώ μόνος/η'], optionTraits: [['deep_talker'], ['dependable'], ['playful'], ['introvert']] },
  { id: 'relationships_red_flag', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their relationship boundaries', conversationGoalGr: 'Μάθε τα όρια σχέσης τους', weight: 2, type: 'multi', question: 'What feels like a red flag to you early on?', questionGr: 'Τι σου φαίνεται red flag νωρίς σε μια σχέση;', options: ['Dishonesty', 'Poor communication', 'Disrespect toward others', 'Lack of consistency'], optionsGr: ['Ανειλικρίνεια', 'Κακή επικοινωνία', 'Ασέβεια προς άλλους', 'Έλλειψη συνέπειας'], optionTraits: [['deep_talker'], ['deep_talker'], ['kind'], ['dependable']] },
  { id: 'relationships_humor_importance', category: 'relationships', difficulty: 2, conversationGoal: 'Learn how important humor is to them', conversationGoalGr: 'Μάθε πόσο σημαντικό είναι το χιούμορ', weight: 1, type: 'binary', question: 'Is humor essential in a relationship, or is it a nice bonus?', questionGr: 'Είναι το χιούμορ απαραίτητο σε μια σχέση ή απλά ένα bonus;', options: ['Essential', 'A nice bonus'], optionsGr: ['Απαραίτητο', 'Ένα ωραίο bonus'], optionTraits: [['playful'], ['balanced']] },
  { id: 'relationships_deep_talk_silence', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their communication comfort', conversationGoalGr: 'Μάθε την άνεσή τους στην επικοινωνία', weight: 2, type: 'binary', question: 'Do you prefer deep conversations or comfortable silence?', questionGr: 'Προτιμάς βαθιές συζητήσεις ή άνετη σιωπή;', options: ['Deep conversations', 'Comfortable silence'], optionsGr: ['Βαθιές συζητήσεις', 'Άνετη σιωπή'], optionTraits: [['deep_talker'], ['relaxed']] },
  { id: 'relationships_jealousy', category: 'relationships', difficulty: 2, conversationGoal: 'Learn how they handle jealousy', conversationGoalGr: 'Μάθε πώς αντιμετωπίζουν τη ζήλια', weight: 2, type: 'multi', question: 'How do you typically handle feelings of jealousy?', questionGr: 'Πώς αντιμετωπίζεις συνήθως τη ζήλια;', options: ['Talk about it openly', 'Try to work through it myself first', 'It rarely comes up for me', 'I need reassurance from my partner'], optionsGr: ['Το συζητάς ανοιχτά', 'Προσπαθείς να το επεξεργαστείς πρώτα μόνος/η', 'Σπάνια μου συμβαίνει', 'Χρειάζομαι διαβεβαίωση'], optionTraits: [['deep_talker'], ['independent'], ['balanced'], ['romantic']] },
  { id: 'relationships_commitment', category: 'relationships', difficulty: 2, conversationGoal: 'Learn what commitment means to them', conversationGoalGr: 'Μάθε τι σημαίνει δέσμευση γι\' αυτούς', weight: 2, type: 'multi', question: 'What does commitment mean to you?', questionGr: 'Τι σημαίνει δέσμευση για σένα;', options: ['Choosing each other every day', 'Building a life together', 'Being someone\'s safe place', 'Staying loyal no matter what'], optionsGr: ['Να διαλέγετε ο ένας τον άλλον καθημερινά', 'Χτίζοντας μια ζωή μαζί', 'Να είσαι το ασφαλές μέρος κάποιου', 'Να μένεις πιστός/ή ό,τι κι αν γίνει'], optionTraits: [['romantic'], ['planner'], ['dependable'], ['dependable']] },
  { id: 'relationships_reconnect', category: 'relationships', difficulty: 2, conversationGoal: 'Learn how they repair after conflict', conversationGoalGr: 'Μάθε πώς επανασυνδέονται μετά από καβγά', weight: 2, type: 'multi', question: 'After an argument, how do you usually reconnect?', questionGr: 'Μετά από έναν καβγά, πώς επανασυνδέεσαι συνήθως;', options: ['A genuine conversation', 'A hug or physical closeness', 'Giving it time, then talking', 'Doing something normal together again'], optionsGr: ['Μια ειλικρινή συζήτηση', 'Αγκαλιά ή σωματική επαφή', 'Δίνοντας χρόνο, μετά μιλώντας', 'Κάνοντας κάτι φυσιολογικό ξανά μαζί'], optionTraits: [['deep_talker'], ['romantic'], ['balanced'], ['relaxed']] },
  { id: 'relationships_public_private_affection', category: 'relationships', difficulty: 2, conversationGoal: 'Learn their affection comfort level', conversationGoalGr: 'Μάθε το επίπεδο άνεσης με τρυφερότητα', weight: 1, type: 'binary', question: 'Public displays of affection or keep it private?', questionGr: 'Δημόσια τρυφερότητα ή την κρατάς ιδιωτική;', options: ['Public', 'Private'], optionsGr: ['Δημόσια', 'Ιδιωτική'], optionTraits: [['romantic'], ['independent']] },
  { id: 'relationships_apology_style', category: 'relationships', difficulty: 2, conversationGoal: 'Learn how they repair mistakes', conversationGoalGr: 'Μάθε πώς διορθώνουν λάθη', weight: 1, type: 'multi', question: 'When you\'re wrong, how do you usually apologize?', questionGr: 'Όταν κάνεις λάθος, πώς συνήθως ζητάς συγγνώμη;', options: ['Straightforward and quick', 'With a thoughtful gesture', 'I need a bit of time first', 'By explaining my side too'], optionsGr: ['Ξεκάθαρα και γρήγορα', 'Με μια στοχαστική χειρονομία', 'Χρειάζομαι λίγο χρόνο πρώτα', 'Εξηγώντας και τη δική μου πλευρά'], optionTraits: [['dependable'], ['romantic'], ['introvert'], ['deep_talker']] },
  { id: 'future_dream_life', category: 'future', difficulty: 2, conversationGoal: 'Learn their long-term vision', conversationGoalGr: 'Μάθε το μακροπρόθεσμο όραμά τους', weight: 3, type: 'multi', question: 'What kind of life do you dream about?', questionGr: 'Τι είδους ζωή ονειρεύεσαι;', options: ['A peaceful, simple life', 'A life full of travel and adventure', 'A successful, driven career', 'A close-knit family life'], optionsGr: ['Μια ήρεμη, απλή ζωή', 'Μια ζωή γεμάτη ταξίδια', 'Μια επιτυχημένη καριέρα', 'Μια στενή οικογενειακή ζωή'], optionTraits: [['relaxed'], ['likes_travel'], ['career_focused'], ['likes_family']] },
  { id: 'future_travel_or_home', category: 'future', difficulty: 2, conversationGoal: 'Learn their long-term dream', conversationGoalGr: 'Μάθε το μακροπρόθεσμο όνειρό τους', weight: 2, type: 'binary', question: 'Would you rather travel the world or build your dream home?', questionGr: 'Θα προτιμούσες να ταξιδέψεις τον κόσμο ή να χτίσεις το σπίτι των ονείρων σου;', options: ['Travel the world', 'Build my dream home'], optionsGr: ['Ταξίδι στον κόσμο', 'Σπίτι των ονείρων'], optionTraits: [['likes_travel'], ['planner']] },
  { id: 'future_next_relationship', category: 'future', difficulty: 2, conversationGoal: 'Learn what they\'re looking for next', conversationGoalGr: 'Μάθε τι ψάχνουν στην επόμενη σχέση', weight: 3, type: 'multi', question: 'What are you looking for in your next relationship?', questionGr: 'Τι ψάχνεις στην επόμενη σχέση σου;', options: ['Deep emotional connection', 'A true best friend', 'Someone to build a future with', 'Fun, adventure, and spontaneity'], optionsGr: ['Βαθιά συναισθηματική σύνδεση', 'Έναν αληθινό καλύτερο φίλο', 'Κάποιον να χτίσεις μέλλον', 'Διασκέδαση και αυθορμητισμό'], optionTraits: [['deep_talker'], ['dependable'], ['planner'], ['spontaneous']] },
  { id: 'future_career_family_priority', category: 'future', difficulty: 2, conversationGoal: 'Learn their long-term priority', conversationGoalGr: 'Μάθε τη μακροπρόθεσμη προτεραιότητά τους', weight: 2, type: 'binary', question: 'Long-term, is career or family the bigger priority?', questionGr: 'Μακροπρόθεσμα, η καριέρα ή η οικογένεια είναι μεγαλύτερη προτεραιότητα;', options: ['Career', 'Family'], optionsGr: ['Καριέρα', 'Οικογένεια'], optionTraits: [['career_focused'], ['likes_family']] },
  { id: 'future_five_years', category: 'future', difficulty: 2, conversationGoal: 'Learn their near-future goals', conversationGoalGr: 'Μάθε τους στόχους τους', weight: 2, type: 'multi', question: 'Where do you hope to be in 5 years?', questionGr: 'Πού ελπίζεις να είσαι σε 5 χρόνια;', options: ['Settled with a family', 'Thriving in my career', 'Living somewhere new', 'Just genuinely happy, wherever that is'], optionsGr: ['Σταθεροποιημένος/η με οικογένεια', 'Ακμάζοντας στην καριέρα', 'Ζώντας κάπου νέο', 'Απλά ευτυχισμένος/η, όπου κι αν είναι'], optionTraits: [['likes_family'], ['career_focused'], ['adventurous'], ['relaxed']] },
  { id: 'future_wedding_style', category: 'future', difficulty: 2, conversationGoal: 'Learn their celebration style', conversationGoalGr: 'Μάθε το στιλ γιορτής τους', weight: 1, type: 'binary', question: 'Big wedding or small intimate ceremony?', questionGr: 'Μεγάλος γάμος ή μικρή οικεία τελετή;', options: ['Big wedding', 'Small ceremony'], optionsGr: ['Μεγάλος γάμος', 'Μικρή τελετή'], optionTraits: [['social'], ['introvert']] },
  { id: 'future_city_countryside_future', category: 'future', difficulty: 2, conversationGoal: 'Learn their long-term setting', conversationGoalGr: 'Μάθε το μακροπρόθεσμο περιβάλλον τους', weight: 1, type: 'binary', question: 'Long-term, city or countryside?', questionGr: 'Μακροπρόθεσμα, πόλη ή επαρχία;', options: ['City', 'Countryside'], optionsGr: ['Πόλη', 'Επαρχία'], optionTraits: [['city_person'], ['outdoor_person']] },
  { id: 'future_want_kids', category: 'future', difficulty: 2, conversationGoal: 'Learn their family plans', conversationGoalGr: 'Μάθε τα οικογενειακά τους σχέδια', weight: 2, type: 'multi', question: 'How do you feel about having kids someday?', questionGr: 'Πώς νιώθεις για το να αποκτήσεις παιδιά κάποια μέρα;', options: ['Definitely want a family', 'Open to it, not sure yet', 'Leaning toward not having kids', 'It\'s not something I think about much'], optionsGr: ['Σίγουρα θέλω οικογένεια', 'Ανοιχτός/ή, δεν είμαι σίγουρος/η', 'Μάλλον όχι παιδιά', 'Δεν το σκέφτομαι πολύ'], optionTraits: [['likes_family'], ['balanced'], ['independent'], ['relaxed']] },
  { id: 'future_home_meaning', category: 'future', difficulty: 2, conversationGoal: 'Learn what \'home\' means to them', conversationGoalGr: 'Μάθε τι σημαίνει \'σπίτι\' γι\' αυτούς', weight: 2, type: 'multi', question: 'What does \'home\' mean to you most?', questionGr: 'Τι σημαίνει \'σπίτι\' περισσότερο για σένα;', options: ['Wherever my favorite people are', 'A place I\'ve built with my own hands', 'A feeling of peace and safety', 'Anywhere, as long as I\'m free to roam'], optionsGr: ['Όπου είναι οι αγαπημένοι μου', 'Ένα μέρος που έχτισα μόνος/η', 'Ένα αίσθημα ηρεμίας και ασφάλειας', 'Οπουδήποτε, αρκεί να είμαι ελεύθερος/η'], optionTraits: [['likes_family'], ['planner'], ['relaxed'], ['adventurous']] },
  { id: 'future_biggest_dream', category: 'future', difficulty: 2, conversationGoal: 'Learn their unfulfilled dream', conversationGoalGr: 'Μάθε το ανεκπλήρωτο όνειρό τους', weight: 2, type: 'multi', question: 'What\'s a big dream you haven\'t achieved yet?', questionGr: 'Ποιο είναι ένα μεγάλο όνειρο που δεν έχεις πετύχει ακόμα;', options: ['Starting my own thing', 'Living abroad', 'Writing or creating something lasting', 'Finding real, lasting love'], optionsGr: ['Να ξεκινήσω κάτι δικό μου', 'Να ζήσω στο εξωτερικό', 'Να δημιουργήσω κάτι διαρκές', 'Να βρω αληθινή, διαρκή αγάπη'], optionTraits: [['career_focused'], ['likes_travel'], ['creative'], ['romantic']] },
  { id: 'future_adventure_stability', category: 'future', difficulty: 2, conversationGoal: 'Learn their long-term rhythm', conversationGoalGr: 'Μάθε τον μακροπρόθεσμο ρυθμό τους', weight: 2, type: 'binary', question: 'Long-term, do you crave more adventure or more stability?', questionGr: 'Μακροπρόθεσμα, θέλεις περισσότερη περιπέτεια ή σταθερότητα;', options: ['Adventure', 'Stability'], optionsGr: ['Περιπέτεια', 'Σταθερότητα'], optionTraits: [['adventurous'], ['planner']] },
  { id: 'future_grow_old', category: 'future', difficulty: 2, conversationGoal: 'Learn how they picture the long run', conversationGoalGr: 'Μάθε πώς φαντάζονται το μέλλον', weight: 2, type: 'multi', question: 'How do you picture growing old with someone?', questionGr: 'Πώς φαντάζεσαι να γεράσεις με κάποιον;', options: ['Still adventuring together', 'A quiet, comfortable life side by side', 'Surrounded by family', 'Still best friends, laughing together'], optionsGr: ['Ακόμα να περιπλανιέστε μαζί', 'Μια ήσυχη, άνετη ζωή δίπλα δίπλα', 'Περιτριγυρισμένοι από οικογένεια', 'Ακόμα καλύτεροι φίλοι, γελώντας μαζί'], optionTraits: [['adventurous'], ['relaxed'], ['likes_family'], ['playful']] },
  { id: 'future_fulfillment', category: 'future', difficulty: 2, conversationGoal: 'Learn what fulfillment means to them', conversationGoalGr: 'Μάθε τι σημαίνει πληρότητα γι\' αυτούς', weight: 3, type: 'multi', question: 'What would make you feel truly fulfilled in life?', questionGr: 'Τι θα σε έκανε να νιώσεις πραγματικά ολοκληρωμένος/η;', options: ['Deep, meaningful relationships', 'Achieving something I\'m proud of', 'Freedom to live life my way', 'Making a difference for others'], optionsGr: ['Βαθιές, ουσιαστικές σχέσεις', 'Να πετύχω κάτι που με κάνει περήφανο/η', 'Ελευθερία να ζω με τον δικό μου τρόπο', 'Να κάνω τη διαφορά για άλλους'], optionTraits: [['romantic'], ['career_focused'], ['independent'], ['kind']] },
  { id: 'future_first_year_together', category: 'future', difficulty: 2, conversationGoal: 'Light forward-looking question', conversationGoalGr: 'Ελαφριά ερώτηση για το μέλλον', weight: 1, type: 'multi', question: 'What would your ideal first year with someone look like?', questionGr: 'Πώς θα ήταν ο ιδανικός πρώτος χρόνος με κάποιον;', options: ['Lots of new experiences together', 'Building a comfortable routine', 'Getting to know each other deeply', 'A mix of adventure and calm'], optionsGr: ['Πολλές νέες εμπειρίες μαζί', 'Χτίζοντας μια άνετη ρουτίνα', 'Γνωρίζοντας ο ένας τον άλλον σε βάθος', 'Συνδυασμός περιπέτειας και ηρεμίας'], optionTraits: [['adventurous'], ['planner'], ['deep_talker'], ['balanced']] },
]

// ── Question Engine ──────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function byTheme(pool: MysteryQuestion[], theme: MysteryChoiceTheme): MysteryQuestion[] {
  return pool.filter(q => q.category === theme)
}

/**
 * Generate exactly 10 questions for one Mystery Choice game — one natural
 * conversation arc, not a random trivia mix.
 *
 * Round 1-2  → ICE BREAKER    (light, easy to answer)
 * Round 3-4  → LIFESTYLE      (how they actually live day to day)
 * Round 5-6  → PERSONALITY    (who they are)
 * Round 7-8  → RELATIONSHIPS  (what they need from a partner)
 * Round 9-10 → FUTURE         (where they're headed)
 *
 * No duplicate questions within a game. Each pair of rounds draws 2 unique
 * random questions from that theme's pool, so replay games stay fresh.
 */
export function generateMysteryQuestions(): MysteryQuestion[] {
  const used = new Set<string>()
  const result: MysteryQuestion[] = []

  // Group the fixed round-theme order into consecutive pairs per theme
  const themeSequence: MysteryChoiceTheme[] = []
  for (const theme of ROUND_THEME_ORDER) {
    if (!themeSequence.includes(theme)) themeSequence.push(theme)
  }

  for (const theme of themeSequence) {
    const slotsForTheme = ROUND_THEME_ORDER.filter(t => t === theme).length
    const pool = shuffle(byTheme(MYSTERY_QUESTIONS, theme))
    let picked = 0
    for (const q of pool) {
      if (picked >= slotsForTheme) break
      if (used.has(q.id)) continue
      result.push(q)
      used.add(q.id)
      picked++
    }
    // Defensive backfill if a theme's pool is ever smaller than its round slots
    if (picked < slotsForTheme) {
      const fallback = shuffle(MYSTERY_QUESTIONS.filter(q => !used.has(q.id)))
      for (const q of fallback) {
        if (picked >= slotsForTheme) break
        result.push(q)
        used.add(q.id)
        picked++
      }
    }
  }

  return result.slice(0, 10)
}

// RoundData shape stored in game_sessions.state and rendered by the game screen.
export interface RoundData {
  id: string
  category: MysteryChoiceTheme
  type: MysteryQuestionType
  question: string
  questionGr: string
  conversationGoal: string
  emoji: [string, string]
  en: [string, string]        // options[0]/options[1] — binary-compatible pair
  gr: [string, string]        // optionsGr[0]/optionsGr[1]
  options: string[]           // full option list (2 for binary, 4 for multi)
  optionsGr: string[]
  optionTraits: string[][]    // traits per option, parallel to options
  maxSelect: number           // always 1 — every question in this bank is single-select
  weight: number
  tags: string[]              // kept for backward-compatible display use; mirrors optionTraits flattened
}

// Convert an engine question into the RoundData shape the game screen renders.
export function toRoundData(q: MysteryQuestion): RoundData {
  const emoji = THEME_EMOJI[q.category] || ['🎭', '✨']
  return {
    id: q.id,
    category: q.category,
    type: q.type,
    question: q.question,
    questionGr: q.questionGr,
    conversationGoal: q.conversationGoal,
    emoji,
    en: [q.options[0] || '', q.options[1] || ''],
    gr: [q.optionsGr[0] || '', q.optionsGr[1] || ''],
    options: q.options,
    optionsGr: q.optionsGr,
    optionTraits: q.optionTraits,
    maxSelect: 1,
    weight: q.weight,
    tags: Array.from(new Set(q.optionTraits.flat())),
  }
}

// ── Compatibility scoring (per-round match/different — unchanged mechanics) ──
// Every question here is single-select, so scoring stays simple: exact same
// option chosen = full weight, otherwise 0. Kept for the existing pair-progress
// trigger and per-round outcome — the "What We Learned" reveal uses the richer
// trait data separately (see MysteryChoiceGame.tsx), not just this pct.

export type RoundOutcome = 'match' | 'partial' | 'different'

export interface RoundScoreResult {
  score: number
  maxScore: number
  outcome: RoundOutcome
}

export function computeRoundScore(
  round: { maxSelect: number; weight: number },
  choiceA: string | string[] | null,
  choiceB: string | string[] | null
): RoundScoreResult {
  const weight = round.weight || 1
  if (choiceA == null || choiceB == null) return { score: 0, maxScore: weight, outcome: 'different' }
  const a = Array.isArray(choiceA) ? choiceA[0] : choiceA
  const b = Array.isArray(choiceB) ? choiceB[0] : choiceB
  const matched = !!a && a === b
  return { score: matched ? weight : 0, maxScore: weight, outcome: matched ? 'match' : 'different' }
}

export function computeCompatibilityPercent(results: RoundScoreResult[]): number {
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0)
  if (totalMax === 0) return 0
  return Math.round((totalScore / totalMax) * 100)
}
