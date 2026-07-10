// Mystery Choice — scalable question engine
// Curated for dating & getting-to-know-you compatibility.
// Add new questions here any time; the game engine automatically picks up new entries.
// Currently 200+ questions; scales to 500+ / 1000+ / 2000+ with no game-logic changes.

export type MysteryChoiceCategory =
  'adventure' | 'ambition' | 'communication' | 'food' | 'home' | 'humor' | 'lifestyle' | 'movies' | 'music' | 'personality' | 'relationships' | 'romance' | 'social' | 'travel' | 'values'

export type MysteryChoiceDifficulty = 1 | 2 | 3  // 1 = Easy, 2 = Fun/Personality, 3 = Deep

export interface MysteryQuestion {
  id: string
  category: MysteryChoiceCategory
  difficulty: MysteryChoiceDifficulty
  question: string
  optionA: string
  optionB: string
  // Bilingual fields used to render the existing game UI (kept unchanged)
  questionGr: string
  optionAGr: string
  optionBGr: string
}

// Fallback emoji pair per category, used when rendering the round (visual only)
export const CATEGORY_EMOJI: Record<MysteryChoiceCategory, [string, string]> = {
  adventure: ['🧭', '🏔️'],
  ambition: ['💼', '🚀'],
  communication: ['💬', '📞'],
  food: ['🍽️', '☕'],
  home: ['🏠', '🛋️'],
  humor: ['😂', '😏'],
  lifestyle: ['🌿', '⚡'],
  movies: ['🎬', '🍿'],
  music: ['🎵', '🎧'],
  personality: ['🧠', '❤️'],
  relationships: ['💕', '💬'],
  romance: ['🌹', '💫'],
  social: ['🎉', '👥'],
  travel: ['✈️', '🌍'],
  values: ['⚖️', '💎'],
}

// 200 questions across 15 categories
export const MYSTERY_QUESTIONS: MysteryQuestion[] = [
  { id: 'lifestyle_early_night', category: 'lifestyle', difficulty: 1, question: 'Early bird or Night owl?', optionA: 'Early bird', optionB: 'Night owl', questionGr: 'Πρωινός τύπος ή Νυχτοπούλι;', optionAGr: 'Πρωινός τύπος', optionBGr: 'Νυχτοπούλι' },
  { id: 'lifestyle_plan_flow', category: 'lifestyle', difficulty: 1, question: 'Plan everything or Go with the flow?', optionA: 'Plan everything', optionB: 'Go with the flow', questionGr: 'Σχεδιάζεις τα πάντα ή Πάς με το ρεύμα;', optionAGr: 'Σχεδιάζεις', optionBGr: 'Ρεύμα' },
  { id: 'lifestyle_tidy_relaxed', category: 'lifestyle', difficulty: 1, question: 'Neat and tidy or Relaxed and easy-going?', optionA: 'Neat and tidy', optionB: 'Relaxed', questionGr: 'Τακτικός/ή ή Χαλαρός/ή;', optionAGr: 'Τακτικός/ή', optionBGr: 'Χαλαρός/ή' },
  { id: 'lifestyle_indoor_outdoor', category: 'lifestyle', difficulty: 1, question: 'Indoor weekend or Outdoor weekend?', optionA: 'Indoor', optionB: 'Outdoor', questionGr: 'Σαββατοκύριακο μέσα ή έξω;', optionAGr: 'Μέσα', optionBGr: 'Έξω' },
  { id: 'lifestyle_simple_ambitious', category: 'lifestyle', difficulty: 1, question: 'Simple quiet life or Big ambitious life?', optionA: 'Simple life', optionB: 'Ambitious life', questionGr: 'Απλή ζωή ή Φιλόδοξη ζωή;', optionAGr: 'Απλή ζωή', optionBGr: 'Φιλόδοξη ζωή' },
  { id: 'lifestyle_save_spend', category: 'lifestyle', difficulty: 2, question: 'Save money or Spend on experiences?', optionA: 'Save', optionB: 'Spend on experiences', questionGr: 'Αποταμίευση ή Εμπειρίες;', optionAGr: 'Αποταμίευση', optionBGr: 'Εμπειρίες' },
  { id: 'lifestyle_routine_variety', category: 'lifestyle', difficulty: 2, question: 'Stick to routine or Crave variety?', optionA: 'Routine', optionB: 'Variety', questionGr: 'Ρουτίνα ή Ποικιλία;', optionAGr: 'Ρουτίνα', optionBGr: 'Ποικιλία' },
  { id: 'lifestyle_city_countryside', category: 'lifestyle', difficulty: 2, question: 'Live in the city or the Countryside?', optionA: 'City', optionB: 'Countryside', questionGr: 'Πόλη ή Επαρχία;', optionAGr: 'Πόλη', optionBGr: 'Επαρχία' },
  { id: 'lifestyle_minimal_collector', category: 'lifestyle', difficulty: 2, question: 'Minimalist or Sentimental collector?', optionA: 'Minimalist', optionB: 'Collector', questionGr: 'Μινιμαλιστής/τρια ή Συλλέκτης/τρια;', optionAGr: 'Μινιμαλιστής/τρια', optionBGr: 'Συλλέκτης/τρια' },
  { id: 'lifestyle_morning_workout_evening', category: 'lifestyle', difficulty: 2, question: 'Workout in the morning or the evening?', optionA: 'Morning', optionB: 'Evening', questionGr: 'Άσκηση πρωί ή βράδυ;', optionAGr: 'Πρωί', optionBGr: 'Βράδυ' },
  { id: 'lifestyle_more_time_more_money', category: 'lifestyle', difficulty: 3, question: 'More free time or More money?', optionA: 'More time', optionB: 'More money', questionGr: 'Περισσότερος χρόνος ή Περισσότερα χρήματα;', optionAGr: 'Χρόνος', optionBGr: 'Χρήματα' },
  { id: 'lifestyle_change_comfort', category: 'lifestyle', difficulty: 3, question: 'Embrace change or Value comfort?', optionA: 'Embrace change', optionB: 'Value comfort', questionGr: 'Αγκαλιάζεις την αλλαγή ή Προτιμάς την άνεση;', optionAGr: 'Αλλαγή', optionBGr: 'Άνεση' },
  { id: 'lifestyle_present_future', category: 'lifestyle', difficulty: 3, question: 'Live in the present or Plan for the future?', optionA: 'Live in the present', optionB: 'Plan for the future', questionGr: 'Ζεις το παρόν ή Σχεδιάζεις το μέλλον;', optionAGr: 'Παρόν', optionBGr: 'Μέλλον' },
  { id: 'lifestyle_discipline_freedom', category: 'lifestyle', difficulty: 3, question: 'Value discipline or Value freedom?', optionA: 'Discipline', optionB: 'Freedom', questionGr: 'Πειθαρχία ή Ελευθερία;', optionAGr: 'Πειθαρχία', optionBGr: 'Ελευθερία' },
  { id: 'relationships_call_text', category: 'relationships', difficulty: 1, question: 'Call or Text?', optionA: 'Call', optionB: 'Text', questionGr: 'Κλήση ή Μήνυμα;', optionAGr: 'Κλήση', optionBGr: 'Μήνυμα' },
  { id: 'relationships_night_out_cozy', category: 'relationships', difficulty: 1, question: 'Night out or Cozy night in?', optionA: 'Night out', optionB: 'Cozy night in', questionGr: 'Έξοδος ή Χαλαρή βραδιά σπίτι;', optionAGr: 'Έξοδος', optionBGr: 'Σπίτι' },
  { id: 'relationships_morning_evening_affection', category: 'relationships', difficulty: 1, question: 'Morning affection or Evening affection?', optionA: 'Morning', optionB: 'Evening', questionGr: 'Πρωινή ή Βραδινή τρυφερότητα;', optionAGr: 'Πρωινή', optionBGr: 'Βραδινή' },
  { id: 'relationships_surprise_planned_date', category: 'relationships', difficulty: 2, question: 'Surprise date or Planned date?', optionA: 'Surprise date', optionB: 'Planned date', questionGr: 'Ραντεβού έκπληξη ή Προγραμματισμένο;', optionAGr: 'Έκπληξη', optionBGr: 'Προγραμματισμένο' },
  { id: 'relationships_words_actions', category: 'relationships', difficulty: 2, question: 'Words of affirmation or Acts of service?', optionA: 'Words', optionB: 'Actions', questionGr: 'Λόγια αγάπης ή Πράξεις;', optionAGr: 'Λόγια', optionBGr: 'Πράξεις' },
  { id: 'relationships_public_private_affection', category: 'relationships', difficulty: 2, question: 'Public affection or Private affection?', optionA: 'Public', optionB: 'Private', questionGr: 'Δημόσια ή Ιδιωτική τρυφερότητα;', optionAGr: 'Δημόσια', optionBGr: 'Ιδιωτική' },
  { id: 'relationships_first_move_wait', category: 'relationships', difficulty: 2, question: 'Make the first move or Wait for them?', optionA: 'First move', optionB: 'Wait', questionGr: 'Κάνεις την πρώτη κίνηση ή Περιμένεις;', optionAGr: 'Πρώτη κίνηση', optionBGr: 'Περιμένεις' },
  { id: 'relationships_independence_closeness', category: 'relationships', difficulty: 2, question: 'Need independence or Crave closeness?', optionA: 'Independence', optionB: 'Closeness', questionGr: 'Χρειάζεσαι ανεξαρτησία ή εγγύτητα;', optionAGr: 'Ανεξαρτησία', optionBGr: 'Εγγύτητα' },
  { id: 'relationships_forgive_easily_need_time', category: 'relationships', difficulty: 3, question: 'Forgive easily or Need time?', optionA: 'Forgive easily', optionB: 'Need time', questionGr: 'Συγχωρείς εύκολα ή Χρειάζεσαι χρόνο;', optionAGr: 'Εύκολα', optionBGr: 'Χρόνο' },
  { id: 'relationships_shared_interests_values', category: 'relationships', difficulty: 3, question: 'Shared interests or Shared values matter more?', optionA: 'Shared interests', optionB: 'Shared values', questionGr: 'Κοινά ενδιαφέροντα ή Κοινές αξίες;', optionAGr: 'Ενδιαφέροντα', optionBGr: 'Αξίες' },
  { id: 'relationships_talk_immediately_cool_off', category: 'relationships', difficulty: 3, question: 'Talk immediately or Cool off first?', optionA: 'Talk immediately', optionB: 'Cool off first', questionGr: 'Μιλάς αμέσως ή Χρειάζεσαι να ηρεμήσεις πρώτα;', optionAGr: 'Αμέσως', optionBGr: 'Ηρεμία πρώτα' },
  { id: 'relationships_private_relationship_public', category: 'relationships', difficulty: 3, question: 'Private relationship or Open and public?', optionA: 'Private', optionB: 'Public', questionGr: 'Ιδιωτική σχέση ή Ανοιχτή και δημόσια;', optionAGr: 'Ιδιωτική', optionBGr: 'Δημόσια' },
  { id: 'relationships_soulmate_grow_together', category: 'relationships', difficulty: 3, question: 'Believe in soulmates or Grow into love together?', optionA: 'Soulmates', optionB: 'Grow together', questionGr: 'Πιστεύεις σε ταίρι ή Χτίζεις την αγάπη μαζί;', optionAGr: 'Ταίρι', optionBGr: 'Χτίζεις μαζί' },
  { id: 'relationships_logic_heart_love', category: 'relationships', difficulty: 3, question: 'Follow logic or Follow your heart in love?', optionA: 'Logic', optionB: 'Heart', questionGr: 'Ακολουθείς τη λογική ή την καρδιά σου στην αγάπη;', optionAGr: 'Λογική', optionBGr: 'Καρδιά' },
  { id: 'communication_text_call_pref', category: 'communication', difficulty: 1, question: 'Texting or Phone calls?', optionA: 'Texting', optionB: 'Phone calls', questionGr: 'Μηνύματα ή Τηλεφωνήματα;', optionAGr: 'Μηνύματα', optionBGr: 'Τηλεφωνήματα' },
  { id: 'communication_short_long_messages', category: 'communication', difficulty: 1, question: 'Short messages or Long messages?', optionA: 'Short messages', optionB: 'Long messages', questionGr: 'Σύντομα ή Μεγάλα μηνύματα;', optionAGr: 'Σύντομα', optionBGr: 'Μεγάλα' },
  { id: 'communication_direct_gentle', category: 'communication', difficulty: 1, question: 'Direct and honest or Gentle and diplomatic?', optionA: 'Direct', optionB: 'Gentle', questionGr: 'Άμεσος/η ή Διπλωματικός/ή;', optionAGr: 'Άμεσος/η', optionBGr: 'Διπλωματικός/ή' },
  { id: 'communication_listen_advise', category: 'communication', difficulty: 2, question: 'Just listen or Offer advice?', optionA: 'Just listen', optionB: 'Offer advice', questionGr: 'Απλά ακούς ή Δίνεις συμβουλές;', optionAGr: 'Ακούς', optionBGr: 'Συμβουλές' },
  { id: 'communication_say_it_now_write_it', category: 'communication', difficulty: 2, question: 'Say it out loud or Write it down?', optionA: 'Say it out loud', optionB: 'Write it down', questionGr: 'Το λες φωναχτά ή Το γράφεις;', optionAGr: 'Το λες', optionBGr: 'Το γράφεις' },
  { id: 'communication_joke_serious', category: 'communication', difficulty: 2, question: 'Joke about problems or Take them seriously?', optionA: 'Joke about it', optionB: 'Take it seriously', questionGr: 'Κάνεις πλάκα ή Το παίρνεις σοβαρά;', optionAGr: 'Πλάκα', optionBGr: 'Σοβαρά' },
  { id: 'communication_small_talk_deep_talk', category: 'communication', difficulty: 2, question: 'Small talk or Deep conversations?', optionA: 'Small talk', optionB: 'Deep conversations', questionGr: 'Ελαφριά κουβέντα ή Βαθιές συζητήσεις;', optionAGr: 'Ελαφριά', optionBGr: 'Βαθιές' },
  { id: 'communication_silence_comfortable_awkward', category: 'communication', difficulty: 3, question: 'Comfortable silence or Need to fill every gap?', optionA: 'Comfortable silence', optionB: 'Fill the silence', questionGr: 'Άνετη σιωπή ή Γεμίζεις κάθε παύση;', optionAGr: 'Άνετη σιωπή', optionBGr: 'Γεμίζεις παύσεις' },
  { id: 'communication_honesty_over_comfort', category: 'communication', difficulty: 3, question: 'Honesty over comfort or Comfort over honesty?', optionA: 'Honesty', optionB: 'Comfort', questionGr: 'Ειλικρίνεια πάνω από την άνεση ή το αντίθετο;', optionAGr: 'Ειλικρίνεια', optionBGr: 'Άνεση' },
  { id: 'communication_apologize_first_wait', category: 'communication', difficulty: 3, question: 'Apologize first or Wait for the other person to?', optionA: 'Apologize first', optionB: 'Wait', questionGr: 'Ζητάς συγγνώμη πρώτος/η ή Περιμένεις;', optionAGr: 'Πρώτος/η', optionBGr: 'Περιμένεις' },
  { id: 'communication_express_feelings_easily', category: 'communication', difficulty: 3, question: 'Express feelings easily or Keep them private?', optionA: 'Express easily', optionB: 'Keep private', questionGr: 'Εκφράζεις εύκολα τα συναισθήματά σου ή Τα κρατάς για σένα;', optionAGr: 'Εκφράζεις', optionBGr: 'Κρατάς' },
  { id: 'communication_clarity_over_kindness', category: 'communication', difficulty: 3, question: 'Clear even if blunt or Kind even if vague?', optionA: 'Clear and blunt', optionB: 'Kind and vague', questionGr: 'Σαφής ακόμα κι αν είναι σκληρό ή Ευγενικός/ή ακόμα κι αν είναι ασαφές;', optionAGr: 'Σαφήνεια', optionBGr: 'Ευγένεια' },
  { id: 'communication_compliment_receive_give', category: 'communication', difficulty: 2, question: 'Better at giving compliments or Receiving them?', optionA: 'Giving', optionB: 'Receiving', questionGr: 'Καλύτερος/η στο να δίνεις κομπλιμέντα ή να τα δέχεσαι;', optionAGr: 'Δίνεις', optionBGr: 'Δέχεσαι' },
  { id: 'personality_introvert_extrovert', category: 'personality', difficulty: 1, question: 'Introvert or Extrovert?', optionA: 'Introvert', optionB: 'Extrovert', questionGr: 'Εσωστρεφής ή Εξωστρεφής;', optionAGr: 'Εσωστρεφής', optionBGr: 'Εξωστρεφής' },
  { id: 'personality_optimist_realist', category: 'personality', difficulty: 1, question: 'Optimist or Realist?', optionA: 'Optimist', optionB: 'Realist', questionGr: 'Αισιόδοξος/η ή Ρεαλιστής/τρια;', optionAGr: 'Αισιόδοξος/η', optionBGr: 'Ρεαλιστής/τρια' },
  { id: 'personality_planner_improviser', category: 'personality', difficulty: 1, question: 'Planner or Improviser?', optionA: 'Planner', optionB: 'Improviser', questionGr: 'Σχεδιαστής/τρια ή Αυτοσχεδιαστής/τρια;', optionAGr: 'Σχεδιαστής/τρια', optionBGr: 'Αυτοσχεδιαστής/τρια' },
  { id: 'personality_leader_supporter', category: 'personality', difficulty: 1, question: 'Natural leader or Steady supporter?', optionA: 'Leader', optionB: 'Supporter', questionGr: 'Φυσικός ηγέτης ή Σταθερός υποστηρικτής;', optionAGr: 'Ηγέτης', optionBGr: 'Υποστηρικτής' },
  { id: 'personality_logical_creative', category: 'personality', difficulty: 2, question: 'Logical mind or Creative mind?', optionA: 'Logical', optionB: 'Creative', questionGr: 'Λογικό ή Δημιουργικό μυαλό;', optionAGr: 'Λογικό', optionBGr: 'Δημιουργικό' },
  { id: 'personality_patient_impulsive', category: 'personality', difficulty: 2, question: 'Patient or Impulsive?', optionA: 'Patient', optionB: 'Impulsive', questionGr: 'Υπομονετικός/ή ή Παρορμητικός/ή;', optionAGr: 'Υπομονετικός/ή', optionBGr: 'Παρορμητικός/ή' },
  { id: 'personality_private_open_book', category: 'personality', difficulty: 2, question: 'Private person or Open book?', optionA: 'Private', optionB: 'Open book', questionGr: 'Ιδιωτικός τύπος ή Ανοιχτό βιβλίο;', optionAGr: 'Ιδιωτικός τύπος', optionBGr: 'Ανοιχτό βιβλίο' },
  { id: 'personality_cautious_bold', category: 'personality', difficulty: 2, question: 'Cautious or Bold?', optionA: 'Cautious', optionB: 'Bold', questionGr: 'Προσεκτικός/ή ή Τολμηρός/ή;', optionAGr: 'Προσεκτικός/ή', optionBGr: 'Τολμηρός/ή' },
  { id: 'personality_perfectionist_easygoing', category: 'personality', difficulty: 2, question: 'Perfectionist or Easygoing?', optionA: 'Perfectionist', optionB: 'Easygoing', questionGr: 'Τελειομανής ή Άνετος/η;', optionAGr: 'Τελειομανής', optionBGr: 'Άνετος/η' },
  { id: 'personality_heart_head_decisions', category: 'personality', difficulty: 3, question: 'Decide with your heart or your head?', optionA: 'Heart', optionB: 'Head', questionGr: 'Αποφασίζεις με την καρδιά ή το μυαλό;', optionAGr: 'Καρδιά', optionBGr: 'Μυαλό' },
  { id: 'personality_self_improve_self_accept', category: 'personality', difficulty: 3, question: 'Always improving yourself or Accepting who you are?', optionA: 'Always improving', optionB: 'Accepting myself', questionGr: 'Πάντα βελτιώνεσαι ή Αποδέχεσαι τον εαυτό σου;', optionAGr: 'Βελτίωση', optionBGr: 'Αποδοχή' },
  { id: 'personality_true_self_adapt', category: 'personality', difficulty: 3, question: 'Show your true self always or Adapt to the moment?', optionA: 'True self always', optionB: 'Adapt', questionGr: 'Δείχνεις πάντα τον αληθινό εαυτό ή Προσαρμόζεσαι;', optionAGr: 'Αληθινός εαυτός', optionBGr: 'Προσαρμογή' },
  { id: 'personality_competitive_relaxed', category: 'personality', difficulty: 2, question: 'Competitive or Relaxed?', optionA: 'Competitive', optionB: 'Relaxed', questionGr: 'Ανταγωνιστικός/ή ή Χαλαρός/ή;', optionAGr: 'Ανταγωνιστικός/ή', optionBGr: 'Χαλαρός/ή' },
  { id: 'travel_beach_mountains', category: 'travel', difficulty: 1, question: 'Beach or Mountains?', optionA: 'Beach', optionB: 'Mountains', questionGr: 'Παραλία ή Βουνό;', optionAGr: 'Παραλία', optionBGr: 'Βουνό' },
  { id: 'travel_city_break_nature', category: 'travel', difficulty: 1, question: 'City break or Nature escape?', optionA: 'City break', optionB: 'Nature escape', questionGr: 'Πόλη ή Φύση;', optionAGr: 'Πόλη', optionBGr: 'Φύση' },
  { id: 'travel_plane_road_trip', category: 'travel', difficulty: 1, question: 'Flying or Road trip?', optionA: 'Flying', optionB: 'Road trip', questionGr: 'Αεροπλάνο ή Οδικό ταξίδι;', optionAGr: 'Αεροπλάνο', optionBGr: 'Οδικό ταξίδι' },
  { id: 'travel_hotel_camping', category: 'travel', difficulty: 1, question: 'Hotel or Camping?', optionA: 'Hotel', optionB: 'Camping', questionGr: 'Ξενοδοχείο ή Κάμπινγκ;', optionAGr: 'Ξενοδοχείο', optionBGr: 'Κάμπινγκ' },
  { id: 'travel_summer_winter_trip', category: 'travel', difficulty: 1, question: 'Summer trip or Winter trip?', optionA: 'Summer trip', optionB: 'Winter trip', questionGr: 'Καλοκαιρινό ή Χειμερινό ταξίδι;', optionAGr: 'Καλοκαίρι', optionBGr: 'Χειμώνας' },
  { id: 'travel_plan_spontaneous_trip', category: 'travel', difficulty: 2, question: 'Plan every detail or Travel spontaneously?', optionA: 'Plan every detail', optionB: 'Spontaneous', questionGr: 'Σχεδιάζεις κάθε λεπτομέρεια ή Ταξιδεύεις αυθόρμητα;', optionAGr: 'Σχεδιασμός', optionBGr: 'Αυθορμητισμός' },
  { id: 'travel_solo_group_travel', category: 'travel', difficulty: 2, question: 'Solo travel or Group travel?', optionA: 'Solo travel', optionB: 'Group travel', questionGr: 'Μόνος/η ή Παρέα ταξίδι;', optionAGr: 'Μόνος/η', optionBGr: 'Παρέα' },
  { id: 'travel_far_exotic_near_weekend', category: 'travel', difficulty: 2, question: 'Far exotic destination or Nearby weekend trip?', optionA: 'Far and exotic', optionB: 'Nearby weekend', questionGr: 'Μακρινός προορισμός ή Κοντινό Σαββατοκύριακο;', optionAGr: 'Μακρινός', optionBGr: 'Κοντινό' },
  { id: 'travel_backpack_comfort_travel', category: 'travel', difficulty: 2, question: 'Backpacking light or Traveling in comfort?', optionA: 'Backpacking', optionB: 'In comfort', questionGr: 'Backpacking ή Άνετο ταξίδι;', optionAGr: 'Backpacking', optionBGr: 'Άνετο ταξίδι' },
  { id: 'travel_new_places_favorite_place', category: 'travel', difficulty: 3, question: 'Always new places or Return to a favorite?', optionA: 'New places', optionB: 'Favorite place', questionGr: 'Πάντα νέα μέρη ή Επιστροφή στο αγαπημένο;', optionAGr: 'Νέα μέρη', optionBGr: 'Αγαπημένο μέρος' },
  { id: 'travel_could_live_abroad', category: 'travel', difficulty: 3, question: 'Could live abroad or Always home?', optionA: 'Live abroad', optionB: 'Always home', questionGr: 'Θα ζούσες στο εξωτερικό ή Πάντα σπίτι;', optionAGr: 'Εξωτερικό', optionBGr: 'Σπίτι' },
  { id: 'travel_travel_together_apart', category: 'travel', difficulty: 3, question: 'Travel everywhere together or Sometimes apart?', optionA: 'Always together', optionB: 'Sometimes apart', questionGr: 'Ταξιδεύετε πάντα μαζί ή Καμιά φορά χώρια;', optionAGr: 'Μαζί', optionBGr: 'Χώρια' },
  { id: 'travel_adventure_relax_trip', category: 'travel', difficulty: 2, question: 'Adventure trip or Relaxing trip?', optionA: 'Adventure', optionB: 'Relaxing', questionGr: 'Ταξίδι περιπέτειας ή Χαλάρωσης;', optionAGr: 'Περιπέτεια', optionBGr: 'Χαλάρωση' },
  { id: 'travel_passport_full_slow_travel', category: 'travel', difficulty: 3, question: 'Collect passport stamps or Travel slowly and deeply?', optionA: 'Collect stamps', optionB: 'Travel slowly', questionGr: 'Συλλέγεις σφραγίδες ή Ταξιδεύεις αργά και σε βάθος;', optionAGr: 'Σφραγίδες', optionBGr: 'Αργά και σε βάθος' },
  { id: 'food_coffee_tea', category: 'food', difficulty: 1, question: 'Coffee or Tea?', optionA: 'Coffee', optionB: 'Tea', questionGr: 'Καφές ή Τσάι;', optionAGr: 'Καφές', optionBGr: 'Τσάι' },
  { id: 'food_sweet_savory', category: 'food', difficulty: 1, question: 'Sweet or Savory?', optionA: 'Sweet', optionB: 'Savory', questionGr: 'Γλυκό ή Αλμυρό;', optionAGr: 'Γλυκό', optionBGr: 'Αλμυρό' },
  { id: 'food_dinner_out_home_cooking', category: 'food', difficulty: 1, question: 'Dinner out or Home cooking?', optionA: 'Dinner out', optionB: 'Home cooking', questionGr: 'Έξοδος για φαγητό ή Σπιτικό;', optionAGr: 'Έξοδος', optionBGr: 'Σπιτικό' },
  { id: 'food_spicy_mild', category: 'food', difficulty: 1, question: 'Spicy or Mild?', optionA: 'Spicy', optionB: 'Mild', questionGr: 'Πικάντικο ή Ήπιο;', optionAGr: 'Πικάντικο', optionBGr: 'Ήπιο' },
  { id: 'food_pizza_sushi', category: 'food', difficulty: 1, question: 'Pizza or Sushi?', optionA: 'Pizza', optionB: 'Sushi', questionGr: 'Πίτσα ή Σούσι;', optionAGr: 'Πίτσα', optionBGr: 'Σούσι' },
  { id: 'food_cook_together_order_in', category: 'food', difficulty: 2, question: 'Cook together or Order in?', optionA: 'Cook together', optionB: 'Order in', questionGr: 'Μαγειρεύετε μαζί ή Παραγγέλνετε;', optionAGr: 'Μαγειρική μαζί', optionBGr: 'Παραγγελία' },
  { id: 'food_fine_dining_street_food', category: 'food', difficulty: 2, question: 'Fine dining or Street food?', optionA: 'Fine dining', optionB: 'Street food', questionGr: 'Πολυτελές εστιατόριο ή Street food;', optionAGr: 'Πολυτελές εστιατόριο', optionBGr: 'Street food' },
  { id: 'food_try_new_food_stick_favorites', category: 'food', difficulty: 2, question: 'Try new food or Stick to favorites?', optionA: 'Try new food', optionB: 'Stick to favorites', questionGr: 'Δοκιμάζεις νέα φαγητά ή Μένεις στα αγαπημένα;', optionAGr: 'Νέα φαγητά', optionBGr: 'Αγαπημένα' },
  { id: 'food_breakfast_person_dinner', category: 'food', difficulty: 2, question: 'Breakfast person or Dinner person?', optionA: 'Breakfast', optionB: 'Dinner', questionGr: 'Άνθρωπος πρωινού ή δείπνου;', optionAGr: 'Πρωινό', optionBGr: 'Δείπνο' },
  { id: 'food_share_plates_own_plate', category: 'food', difficulty: 3, question: 'Share plates or Have your own plate?', optionA: 'Share plates', optionB: 'Own plate', questionGr: 'Μοιράζεστε πιάτα ή Έχει ο καθένας το δικό του;', optionAGr: 'Μοιράζεστε', optionBGr: 'Ο καθένας το δικό του' },
  { id: 'food_could_go_vegetarian', category: 'food', difficulty: 3, question: 'Could go vegetarian or Always a meat lover?', optionA: 'Could go vegetarian', optionB: 'Always meat lover', questionGr: 'Θα γινόσουν χορτοφάγος ή Πάντα κρεατοφάγος;', optionAGr: 'Χορτοφάγος', optionBGr: 'Κρεατοφάγος' },
  { id: 'food_food_is_memory_or_fuel', category: 'food', difficulty: 3, question: 'Food is tied to memories or Food is just fuel?', optionA: 'Tied to memories', optionB: 'Just fuel', questionGr: 'Το φαγητό είναι ανάμνηση ή απλά καύσιμο;', optionAGr: 'Ανάμνηση', optionBGr: 'Καύσιμο' },
  { id: 'food_cook_for_someone_being_cooked_for', category: 'food', difficulty: 2, question: 'Love cooking for someone or Being cooked for?', optionA: 'Cooking for them', optionB: 'Being cooked for', questionGr: 'Λατρεύεις να μαγειρεύεις για κάποιον ή να σου μαγειρεύουν;', optionAGr: 'Μαγειρεύεις', optionBGr: 'Σου μαγειρεύουν' },
  { id: 'music_pop_rock', category: 'music', difficulty: 1, question: 'Pop or Rock?', optionA: 'Pop', optionB: 'Rock', questionGr: 'Pop ή Rock;', optionAGr: 'Pop', optionBGr: 'Rock' },
  { id: 'music_old_songs_new_songs', category: 'music', difficulty: 1, question: 'Old songs or New songs?', optionA: 'Old songs', optionB: 'New songs', questionGr: 'Παλιά τραγούδια ή Νέα;', optionAGr: 'Παλιά', optionBGr: 'Νέα' },
  { id: 'music_live_concert_studio', category: 'music', difficulty: 1, question: 'Live concert or Studio recording?', optionA: 'Live concert', optionB: 'Studio recording', questionGr: 'Ζωντανή συναυλία ή Στούντιο;', optionAGr: 'Ζωντανή', optionBGr: 'Στούντιο' },
  { id: 'music_lyrics_melody', category: 'music', difficulty: 2, question: 'Lyrics or Melody matter more?', optionA: 'Lyrics', optionB: 'Melody', questionGr: 'Στίχοι ή Μελωδία;', optionAGr: 'Στίχοι', optionBGr: 'Μελωδία' },
  { id: 'music_sing_along_dance_along', category: 'music', difficulty: 2, question: 'Sing along or Dance along?', optionA: 'Sing along', optionB: 'Dance along', questionGr: 'Τραγουδάς ή Χορεύεις;', optionAGr: 'Τραγουδάς', optionBGr: 'Χορεύεις' },
  { id: 'music_playlist_radio_surprise', category: 'music', difficulty: 2, question: 'Curated playlist or Radio surprise?', optionA: 'Curated playlist', optionB: 'Radio surprise', questionGr: 'Playlist ή Έκπληξη ραδιοφώνου;', optionAGr: 'Playlist', optionBGr: 'Ραδιόφωνο' },
  { id: 'music_concert_small_big_festival', category: 'music', difficulty: 2, question: 'Small concert or Big festival?', optionA: 'Small concert', optionB: 'Big festival', questionGr: 'Μικρή συναυλία ή Μεγάλο φεστιβάλ;', optionAGr: 'Μικρή συναυλία', optionBGr: 'Φεστιβάλ' },
  { id: 'music_music_matches_changes_mood', category: 'music', difficulty: 3, question: 'Music matches your mood or Music changes your mood?', optionA: 'Matches my mood', optionB: 'Changes my mood', questionGr: 'Η μουσική ταιριάζει ή αλλάζει τη διάθεσή σου;', optionAGr: 'Ταιριάζει', optionBGr: 'Αλλάζει' },
  { id: 'music_need_music_always_enjoy_silence', category: 'music', difficulty: 3, question: 'Need music always or Enjoy silence too?', optionA: 'Need music always', optionB: 'Enjoy silence', questionGr: 'Πάντα μουσική ή Απολαμβάνεις και τη σιωπή;', optionAGr: 'Μουσική', optionBGr: 'Σιωπή' },
  { id: 'music_music_taste_shared_matters', category: 'music', difficulty: 3, question: 'Shared music taste matters or Doesn\'t matter at all?', optionA: 'Matters', optionB: 'Doesn\'t matter', questionGr: 'Τα κοινά μουσικά γούστα έχουν σημασία ή Καθόλου;', optionAGr: 'Έχει σημασία', optionBGr: 'Δεν έχει' },
  { id: 'movies_comedy_thriller', category: 'movies', difficulty: 1, question: 'Comedy or Thriller?', optionA: 'Comedy', optionB: 'Thriller', questionGr: 'Κωμωδία ή Θρίλερ;', optionAGr: 'Κωμωδία', optionBGr: 'Θρίλερ' },
  { id: 'movies_cinema_home', category: 'movies', difficulty: 1, question: 'Cinema or Home?', optionA: 'Cinema', optionB: 'Home', questionGr: 'Σινεμά ή Σπίτι;', optionAGr: 'Σινεμά', optionBGr: 'Σπίτι' },
  { id: 'movies_series_or_movie', category: 'movies', difficulty: 1, question: 'TV series or a Movie?', optionA: 'Series', optionB: 'Movie', questionGr: 'Σειρά ή Ταινία;', optionAGr: 'Σειρά', optionBGr: 'Ταινία' },
  { id: 'movies_action_romance', category: 'movies', difficulty: 1, question: 'Action or Romance?', optionA: 'Action', optionB: 'Romance', questionGr: 'Δράση ή Ρομαντική;', optionAGr: 'Δράση', optionBGr: 'Ρομαντική' },
  { id: 'movies_classic_new_release', category: 'movies', difficulty: 2, question: 'Classic film or New release?', optionA: 'Classic', optionB: 'New release', questionGr: 'Κλασική ταινία ή Νέα κυκλοφορία;', optionAGr: 'Κλασική', optionBGr: 'Νέα κυκλοφορία' },
  { id: 'movies_binge_watch_one_episode', category: 'movies', difficulty: 2, question: 'Binge-watch a season or One episode at a time?', optionA: 'Binge-watch', optionB: 'One at a time', questionGr: 'Binge-watch ή Ένα επεισόδιο τη φορά;', optionAGr: 'Binge-watch', optionBGr: 'Ένα τη φορά' },
  { id: 'movies_know_ending_be_surprised', category: 'movies', difficulty: 2, question: 'Know how it ends or Be surprised?', optionA: 'Know the ending', optionB: 'Be surprised', questionGr: 'Ξέρεις το τέλος ή Θες έκπληξη;', optionAGr: 'Ξέρεις το τέλος', optionBGr: 'Έκπληξη' },
  { id: 'movies_rewatch_favorites_always_new', category: 'movies', difficulty: 2, question: 'Rewatch favorites or Always something new?', optionA: 'Rewatch favorites', optionB: 'Always new', questionGr: 'Επανάληψη αγαπημένων ή Πάντα κάτι νέο;', optionAGr: 'Επανάληψη', optionBGr: 'Κάτι νέο' },
  { id: 'movies_movie_that_makes_cry_laugh', category: 'movies', difficulty: 3, question: 'A movie that makes you cry or one that makes you laugh?', optionA: 'Makes me cry', optionB: 'Makes me laugh', questionGr: 'Ταινία που σε κάνει να κλαις ή να γελάς;', optionAGr: 'Κλάμα', optionBGr: 'Γέλιο' },
  { id: 'movies_watch_alone_watch_together', category: 'movies', difficulty: 3, question: 'Prefer watching alone or Always together?', optionA: 'Watching alone', optionB: 'Always together', questionGr: 'Προτιμάς μόνος/η ή Πάντα μαζί;', optionAGr: 'Μόνος/η', optionBGr: 'Μαζί' },
  { id: 'humor_witty_silly', category: 'humor', difficulty: 1, question: 'Witty humor or Silly humor?', optionA: 'Witty', optionB: 'Silly', questionGr: 'Έξυπνο ή Χαζό χιούμορ;', optionAGr: 'Έξυπνο', optionBGr: 'Χαζό' },
  { id: 'humor_laugh_loud_giggle', category: 'humor', difficulty: 1, question: 'Laugh out loud or Quiet giggle?', optionA: 'Laugh out loud', optionB: 'Quiet giggle', questionGr: 'Δυνατό γέλιο ή Σιγανό χαχανητό;', optionAGr: 'Δυνατό', optionBGr: 'Σιγανό' },
  { id: 'humor_tease_gently_never_tease', category: 'humor', difficulty: 1, question: 'Tease each other gently or Never tease?', optionA: 'Tease gently', optionB: 'Never tease', questionGr: 'Πειράζεστε απαλά ή Ποτέ πείραγμα;', optionAGr: 'Πείραγμα', optionBGr: 'Ποτέ' },
  { id: 'humor_dry_humor_playful_humor', category: 'humor', difficulty: 2, question: 'Dry sarcastic humor or Playful goofy humor?', optionA: 'Dry sarcastic', optionB: 'Playful goofy', questionGr: 'Ξηρό σαρκαστικό ή Παιχνιδιάρικο χιούμορ;', optionAGr: 'Σαρκαστικό', optionBGr: 'Παιχνιδιάρικο' },
  { id: 'humor_laugh_at_yourself_serious', category: 'humor', difficulty: 2, question: 'Laugh at yourself easily or Take yourself seriously?', optionA: 'Laugh at myself', optionB: 'Take myself seriously', questionGr: 'Γελάς εύκολα με τον εαυτό σου ή Είσαι σοβαρός/ή;', optionAGr: 'Γελάς με τον εαυτό σου', optionBGr: 'Σοβαρός/ή' },
  { id: 'humor_inside_jokes_matter', category: 'humor', difficulty: 2, question: 'Inside jokes matter a lot or Not really?', optionA: 'Matter a lot', optionB: 'Not really', questionGr: 'Τα εσωτερικά αστεία έχουν σημασία ή Όχι ιδιαίτερα;', optionAGr: 'Έχει σημασία', optionBGr: 'Όχι ιδιαίτερα' },
  { id: 'humor_prank_someone_play_it_safe', category: 'humor', difficulty: 2, question: 'Prank someone or Play it safe?', optionA: 'Prank someone', optionB: 'Play it safe', questionGr: 'Φάρσα ή Ασφάλεια;', optionAGr: 'Φάρσα', optionBGr: 'Ασφάλεια' },
  { id: 'humor_humor_breaks_tension_avoid', category: 'humor', difficulty: 3, question: 'Use humor to break tension or Avoid joking in serious moments?', optionA: 'Break tension with humor', optionB: 'Avoid joking', questionGr: 'Χρησιμοποιείς χιούμορ σε ένταση ή Το αποφεύγεις;', optionAGr: 'Χιούμορ', optionBGr: 'Το αποφεύγεις' },
  { id: 'humor_funny_matters_more_than_looks', category: 'humor', difficulty: 3, question: 'Sense of humor or First impression matters more?', optionA: 'Sense of humor', optionB: 'First impression', questionGr: 'Το χιούμορ ή Η πρώτη εντύπωση μετράει πιο πολύ;', optionAGr: 'Χιούμορ', optionBGr: 'Πρώτη εντύπωση' },
  { id: 'values_honesty_kindness', category: 'values', difficulty: 1, question: 'Honesty or Kindness — which matters more?', optionA: 'Honesty', optionB: 'Kindness', questionGr: 'Ειλικρίνεια ή Καλοσύνη — τι μετράει πιο πολύ;', optionAGr: 'Ειλικρίνεια', optionBGr: 'Καλοσύνη' },
  { id: 'values_loyalty_freedom', category: 'values', difficulty: 2, question: 'Loyalty or Freedom?', optionA: 'Loyalty', optionB: 'Freedom', questionGr: 'Αφοσίωση ή Ελευθερία;', optionAGr: 'Αφοσίωση', optionBGr: 'Ελευθερία' },
  { id: 'values_family_first_self_first', category: 'values', difficulty: 2, question: 'Family first or Yourself first?', optionA: 'Family first', optionB: 'Myself first', questionGr: 'Οικογένεια πρώτα ή Ο εαυτός σου πρώτα;', optionAGr: 'Οικογένεια', optionBGr: 'Εαυτός' },
  { id: 'values_tradition_progress', category: 'values', difficulty: 2, question: 'Value tradition or Value progress?', optionA: 'Tradition', optionB: 'Progress', questionGr: 'Παράδοση ή Πρόοδος;', optionAGr: 'Παράδοση', optionBGr: 'Πρόοδος' },
  { id: 'values_stability_adventure', category: 'values', difficulty: 3, question: 'Stability or Adventure?', optionA: 'Stability', optionB: 'Adventure', questionGr: 'Σταθερότητα ή Περιπέτεια;', optionAGr: 'Σταθερότητα', optionBGr: 'Περιπέτεια' },
  { id: 'values_save_money_enjoy_moment', category: 'values', difficulty: 3, question: 'Save money or Enjoy the moment?', optionA: 'Save money', optionB: 'Enjoy the moment', questionGr: 'Αποταμίευση ή Απόλαυση της στιγμής;', optionAGr: 'Αποταμίευση', optionBGr: 'Στιγμή' },
  { id: 'values_follow_heart_follow_logic', category: 'values', difficulty: 3, question: 'Follow your heart or Follow logic?', optionA: 'Follow your heart', optionB: 'Follow logic', questionGr: 'Ακολουθείς την καρδιά ή τη λογική;', optionAGr: 'Καρδιά', optionBGr: 'Λογική' },
  { id: 'values_principles_over_comfort', category: 'values', difficulty: 3, question: 'Stick to principles or Choose comfort?', optionA: 'Stick to principles', optionB: 'Choose comfort', questionGr: 'Μένεις στις αρχές σου ή Επιλέγεις την άνεση;', optionAGr: 'Αρχές', optionBGr: 'Άνεση' },
  { id: 'values_integrity_over_success', category: 'values', difficulty: 3, question: 'Integrity over success or Success matters more?', optionA: 'Integrity', optionB: 'Success matters more', questionGr: 'Ακεραιότητα πάνω από την επιτυχία ή το αντίθετο;', optionAGr: 'Ακεραιότητα', optionBGr: 'Επιτυχία' },
  { id: 'values_give_more_receive_more', category: 'values', difficulty: 2, question: 'Prefer giving or Receiving?', optionA: 'Giving', optionB: 'Receiving', questionGr: 'Προτιμάς να δίνεις ή να δέχεσαι;', optionAGr: 'Δίνεις', optionBGr: 'Δέχεσαι' },
  { id: 'values_what_people_think_be_yourself', category: 'values', difficulty: 3, question: 'Care what people think or Just be yourself?', optionA: 'Care what people think', optionB: 'Just be myself', questionGr: 'Νοιάζεσαι τι σκέφτονται οι άλλοι ή Είσαι απλά ο εαυτός σου;', optionAGr: 'Νοιάζεσαι', optionBGr: 'Ο εαυτός σου' },
  { id: 'ambition_career_relationship_first', category: 'ambition', difficulty: 3, question: 'Career first or Relationship first?', optionA: 'Career first', optionB: 'Relationship first', questionGr: 'Καριέρα πρώτα ή Σχέση πρώτα;', optionAGr: 'Καριέρα', optionBGr: 'Σχέση' },
  { id: 'ambition_passion_paycheck', category: 'ambition', difficulty: 2, question: 'Work for passion or Work for paycheck?', optionA: 'Passion', optionB: 'Paycheck', questionGr: 'Δουλεύεις για πάθος ή για μισθό;', optionAGr: 'Πάθος', optionBGr: 'Μισθός' },
  { id: 'ambition_dream_big_stay_realistic', category: 'ambition', difficulty: 2, question: 'Dream big or Stay realistic?', optionA: 'Dream big', optionB: 'Stay realistic', questionGr: 'Ονειρεύεσαι μεγάλα ή Μένεις ρεαλιστής/τρια;', optionAGr: 'Μεγάλα όνειρα', optionBGr: 'Ρεαλισμός' },
  { id: 'ambition_stable_job_risky_startup', category: 'ambition', difficulty: 1, question: 'Stable job or Risky startup?', optionA: 'Stable job', optionB: 'Risky startup', questionGr: 'Σταθερή δουλειά ή Ριψοκίνδυνο startup;', optionAGr: 'Σταθερή', optionBGr: 'Startup' },
  { id: 'ambition_own_boss_team_player', category: 'ambition', difficulty: 2, question: 'Be your own boss or Be a great team player?', optionA: 'Own boss', optionB: 'Team player', questionGr: 'Δικό σου αφεντικό ή Καλός συνεργάτης;', optionAGr: 'Δικό σου αφεντικό', optionBGr: 'Συνεργάτης' },
  { id: 'ambition_work_life_balance_hustle', category: 'ambition', difficulty: 2, question: 'Work-life balance or Hustle culture?', optionA: 'Balance', optionB: 'Hustle', questionGr: 'Ισορροπία ζωής-δουλειάς ή Hustle;', optionAGr: 'Ισορροπία', optionBGr: 'Hustle' },
  { id: 'ambition_retire_early_work_forever', category: 'ambition', difficulty: 3, question: 'Retire early or Keep working on your passion forever?', optionA: 'Retire early', optionB: 'Work forever', questionGr: 'Πρόωρη σύνταξη ή Δουλεύεις πάνω στο πάθος σου για πάντα;', optionAGr: 'Πρόωρη σύνταξη', optionBGr: 'Για πάντα' },
  { id: 'ambition_recognition_quiet_impact', category: 'ambition', difficulty: 3, question: 'Want recognition or Prefer quiet impact?', optionA: 'Recognition', optionB: 'Quiet impact', questionGr: 'Θες αναγνώριση ή Προτιμάς σιωπηλή επιρροή;', optionAGr: 'Αναγνώριση', optionBGr: 'Σιωπηλή επιρροή' },
  { id: 'ambition_big_goals_small_wins', category: 'ambition', difficulty: 2, question: 'Chase big goals or Enjoy small wins?', optionA: 'Big goals', optionB: 'Small wins', questionGr: 'Κυνηγάς μεγάλους στόχους ή Απολαμβάνεις μικρές νίκες;', optionAGr: 'Μεγάλοι στόχοι', optionBGr: 'Μικρές νίκες' },
  { id: 'ambition_more_time_more_purpose', category: 'ambition', difficulty: 3, question: 'Chase more free time or Chase more purpose?', optionA: 'More free time', optionB: 'More purpose', questionGr: 'Κυνηγάς περισσότερο χρόνο ή περισσότερο νόημα;', optionAGr: 'Χρόνος', optionBGr: 'Νόημα' },
  { id: 'social_big_party_quiet_night', category: 'social', difficulty: 1, question: 'Big party or Quiet night?', optionA: 'Big party', optionB: 'Quiet night', questionGr: 'Μεγάλο πάρτι ή Ήσυχη βραδιά;', optionAGr: 'Μεγάλο πάρτι', optionBGr: 'Ήσυχη βραδιά' },
  { id: 'social_few_close_friends_many', category: 'social', difficulty: 1, question: 'Few close friends or Many friends?', optionA: 'Few close friends', optionB: 'Many friends', questionGr: 'Λίγοι στενοί φίλοι ή Πολλοί φίλοι;', optionAGr: 'Λίγοι στενοί', optionBGr: 'Πολλοί' },
  { id: 'social_host_guest', category: 'social', difficulty: 2, question: 'Host the gathering or Be a guest?', optionA: 'Host', optionB: 'Guest', questionGr: 'Φιλοξενείς ή Είσαι καλεσμένος/η;', optionAGr: 'Φιλοξενείς', optionBGr: 'Καλεσμένος/η' },
  { id: 'social_center_of_attention_background', category: 'social', difficulty: 2, question: 'Center of attention or Comfortable in the background?', optionA: 'Center of attention', optionB: 'In the background', questionGr: 'Κέντρο προσοχής ή Άνετα στο παρασκήνιο;', optionAGr: 'Κέντρο προσοχής', optionBGr: 'Παρασκήνιο' },
  { id: 'social_new_people_easily_takes_time', category: 'social', difficulty: 2, question: 'Meet new people easily or Takes time to open up?', optionA: 'Meet people easily', optionB: 'Takes time', questionGr: 'Γνωρίζεις εύκολα κόσμο ή Χρειάζεσαι χρόνο;', optionAGr: 'Εύκολα', optionBGr: 'Χρόνο' },
  { id: 'social_group_hangouts_one_on_one', category: 'social', difficulty: 2, question: 'Group hangouts or One-on-one time?', optionA: 'Group hangouts', optionB: 'One-on-one', questionGr: 'Παρέες ή Χρόνος έναν προς έναν;', optionAGr: 'Παρέες', optionBGr: 'Έναν προς έναν' },
  { id: 'social_plans_every_weekend_free_weekends', category: 'social', difficulty: 2, question: 'Plans every weekend or Prefer free weekends?', optionA: 'Plans every weekend', optionB: 'Free weekends', questionGr: 'Πλάνα κάθε Σαββατοκύριακο ή Ελεύθερα Σαββατοκύριακα;', optionAGr: 'Πλάνα', optionBGr: 'Ελεύθερα' },
  { id: 'social_friend_group_merge_separate', category: 'social', difficulty: 3, question: 'Merge friend groups together or Keep them separate?', optionA: 'Merge together', optionB: 'Keep separate', questionGr: 'Ενώνεις τις παρέες ή Τις κρατάς ξεχωριστές;', optionAGr: 'Ενώνεις', optionBGr: 'Ξεχωριστές' },
  { id: 'social_loyalty_to_friends_partner_first', category: 'social', difficulty: 3, question: 'Friends come first or Partner comes first?', optionA: 'Friends first', optionB: 'Partner first', questionGr: 'Οι φίλοι πρώτα ή Ο σύντροφος πρώτα;', optionAGr: 'Φίλοι', optionBGr: 'Σύντροφος' },
  { id: 'home_cook_clean_split', category: 'home', difficulty: 1, question: 'Cooking or Cleaning — which do you prefer?', optionA: 'Cooking', optionB: 'Cleaning', questionGr: 'Μαγείρεμα ή Καθάρισμα — τι προτιμάς;', optionAGr: 'Μαγείρεμα', optionBGr: 'Καθάρισμα' },
  { id: 'home_cozy_minimal_home', category: 'home', difficulty: 1, question: 'Cozy cluttered home or Minimal clean home?', optionA: 'Cozy and full', optionB: 'Minimal and clean', questionGr: 'Ζεστό γεμάτο σπίτι ή Μινιμαλιστικό καθαρό;', optionAGr: 'Ζεστό', optionBGr: 'Μινιμαλιστικό' },
  { id: 'home_morning_routine_night_routine', category: 'home', difficulty: 1, question: 'Morning routine or Night routine matters more?', optionA: 'Morning routine', optionB: 'Night routine', questionGr: 'Πρωινή ρουτίνα ή Βραδινή έχει σημασία;', optionAGr: 'Πρωινή', optionBGr: 'Βραδινή' },
  { id: 'home_shared_chores_own_tasks', category: 'home', difficulty: 2, question: 'Shared chores together or Everyone has their own tasks?', optionA: 'Shared chores', optionB: 'Own tasks', questionGr: 'Κοινές δουλειές σπιτιού ή Ο καθένας τις δικές του;', optionAGr: 'Κοινές', optionBGr: 'Ο καθένας τις δικές του' },
  { id: 'home_guests_often_rarely', category: 'home', difficulty: 2, question: 'Have guests over often or Rarely?', optionA: 'Often', optionB: 'Rarely', questionGr: 'Καλεσμένοι συχνά ή Σπάνια;', optionAGr: 'Συχνά', optionBGr: 'Σπάνια' },
  { id: 'home_decorate_together_own_style', category: 'home', difficulty: 2, question: 'Decorate together or Keep your own style?', optionA: 'Decorate together', optionB: 'Own style', questionGr: 'Διακοσμείτε μαζί ή Κρατάς το δικό σου στιλ;', optionAGr: 'Μαζί', optionBGr: 'Δικό σου στιλ' },
  { id: 'home_quiet_home_lively_home', category: 'home', difficulty: 2, question: 'Quiet peaceful home or Lively energetic home?', optionA: 'Quiet home', optionB: 'Lively home', questionGr: 'Ήσυχο σπίτι ή Ζωντανό σπίτι;', optionAGr: 'Ήσυχο', optionBGr: 'Ζωντανό' },
  { id: 'home_weekend_chores_weekend_rest', category: 'home', difficulty: 3, question: 'Weekend for chores or Weekend for rest?', optionA: 'Chores', optionB: 'Rest', questionGr: 'Σαββατοκύριακο για δουλειές ή Ξεκούραση;', optionAGr: 'Δουλειές', optionBGr: 'Ξεκούραση' },
  { id: 'home_routine_or_constant_change_home', category: 'home', difficulty: 3, question: 'Home routine or Constant change?', optionA: 'Routine', optionB: 'Constant change', questionGr: 'Ρουτίνα σπιτιού ή Συνεχής αλλαγή;', optionAGr: 'Ρουτίνα', optionBGr: 'Αλλαγή' },
  { id: 'adventure_try_new_things_stick_familiar', category: 'adventure', difficulty: 1, question: 'Try new things or Stick to the familiar?', optionA: 'Try new things', optionB: 'Stick to familiar', questionGr: 'Δοκιμάζεις νέα πράγματα ή Μένεις στα γνώριμα;', optionAGr: 'Νέα πράγματα', optionBGr: 'Γνώριμα' },
  { id: 'adventure_hiking_relaxing', category: 'adventure', difficulty: 1, question: 'Hiking adventure or Relaxing getaway?', optionA: 'Hiking', optionB: 'Relaxing getaway', questionGr: 'Πεζοπορία ή Χαλαρή απόδραση;', optionAGr: 'Πεζοπορία', optionBGr: 'Χαλάρωση' },
  { id: 'adventure_spontaneous_trip_planned_trip', category: 'adventure', difficulty: 1, question: 'Spontaneous trip or Planned trip?', optionA: 'Spontaneous', optionB: 'Planned', questionGr: 'Αυθόρμητο ή Προγραμματισμένο ταξίδι;', optionAGr: 'Αυθόρμητο', optionBGr: 'Προγραμματισμένο' },
  { id: 'adventure_thrill_seeker_safety_first', category: 'adventure', difficulty: 2, question: 'Thrill seeker or Safety first?', optionA: 'Thrill seeker', optionB: 'Safety first', questionGr: 'Λάτρης έντασης ή Ασφάλεια πρώτα;', optionAGr: 'Ένταση', optionBGr: 'Ασφάλεια' },
  { id: 'adventure_new_hobby_together_own_hobbies', category: 'adventure', difficulty: 2, question: 'Learn a new hobby together or Keep separate hobbies?', optionA: 'New hobby together', optionB: 'Separate hobbies', questionGr: 'Μαθαίνετε κάτι νέο μαζί ή Κρατάτε ξεχωριστά χόμπι;', optionAGr: 'Μαζί', optionBGr: 'Ξεχωριστά' },
  { id: 'adventure_say_yes_to_everything_choose_carefully', category: 'adventure', difficulty: 2, question: 'Say yes to everything or Choose adventures carefully?', optionA: 'Say yes to everything', optionB: 'Choose carefully', questionGr: 'Λες ναι σε όλα ή Διαλέγεις προσεκτικά;', optionAGr: 'Ναι σε όλα', optionBGr: 'Προσεκτικά' },
  { id: 'adventure_comfort_zone_push_limits', category: 'adventure', difficulty: 3, question: 'Stay in your comfort zone or Push your limits?', optionA: 'Comfort zone', optionB: 'Push limits', questionGr: 'Μένεις στη ζώνη άνεσης ή Σπρώχνεις τα όριά σου;', optionAGr: 'Ζώνη άνεσης', optionBGr: 'Όρια' },
  { id: 'adventure_unknown_excites_worries', category: 'adventure', difficulty: 3, question: 'The unknown excites you or Worries you?', optionA: 'Excites me', optionB: 'Worries me', questionGr: 'Το άγνωστο σε ενθουσιάζει ή σε ανησυχεί;', optionAGr: 'Ενθουσιασμός', optionBGr: 'Ανησυχία' },
  { id: 'adventure_adventure_alone_adventure_together', category: 'adventure', difficulty: 3, question: 'Adventure alone sometimes or Only together?', optionA: 'Alone sometimes', optionB: 'Only together', questionGr: 'Περιπέτεια μόνος/η καμιά φορά ή Μόνο μαζί;', optionAGr: 'Μόνος/η', optionBGr: 'Μαζί' },
  { id: 'romance_flowers_chocolate', category: 'romance', difficulty: 1, question: 'Flowers or Chocolate as a gift?', optionA: 'Flowers', optionB: 'Chocolate', questionGr: 'Λουλούδια ή Σοκολάτα ως δώρο;', optionAGr: 'Λουλούδια', optionBGr: 'Σοκολάτα' },
  { id: 'romance_handwritten_note_grand_gesture', category: 'romance', difficulty: 2, question: 'A handwritten note or A grand gesture?', optionA: 'Handwritten note', optionB: 'Grand gesture', questionGr: 'Χειρόγραφο σημείωμα ή Μεγάλη χειρονομία;', optionAGr: 'Σημείωμα', optionBGr: 'Χειρονομία' },
  { id: 'romance_slow_build_love_at_first_sight', category: 'romance', difficulty: 2, question: 'Slow-building love or Love at first sight?', optionA: 'Slow-building', optionB: 'Love at first sight', questionGr: 'Αγάπη που χτίζεται σιγά ή Έρωτας με την πρώτη ματιά;', optionAGr: 'Σιγά σιγά', optionBGr: 'Πρώτη ματιά' },
  { id: 'romance_romantic_dinner_adventurous_date', category: 'romance', difficulty: 2, question: 'Romantic dinner or Adventurous date?', optionA: 'Romantic dinner', optionB: 'Adventurous date', questionGr: 'Ρομαντικό δείπνο ή Ραντεβού περιπέτειας;', optionAGr: 'Δείπνο', optionBGr: 'Περιπέτεια' },
  { id: 'romance_say_i_love_you_first_wait', category: 'romance', difficulty: 3, question: 'Say \'I love you\' first or Wait for them to?', optionA: 'Say it first', optionB: 'Wait', questionGr: 'Λες \'σ\' αγαπώ\' πρώτος/η ή Περιμένεις;', optionAGr: 'Πρώτος/η', optionBGr: 'Περιμένεις' },
  { id: 'romance_show_love_through_words_touch', category: 'romance', difficulty: 2, question: 'Show love through words or Through touch?', optionA: 'Through words', optionB: 'Through touch', questionGr: 'Δείχνεις αγάπη με λόγια ή Με άγγιγμα;', optionAGr: 'Λόγια', optionBGr: 'Άγγιγμα' },
  { id: 'romance_keep_romance_alive_effort', category: 'romance', difficulty: 3, question: 'Romance needs constant effort or Should feel natural?', optionA: 'Constant effort', optionB: 'Feel natural', questionGr: 'Ο ρομαντισμός χρειάζεται προσπάθεια ή Πρέπει να είναι φυσικός;', optionAGr: 'Προσπάθεια', optionBGr: 'Φυσικός' },
  { id: 'romance_celebrate_anniversaries_every_day_matters', category: 'romance', difficulty: 3, question: 'Celebrate anniversaries big or Every day matters equally?', optionA: 'Big anniversaries', optionB: 'Every day matters', questionGr: 'Γιορτάζεις επετείους μεγάλα ή Κάθε μέρα έχει σημασία;', optionAGr: 'Επέτειοι', optionBGr: 'Κάθε μέρα' },
  { id: 'romance_chase_or_be_chased', category: 'romance', difficulty: 2, question: 'Prefer to chase or To be chased?', optionA: 'To chase', optionB: 'To be chased', questionGr: 'Προτιμάς να κυνηγάς ή να σε κυνηγούν;', optionAGr: 'Κυνηγάς', optionBGr: 'Σε κυνηγούν' },
  { id: 'ambition_side_hustle_one_focus', category: 'ambition', difficulty: 2, question: 'Multiple side hustles or One focused career?', optionA: 'Multiple hustles', optionB: 'One focused career', questionGr: 'Πολλές παράλληλες δουλειές ή Μία εστιασμένη καριέρα;', optionAGr: 'Πολλές', optionBGr: 'Μία εστιασμένη' },
  { id: 'ambition_promotion_over_passion_project', category: 'ambition', difficulty: 3, question: 'Take the promotion or Pursue the passion project?', optionA: 'Take the promotion', optionB: 'Passion project', questionGr: 'Παίρνεις την προαγωγή ή Ακολουθείς το πάθος σου;', optionAGr: 'Προαγωγή', optionBGr: 'Πάθος' },
  { id: 'movies_book_first_movie_first', category: 'movies', difficulty: 2, question: 'Read the book first or Watch the movie first?', optionA: 'Book first', optionB: 'Movie first', questionGr: 'Διαβάζεις πρώτα το βιβλίο ή Βλέπεις πρώτα την ταινία;', optionAGr: 'Βιβλίο πρώτα', optionBGr: 'Ταινία πρώτα' },
  { id: 'movies_talk_during_movie_silent_watching', category: 'movies', difficulty: 2, question: 'Talk during the movie or Watch in silence?', optionA: 'Talk during it', optionB: 'Watch in silence', questionGr: 'Μιλάς κατά τη διάρκεια ή Βλέπεις σιωπηλά;', optionAGr: 'Μιλάς', optionBGr: 'Σιωπηλά' },
  { id: 'music_music_while_working_silence_focus', category: 'music', difficulty: 2, question: 'Music while working or Silence to focus?', optionA: 'Music while working', optionB: 'Silence to focus', questionGr: 'Μουσική ενώ δουλεύεις ή Σιωπή για συγκέντρωση;', optionAGr: 'Μουσική', optionBGr: 'Σιωπή' },
  { id: 'music_discover_new_artists_loyal_favorites', category: 'music', difficulty: 2, question: 'Discover new artists constantly or Stay loyal to favorites?', optionA: 'Discover new artists', optionB: 'Loyal to favorites', questionGr: 'Ανακαλύπτεις συνεχώς νέους καλλιτέχνες ή Μένεις πιστός/ή στους αγαπημένους;', optionAGr: 'Νέοι καλλιτέχνες', optionBGr: 'Αγαπημένοι' },
  { id: 'values_kindness_to_strangers', category: 'values', difficulty: 2, question: 'Kind to strangers by default or Cautious until you know them?', optionA: 'Kind by default', optionB: 'Cautious first', questionGr: 'Ευγενικός/ή με αγνώστους ή Επιφυλακτικός/ή μέχρι να τους γνωρίσεις;', optionAGr: 'Ευγενικός/ή', optionBGr: 'Επιφυλακτικός/ή' },
  { id: 'values_second_chances_clean_break', category: 'values', difficulty: 3, question: 'Believe in second chances or Prefer a clean break?', optionA: 'Second chances', optionB: 'Clean break', questionGr: 'Πιστεύεις σε δεύτερες ευκαιρίες ή Προτιμάς ένα καθαρό τέλος;', optionAGr: 'Δεύτερες ευκαιρίες', optionBGr: 'Καθαρό τέλος' },
  { id: 'adventure_bucket_list_live_moment', category: 'adventure', difficulty: 2, question: 'Chase your bucket list or Live moment to moment?', optionA: 'Bucket list', optionB: 'Moment to moment', questionGr: 'Κυνηγάς τη λίστα ονείρων ή Ζεις τη στιγμή;', optionAGr: 'Λίστα ονείρων', optionBGr: 'Στιγμή' },
  { id: 'adventure_explore_alone_guide', category: 'adventure', difficulty: 2, question: 'Explore on your own or Follow a guide?', optionA: 'On your own', optionB: 'Follow a guide', questionGr: 'Εξερευνάς μόνος/η σου ή Ακολουθείς οδηγό;', optionAGr: 'Μόνος/η σου', optionBGr: 'Οδηγός' },
  { id: 'adventure_outdoors_over_indoors', category: 'adventure', difficulty: 1, question: 'Outdoors always or Indoors is fine too?', optionA: 'Outdoors always', optionB: 'Indoors is fine', questionGr: 'Πάντα έξω ή Και μέσα είναι μια χαρά;', optionAGr: 'Έξω', optionBGr: 'Μέσα' },
  { id: 'adventure_skydive_or_never', category: 'adventure', difficulty: 2, question: 'Would try skydiving or Never in a million years?', optionA: 'Would try it', optionB: 'Never', questionGr: 'Θα δοκίμαζες bungee jumping ή Ποτέ στη ζωή σου;', optionAGr: 'Θα δοκίμαζα', optionBGr: 'Ποτέ' },
  { id: 'adventure_risk_for_story_play_safe', category: 'adventure', difficulty: 3, question: 'Take the risk for a good story or Always play it safe?', optionA: 'Take the risk', optionB: 'Play it safe', questionGr: 'Παίρνεις το ρίσκο για μια καλή ιστορία ή Παίζεις πάντα ασφαλές;', optionAGr: 'Ρίσκο', optionBGr: 'Ασφάλεια' },
  { id: 'home_pet_at_home_no_pets', category: 'home', difficulty: 1, question: 'A pet at home or No pets?', optionA: 'A pet at home', optionB: 'No pets', questionGr: 'Κατοικίδιο στο σπίτι ή Χωρίς κατοικίδια;', optionAGr: 'Κατοικίδιο', optionBGr: 'Χωρίς' },
  { id: 'home_plants_everywhere_low_maintenance', category: 'home', difficulty: 2, question: 'Plants everywhere or Low-maintenance space?', optionA: 'Plants everywhere', optionB: 'Low-maintenance', questionGr: 'Φυτά παντού ή Χώρος χωρίς φροντίδα;', optionAGr: 'Φυτά', optionBGr: 'Χωρίς φροντίδα' },
  { id: 'home_home_is_for_relaxing_hosting', category: 'home', difficulty: 2, question: 'Home is for relaxing or Home is for hosting?', optionA: 'For relaxing', optionB: 'For hosting', questionGr: 'Το σπίτι είναι για χαλάρωση ή Για φιλοξενία;', optionAGr: 'Χαλάρωση', optionBGr: 'Φιλοξενία' },
  { id: 'home_open_kitchen_private_kitchen', category: 'home', difficulty: 1, question: 'Open-plan living or Separate private rooms?', optionA: 'Open-plan', optionB: 'Separate rooms', questionGr: 'Ανοιχτός χώρος ή Ξεχωριστά δωμάτια;', optionAGr: 'Ανοιχτός χώρος', optionBGr: 'Ξεχωριστά' },
  { id: 'home_fix_it_yourself_call_someone', category: 'home', difficulty: 2, question: 'Fix it yourself or Call someone?', optionA: 'Fix it yourself', optionB: 'Call someone', questionGr: 'Το φτιάχνεις μόνος/η σου ή Καλείς κάποιον;', optionAGr: 'Μόνος/η σου', optionBGr: 'Καλείς κάποιον' },
  { id: 'humor_puns_or_sarcasm', category: 'humor', difficulty: 1, question: 'Puns or Sarcasm?', optionA: 'Puns', optionB: 'Sarcasm', questionGr: 'Λογοπαίγνια ή Σαρκασμός;', optionAGr: 'Λογοπαίγνια', optionBGr: 'Σαρκασμός' },
  { id: 'humor_funny_movies_funny_people', category: 'humor', difficulty: 2, question: 'Funny movies or Funny people around you?', optionA: 'Funny movies', optionB: 'Funny people', questionGr: 'Αστείες ταινίες ή Αστείοι άνθρωποι γύρω σου;', optionAGr: 'Ταινίες', optionBGr: 'Άνθρωποι' },
  { id: 'humor_embarrass_easily_never_embarrassed', category: 'humor', difficulty: 2, question: 'Embarrass easily or Never embarrassed?', optionA: 'Embarrass easily', optionB: 'Never embarrassed', questionGr: 'Ντρέπεσαι εύκολα ή Ποτέ δεν ντρέπεσαι;', optionAGr: 'Ντρέπεσαι', optionBGr: 'Ποτέ' },
  { id: 'humor_laugh_at_own_jokes', category: 'humor', difficulty: 1, question: 'Laugh at your own jokes or Keep a straight face?', optionA: 'Laugh at my jokes', optionB: 'Straight face', questionGr: 'Γελάς με τα δικά σου αστεία ή Κρατάς ύφος;', optionAGr: 'Γελάς', optionBGr: 'Ύφος' },
  { id: 'humor_humor_as_flirting', category: 'humor', difficulty: 3, question: 'Use humor to flirt or Prefer being sincere?', optionA: 'Humor to flirt', optionB: 'Sincere', questionGr: 'Χρησιμοποιείς χιούμορ για φλερτ ή Προτιμάς την ειλικρίνεια;', optionAGr: 'Χιούμορ', optionBGr: 'Ειλικρίνεια' },
  { id: 'romance_public_declarations_private_moments', category: 'romance', difficulty: 2, question: 'Public declarations of love or Private intimate moments?', optionA: 'Public declarations', optionB: 'Private moments', questionGr: 'Δημόσιες δηλώσεις αγάπης ή Ιδιωτικές στιγμές;', optionAGr: 'Δημόσιες', optionBGr: 'Ιδιωτικές' },
  { id: 'romance_candlelight_dinner_picnic', category: 'romance', difficulty: 1, question: 'Candlelight dinner or Picnic date?', optionA: 'Candlelight dinner', optionB: 'Picnic date', questionGr: 'Δείπνο με κεριά ή Πικνίκ ραντεβού;', optionAGr: 'Κεριά', optionBGr: 'Πικνίκ' },
  { id: 'romance_long_distance_could_work', category: 'romance', difficulty: 3, question: 'Long distance could work or Needs to be close?', optionA: 'Could work', optionB: 'Needs to be close', questionGr: 'Η σχέση από απόσταση θα δούλευε ή Χρειάζεται εγγύτητα;', optionAGr: 'Θα δούλευε', optionBGr: 'Εγγύτητα' },
  { id: 'romance_small_daily_gestures_big_moments', category: 'romance', difficulty: 2, question: 'Small daily gestures or Big memorable moments?', optionA: 'Small daily gestures', optionB: 'Big moments', questionGr: 'Μικρές καθημερινές χειρονομίες ή Μεγάλες στιγμές;', optionAGr: 'Καθημερινές', optionBGr: 'Μεγάλες στιγμές' },
  { id: 'romance_jealousy_a_little_none_at_all', category: 'romance', difficulty: 3, question: 'A little jealousy is normal or None at all?', optionA: 'A little is normal', optionB: 'None at all', questionGr: 'Λίγη ζήλια είναι φυσιολογική ή Καθόλου;', optionAGr: 'Λίγη', optionBGr: 'Καθόλου' },
  { id: 'social_text_back_fast_slow', category: 'social', difficulty: 1, question: 'Text back fast or Take your time?', optionA: 'Text back fast', optionB: 'Take my time', questionGr: 'Απαντάς γρήγορα στα μηνύματα ή Παίρνεις τον χρόνο σου;', optionAGr: 'Γρήγορα', optionBGr: 'Χρόνο σου' },
  { id: 'social_plans_last_minute_weeks_ahead', category: 'social', difficulty: 2, question: 'Make plans last minute or Weeks ahead?', optionA: 'Last minute', optionB: 'Weeks ahead', questionGr: 'Κάνεις πλάνα την τελευταία στιγμή ή Εβδομάδες πριν;', optionAGr: 'Τελευταία στιγμή', optionBGr: 'Εβδομάδες πριν' },
  { id: 'social_small_gathering_big_crowd', category: 'social', difficulty: 1, question: 'Small gathering or Big crowd?', optionA: 'Small gathering', optionB: 'Big crowd', questionGr: 'Μικρή συγκέντρωση ή Μεγάλο πλήθος;', optionAGr: 'Μικρή', optionBGr: 'Μεγάλο πλήθος' },
  { id: 'social_say_no_to_plans_always_say_yes', category: 'social', difficulty: 2, question: 'Comfortable saying no to plans or Always say yes?', optionA: 'Say no when needed', optionB: 'Always say yes', questionGr: 'Άνετα λες όχι σε σχέδια ή Λες πάντα ναι;', optionAGr: 'Λες όχι', optionBGr: 'Λες πάντα ναι' },
  { id: 'social_friends_meet_family_first', category: 'social', difficulty: 3, question: 'Friends meet them first or Family meets them first?', optionA: 'Friends first', optionB: 'Family first', questionGr: 'Πρώτα γνωρίζουν οι φίλοι ή Η οικογένεια;', optionAGr: 'Φίλοι', optionBGr: 'Οικογένεια' },
]


// ── Question Engine ──────────────────────────────────────────────
// Scales to any number of questions in MYSTERY_QUESTIONS without any
// changes needed here or in the game screen. (Logic unchanged.)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function byDifficulty(pool: MysteryQuestion[], difficulty: MysteryChoiceDifficulty): MysteryQuestion[] {
  return pool.filter(q => q.difficulty === difficulty)
}

/**
 * Generate exactly 10 questions for one Mystery Choice game.
 *
 * Rules:
 * - No duplicate questions within the same game.
 * - Categories are randomized (shuffled pools), not fixed.
 * - Difficulty follows the round progression:
 *     Rounds 1-3  → Easy and light          (difficulty 1)
 *     Rounds 4-7  → Fun / personality-based (difficulty 2)
 *     Rounds 8-10 → Deeper and meaningful   (difficulty 3)
 * - Works with any pool size (200, 500, 1000, 2000+) — just picks
 *   randomly from whichever questions exist at each difficulty.
 */
export function generateMysteryQuestions(): MysteryQuestion[] {
  const easyPool = shuffle(byDifficulty(MYSTERY_QUESTIONS, 1))
  const mediumPool = shuffle(byDifficulty(MYSTERY_QUESTIONS, 2))
  const deepPool = shuffle(byDifficulty(MYSTERY_QUESTIONS, 3))

  const EASY_COUNT = 3, MEDIUM_COUNT = 4, DEEP_COUNT = 3

  const used = new Set<string>()
  function take(pool: MysteryQuestion[], count: number): MysteryQuestion[] {
    const picked: MysteryQuestion[] = []
    for (const q of pool) {
      if (picked.length >= count) break
      if (used.has(q.id)) continue
      picked.push(q)
      used.add(q.id)
    }
    return picked
  }

  const easy = take(easyPool, EASY_COUNT)
  const medium = take(mediumPool, MEDIUM_COUNT)
  const deep = take(deepPool, DEEP_COUNT)

  // Defensive backfill: if a difficulty band ever runs short (e.g. a very
  // small custom question bank), fill remaining slots from any unused
  // question so the game always returns exactly 10 questions. Extras are
  // appended to the "deep" band so the easy/medium round positions stay intact.
  const target = EASY_COUNT + MEDIUM_COUNT + DEEP_COUNT
  const extra: MysteryQuestion[] = []
  if (easy.length + medium.length + deep.length < target) {
    const fallbackPool = shuffle(MYSTERY_QUESTIONS.filter(q => !used.has(q.id)))
    for (const q of fallbackPool) {
      if (easy.length + medium.length + deep.length + extra.length >= target) break
      extra.push(q)
      used.add(q.id)
    }
  }

  // Preserve the required round-by-round difficulty progression:
  // rounds 1-3 easy, 4-7 medium, 8-10 deep (each band internally shuffled).
  return [...easy, ...medium, ...deep, ...extra].slice(0, target)
}

// Convert an engine question into the RoundData shape the game screen renders
// (emoji pair, English pair, Greek pair) — keeps the UI layer unchanged.
export function toRoundData(q: MysteryQuestion): { emoji: [string, string]; en: [string, string]; gr: [string, string] } {
  const emoji = CATEGORY_EMOJI[q.category] || ['🎭', '✨']
  return {
    emoji,
    en: [q.optionA, q.optionB],
    gr: [q.optionAGr, q.optionBGr],
  }
}
