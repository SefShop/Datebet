// Mystery Choice — scalable question engine
// Add new questions here any time; the game engine automatically picks up new entries.
// Currently supports 200+ questions and scales to 500+ / 1000+ / 2000+ with no game-logic changes.

export type MysteryChoiceCategory =
  'food' | 'fun' | 'gaming' | 'holidays' | 'lifestyle' | 'movies' | 'music' | 'nature' | 'personality' | 'pets' | 'random' | 'relationships' | 'sports' | 'technology' | 'travel' | 'work'

export type MysteryChoiceDifficulty = 1 | 2 | 3  // 1 = Easy, 2 = Medium, 3 = Deep

export interface MysteryQuestion {
  id: string
  category: MysteryChoiceCategory
  difficulty: MysteryChoiceDifficulty
  question: string
  optionA: string
  optionB: string
  // Bilingual + emoji fields used to render the existing game UI (kept unchanged)
  questionGr: string
  optionAGr: string
  optionBGr: string
}

// Fallback emoji pair per category, used when rendering the round (visual only)
export const CATEGORY_EMOJI: Record<MysteryChoiceCategory, [string, string]> = {
  food: ['🍽️', '🍷'],
  fun: ['🎉', '😂'],
  gaming: ['🎮', '🕹️'],
  holidays: ['🎄', '🎆'],
  lifestyle: ['🌿', '⚡'],
  movies: ['🎬', '🍿'],
  music: ['🎵', '🎧'],
  nature: ['🌲', '🌊'],
  personality: ['🧠', '❤️'],
  pets: ['🐶', '🐱'],
  random: ['🎲', '✨'],
  relationships: ['💕', '💬'],
  sports: ['⚽', '🏋️'],
  technology: ['📱', '💻'],
  travel: ['✈️', '🌍'],
  work: ['💼', '⏰'],
}

// 208 questions across 16 categories
export const MYSTERY_QUESTIONS: MysteryQuestion[] = [
  { id: 'food_coffee_wine', category: 'food', difficulty: 1, question: 'Coffee or Wine?', optionA: 'Coffee', optionB: 'Wine', questionGr: 'Καφές ή Κρασί;', optionAGr: 'Καφές', optionBGr: 'Κρασί' },
  { id: 'food_pizza_sushi', category: 'food', difficulty: 1, question: 'Pizza or Sushi?', optionA: 'Pizza', optionB: 'Sushi', questionGr: 'Πίτσα ή Σούσι;', optionAGr: 'Πίτσα', optionBGr: 'Σούσι' },
  { id: 'food_sweet_savory', category: 'food', difficulty: 1, question: 'Sweet or Savory?', optionA: 'Sweet', optionB: 'Savory', questionGr: 'Γλυκό ή Αλμυρό;', optionAGr: 'Γλυκό', optionBGr: 'Αλμυρό' },
  { id: 'food_spicy_mild', category: 'food', difficulty: 1, question: 'Spicy or Mild food?', optionA: 'Spicy', optionB: 'Mild', questionGr: 'Πικάντικο ή Ήπιο φαγητό;', optionAGr: 'Πικάντικο', optionBGr: 'Ήπιο' },
  { id: 'food_chocolate_vanilla', category: 'food', difficulty: 1, question: 'Chocolate or Vanilla?', optionA: 'Chocolate', optionB: 'Vanilla', questionGr: 'Σοκολάτα ή Βανίλια;', optionAGr: 'Σοκολάτα', optionBGr: 'Βανίλια' },
  { id: 'food_burger_taco', category: 'food', difficulty: 1, question: 'Burger or Taco?', optionA: 'Burger', optionB: 'Taco', questionGr: 'Μπέργκερ ή Τάκο;', optionAGr: 'Μπέργκερ', optionBGr: 'Τάκο' },
  { id: 'food_tea_coffee', category: 'food', difficulty: 1, question: 'Tea or Coffee?', optionA: 'Tea', optionB: 'Coffee', questionGr: 'Τσάι ή Καφές;', optionAGr: 'Τσάι', optionBGr: 'Καφές' },
  { id: 'food_breakfast_dinner', category: 'food', difficulty: 2, question: 'Breakfast person or Dinner person?', optionA: 'Breakfast', optionB: 'Dinner', questionGr: 'Άνθρωπος πρωινού ή δείπνου;', optionAGr: 'Πρωινό', optionBGr: 'Δείπνο' },
  { id: 'food_homemade_takeout', category: 'food', difficulty: 2, question: 'Homemade or Takeout?', optionA: 'Homemade', optionB: 'Takeout', questionGr: 'Σπιτικό ή Delivery;', optionAGr: 'Σπιτικό', optionBGr: 'Delivery' },
  { id: 'food_cook_order', category: 'food', difficulty: 2, question: 'Cook together or Order in?', optionA: 'Cook together', optionB: 'Order in', questionGr: 'Μαγειρική μαζί ή Παραγγελία;', optionAGr: 'Μαγειρική μαζί', optionBGr: 'Παραγγελία' },
  { id: 'food_fine_street', category: 'food', difficulty: 2, question: 'Fine dining or Street food?', optionA: 'Fine dining', optionB: 'Street food', questionGr: 'Πολυτελές εστιατόριο ή Street food;', optionAGr: 'Πολυτελές εστιατόριο', optionBGr: 'Street food' },
  { id: 'food_veggie_meat', category: 'food', difficulty: 3, question: 'Could go vegetarian or Always a meat lover?', optionA: 'Could go vegetarian', optionB: 'Always meat lover', questionGr: 'Θα γινόσουν χορτοφάγος ή πάντα κρεατοφάγος;', optionAGr: 'Χορτοφάγος', optionBGr: 'Κρεατοφάγος' },
  { id: 'food_food_memory', category: 'food', difficulty: 3, question: 'Food tied to a happy memory or Food is just fuel?', optionA: 'Happy memory', optionB: 'Just fuel', questionGr: 'Το φαγητό είναι ανάμνηση ή απλά καύσιμο;', optionAGr: 'Ανάμνηση', optionBGr: 'Καύσιμο' },
  { id: 'travel_beach_mountains', category: 'travel', difficulty: 1, question: 'Beach or Mountains?', optionA: 'Beach', optionB: 'Mountains', questionGr: 'Παραλία ή Βουνό;', optionAGr: 'Παραλία', optionBGr: 'Βουνό' },
  { id: 'travel_city_nature', category: 'travel', difficulty: 1, question: 'City break or Nature escape?', optionA: 'City break', optionB: 'Nature escape', questionGr: 'Πόλη ή Φύση;', optionAGr: 'Πόλη', optionBGr: 'Φύση' },
  { id: 'travel_plane_roadtrip', category: 'travel', difficulty: 1, question: 'Plane or Road trip?', optionA: 'Plane', optionB: 'Road trip', questionGr: 'Αεροπλάνο ή Οδικό ταξίδι;', optionAGr: 'Αεροπλάνο', optionBGr: 'Οδικό ταξίδι' },
  { id: 'travel_summer_winter', category: 'travel', difficulty: 1, question: 'Summer trip or Winter trip?', optionA: 'Summer', optionB: 'Winter', questionGr: 'Καλοκαιρινό ή Χειμερινό ταξίδι;', optionAGr: 'Καλοκαίρι', optionBGr: 'Χειμώνας' },
  { id: 'travel_hotel_camping', category: 'travel', difficulty: 1, question: 'Hotel or Camping?', optionA: 'Hotel', optionB: 'Camping', questionGr: 'Ξενοδοχείο ή Κάμπινγκ;', optionAGr: 'Ξενοδοχείο', optionBGr: 'Κάμπινγκ' },
  { id: 'travel_island_capital', category: 'travel', difficulty: 2, question: 'Island hopping or Exploring a capital city?', optionA: 'Island hopping', optionB: 'Capital city', questionGr: 'Νησιά ή Πρωτεύουσα;', optionAGr: 'Νησιά', optionBGr: 'Πρωτεύουσα' },
  { id: 'travel_plan_spontaneous', category: 'travel', difficulty: 2, question: 'Plan every detail or Go spontaneously?', optionA: 'Plan everything', optionB: 'Spontaneous', questionGr: 'Σχεδιασμός ή Αυθορμητισμός στο ταξίδι;', optionAGr: 'Σχεδιασμός', optionBGr: 'Αυθορμητισμός' },
  { id: 'travel_solo_group', category: 'travel', difficulty: 2, question: 'Solo travel or Group travel?', optionA: 'Solo travel', optionB: 'Group travel', questionGr: 'Μόνος/η ή Παρέα ταξίδι;', optionAGr: 'Μόνος/η', optionBGr: 'Παρέα' },
  { id: 'travel_backpack_luxury', category: 'travel', difficulty: 2, question: 'Backpacking or Luxury travel?', optionA: 'Backpacking', optionB: 'Luxury', questionGr: 'Backpacking ή Πολυτελές ταξίδι;', optionAGr: 'Backpacking', optionBGr: 'Πολυτελές' },
  { id: 'travel_far_near', category: 'travel', difficulty: 2, question: 'Far exotic destination or Nearby weekend trip?', optionA: 'Far and exotic', optionB: 'Nearby weekend', questionGr: 'Μακρινός προορισμός ή Κοντινό Σαββατοκύριακο;', optionAGr: 'Μακρινός', optionBGr: 'Κοντινό' },
  { id: 'travel_new_place_favorite', category: 'travel', difficulty: 3, question: 'Always visit new places or Return to a favorite?', optionA: 'New places', optionB: 'Favorite place', questionGr: 'Νέα μέρη ή Το αγαπημένο σου ξανά;', optionAGr: 'Νέα μέρη', optionBGr: 'Αγαπημένο μέρος' },
  { id: 'travel_live_abroad_home', category: 'travel', difficulty: 3, question: 'Could live abroad or Always home?', optionA: 'Live abroad', optionB: 'Always home', questionGr: 'Θα ζούσες στο εξωτερικό ή πάντα σπίτι;', optionAGr: 'Εξωτερικό', optionBGr: 'Σπίτι' },
  { id: 'travel_travel_alone_partner', category: 'travel', difficulty: 3, question: 'Travel defines you or Home defines you?', optionA: 'Travel defines me', optionB: 'Home defines me', questionGr: 'Το ταξίδι σε ορίζει ή το σπίτι σε ορίζει;', optionAGr: 'Ταξίδι', optionBGr: 'Σπίτι' },
  { id: 'movies_comedy_thriller', category: 'movies', difficulty: 1, question: 'Comedy or Thriller?', optionA: 'Comedy', optionB: 'Thriller', questionGr: 'Κωμωδία ή Θρίλερ;', optionAGr: 'Κωμωδία', optionBGr: 'Θρίλερ' },
  { id: 'movies_action_romance', category: 'movies', difficulty: 1, question: 'Action or Romance?', optionA: 'Action', optionB: 'Romance', questionGr: 'Δράση ή Ρομαντική;', optionAGr: 'Δράση', optionBGr: 'Ρομαντική' },
  { id: 'movies_cinema_home', category: 'movies', difficulty: 1, question: 'Cinema or Home?', optionA: 'Cinema', optionB: 'Home', questionGr: 'Σινεμά ή Σπίτι;', optionAGr: 'Σινεμά', optionBGr: 'Σπίτι' },
  { id: 'movies_horror_animation', category: 'movies', difficulty: 1, question: 'Horror or Animation?', optionA: 'Horror', optionB: 'Animation', questionGr: 'Τρόμου ή Κινούμενα σχέδια;', optionAGr: 'Τρόμου', optionBGr: 'Κινούμενα' },
  { id: 'movies_subtitles_dubbed', category: 'movies', difficulty: 1, question: 'Subtitles or Dubbed?', optionA: 'Subtitles', optionB: 'Dubbed', questionGr: 'Υπότιτλοι ή Μεταγλωττισμένο;', optionAGr: 'Υπότιτλοι', optionBGr: 'Μεταγλωττισμένο' },
  { id: 'movies_series_movie', category: 'movies', difficulty: 2, question: 'TV Series or Movie?', optionA: 'Series', optionB: 'Movie', questionGr: 'Σειρά ή Ταινία;', optionAGr: 'Σειρά', optionBGr: 'Ταινία' },
  { id: 'movies_classic_new', category: 'movies', difficulty: 2, question: 'Classic film or New release?', optionA: 'Classic', optionB: 'New release', questionGr: 'Κλασική ταινία ή Νέα κυκλοφορία;', optionAGr: 'Κλασική', optionBGr: 'Νέα κυκλοφορία' },
  { id: 'movies_popcorn_snacks', category: 'movies', difficulty: 2, question: 'Popcorn or Other snacks?', optionA: 'Popcorn', optionB: 'Other snacks', questionGr: 'Ποπ κορν ή Άλλα σνακ;', optionAGr: 'Ποπ κορν', optionBGr: 'Άλλα σνακ' },
  { id: 'movies_binge_one', category: 'movies', difficulty: 2, question: 'Binge-watch a season or One episode at a time?', optionA: 'Binge-watch', optionB: 'One at a time', questionGr: 'Binge-watch ή Ένα επεισόδιο τη φορά;', optionAGr: 'Binge-watch', optionBGr: 'Ένα τη φορά' },
  { id: 'movies_documentary_fiction', category: 'movies', difficulty: 2, question: 'Documentary or Fiction?', optionA: 'Documentary', optionB: 'Fiction', questionGr: 'Ντοκιμαντέρ ή Μυθοπλασία;', optionAGr: 'Ντοκιμαντέρ', optionBGr: 'Μυθοπλασία' },
  { id: 'movies_spoilers_surprise', category: 'movies', difficulty: 3, question: 'Know spoilers or Be surprised?', optionA: 'Know spoilers', optionB: 'Be surprised', questionGr: 'Spoilers πριν ή Έκπληξη;', optionAGr: 'Spoilers', optionBGr: 'Έκπληξη' },
  { id: 'movies_rewatch_new', category: 'movies', difficulty: 3, question: 'Rewatch favorites or Always something new?', optionA: 'Rewatch favorites', optionB: 'Always new', questionGr: 'Επανάληψη αγαπημένων ή Πάντα κάτι νέο;', optionAGr: 'Επανάληψη', optionBGr: 'Κάτι νέο' },
  { id: 'movies_cry_laugh_movie', category: 'movies', difficulty: 3, question: 'A movie that makes you cry or one that makes you laugh?', optionA: 'Makes me cry', optionB: 'Makes me laugh', questionGr: 'Ταινία που σε κάνει να κλαις ή να γελάς;', optionAGr: 'Κλάμα', optionBGr: 'Γέλιο' },
  { id: 'music_pop_rock', category: 'music', difficulty: 1, question: 'Pop or Rock?', optionA: 'Pop', optionB: 'Rock', questionGr: 'Pop ή Rock;', optionAGr: 'Pop', optionBGr: 'Rock' },
  { id: 'music_live_studio', category: 'music', difficulty: 1, question: 'Live concert or Studio recording?', optionA: 'Live concert', optionB: 'Studio', questionGr: 'Ζωντανή συναυλία ή Studio ηχογράφηση;', optionAGr: 'Ζωντανή', optionBGr: 'Studio' },
  { id: 'music_headphones_speakers', category: 'music', difficulty: 1, question: 'Headphones or Speakers?', optionA: 'Headphones', optionB: 'Speakers', questionGr: 'Ακουστικά ή Ηχεία;', optionAGr: 'Ακουστικά', optionBGr: 'Ηχεία' },
  { id: 'music_lyrics_melody', category: 'music', difficulty: 2, question: 'Lyrics or Melody?', optionA: 'Lyrics', optionB: 'Melody', questionGr: 'Στίχοι ή Μελωδία;', optionAGr: 'Στίχοι', optionBGr: 'Μελωδία' },
  { id: 'music_old_new_songs', category: 'music', difficulty: 1, question: 'Old songs or New songs?', optionA: 'Old songs', optionB: 'New songs', questionGr: 'Παλιά τραγούδια ή Νέα;', optionAGr: 'Παλιά', optionBGr: 'Νέα' },
  { id: 'music_dance_chill', category: 'music', difficulty: 2, question: 'Dance music or Chill music?', optionA: 'Dance music', optionB: 'Chill music', questionGr: 'Χορευτική μουσική ή Chill μουσική;', optionAGr: 'Χορευτική', optionBGr: 'Chill' },
  { id: 'music_english_greek', category: 'music', difficulty: 2, question: 'English music or Greek music?', optionA: 'English', optionB: 'Greek', questionGr: 'Ξενόγλωσση μουσική ή Ελληνική;', optionAGr: 'Ξενόγλωσση', optionBGr: 'Ελληνική' },
  { id: 'music_playlist_radio', category: 'music', difficulty: 2, question: 'Curated playlist or Radio surprise?', optionA: 'Playlist', optionB: 'Radio', questionGr: 'Playlist ή Ραδιόφωνο;', optionAGr: 'Playlist', optionBGr: 'Ραδιόφωνο' },
  { id: 'music_sing_dance', category: 'music', difficulty: 2, question: 'Sing along or Dance along?', optionA: 'Sing along', optionB: 'Dance along', questionGr: 'Τραγουδάς ή Χορεύεις;', optionAGr: 'Τραγουδάς', optionBGr: 'Χορεύεις' },
  { id: 'music_concert_festival', category: 'music', difficulty: 2, question: 'Small concert or Big festival?', optionA: 'Small concert', optionB: 'Big festival', questionGr: 'Μικρή συναυλία ή Μεγάλο φεστιβάλ;', optionAGr: 'Μικρή συναυλία', optionBGr: 'Φεστιβάλ' },
  { id: 'music_music_mood_maker', category: 'music', difficulty: 3, question: 'Music matches your mood or Music changes your mood?', optionA: 'Matches mood', optionB: 'Changes mood', questionGr: 'Η μουσική ταιριάζει ή αλλάζει τη διάθεσή σου;', optionAGr: 'Ταιριάζει', optionBGr: 'Αλλάζει' },
  { id: 'music_silence_music', category: 'music', difficulty: 3, question: 'Need music always or Enjoy silence?', optionA: 'Music always', optionB: 'Enjoy silence', questionGr: 'Πάντα μουσική ή Απολαμβάνεις τη σιωπή;', optionAGr: 'Μουσική', optionBGr: 'Σιωπή' },
  { id: 'music_song_for_someone', category: 'music', difficulty: 3, question: 'Write a song for someone or Dance with someone?', optionA: 'Write a song', optionB: 'Dance together', questionGr: 'Θα έγραφες τραγούδι ή θα χόρευες μαζί του/της;', optionAGr: 'Γράφεις τραγούδι', optionBGr: 'Χορεύεις μαζί' },
  { id: 'relationships_call_text', category: 'relationships', difficulty: 1, question: 'Call or Text?', optionA: 'Call', optionB: 'Text', questionGr: 'Κλήση ή Μήνυμα;', optionAGr: 'Κλήση', optionBGr: 'Μήνυμα' },
  { id: 'relationships_night_out_cozy', category: 'relationships', difficulty: 1, question: 'Night out or Cozy night in?', optionA: 'Night out', optionB: 'Cozy night in', questionGr: 'Έξοδος ή Χαλαρή βραδιά σπίτι;', optionAGr: 'Έξοδος', optionBGr: 'Σπίτι' },
  { id: 'relationships_flowers_chocolate', category: 'relationships', difficulty: 1, question: 'Flowers or Chocolate as a gift?', optionA: 'Flowers', optionB: 'Chocolate', questionGr: 'Λουλούδια ή Σοκολάτα ως δώρο;', optionAGr: 'Λουλούδια', optionBGr: 'Σοκολάτα' },
  { id: 'relationships_morning_person_love', category: 'relationships', difficulty: 1, question: 'Morning cuddles or Evening cuddles?', optionA: 'Morning', optionB: 'Evening', questionGr: 'Πρωινές ή Βραδινές αγκαλιές;', optionAGr: 'Πρωινές', optionBGr: 'Βραδινές' },
  { id: 'relationships_surprise_plan_date', category: 'relationships', difficulty: 2, question: 'Surprise date or Planned date?', optionA: 'Surprise', optionB: 'Planned', questionGr: 'Έκπληξη ραντεβού ή Προγραμματισμένο;', optionAGr: 'Έκπληξη', optionBGr: 'Προγραμματισμένο' },
  { id: 'relationships_words_actions', category: 'relationships', difficulty: 2, question: 'Words of affirmation or Acts of service?', optionA: 'Words', optionB: 'Actions', questionGr: 'Λόγια αγάπης ή Πράξεις;', optionAGr: 'Λόγια', optionBGr: 'Πράξεις' },
  { id: 'relationships_public_private_affection', category: 'relationships', difficulty: 2, question: 'Public affection or Private affection?', optionA: 'Public', optionB: 'Private', questionGr: 'Δημόσια ή Ιδιωτική τρυφερότητα;', optionAGr: 'Δημόσια', optionBGr: 'Ιδιωτική' },
  { id: 'relationships_talk_it_out_space', category: 'relationships', difficulty: 2, question: 'Talk it out immediately or Take space first?', optionA: 'Talk immediately', optionB: 'Take space', questionGr: 'Μιλάς αμέσως ή Χρειάζεσαι χώρο πρώτα;', optionAGr: 'Μιλάς αμέσως', optionBGr: 'Χώρος' },
  { id: 'relationships_first_move_wait', category: 'relationships', difficulty: 2, question: 'Make the first move or Wait for them?', optionA: 'First move', optionB: 'Wait', questionGr: 'Κάνεις την πρώτη κίνηση ή Περιμένεις;', optionAGr: 'Πρώτη κίνηση', optionBGr: 'Περιμένεις' },
  { id: 'relationships_long_texts_short', category: 'relationships', difficulty: 2, question: 'Long texts or Short texts?', optionA: 'Long texts', optionB: 'Short texts', questionGr: 'Μεγάλα μηνύματα ή Σύντομα;', optionAGr: 'Μεγάλα', optionBGr: 'Σύντομα' },
  { id: 'relationships_soulmate_grow_together', category: 'relationships', difficulty: 3, question: 'Believe in soulmates or Grow into love together?', optionA: 'Soulmates', optionB: 'Grow together', questionGr: 'Πιστεύεις σε ταίρι ή χτίζεις την αγάπη μαζί;', optionAGr: 'Ταίρι', optionBGr: 'Χτίζεις μαζί' },
  { id: 'relationships_independence_closeness', category: 'relationships', difficulty: 3, question: 'Need independence or Crave closeness?', optionA: 'Independence', optionB: 'Closeness', questionGr: 'Χρειάζεσαι ανεξαρτησία ή εγγύτητα;', optionAGr: 'Ανεξαρτησία', optionBGr: 'Εγγύτητα' },
  { id: 'relationships_logic_heart', category: 'relationships', difficulty: 3, question: 'Follow logic or Follow your heart in love?', optionA: 'Logic', optionB: 'Heart', questionGr: 'Ακολουθείς τη λογική ή την καρδιά σου στην αγάπη;', optionAGr: 'Λογική', optionBGr: 'Καρδιά' },
  { id: 'lifestyle_early_bird_night_owl', category: 'lifestyle', difficulty: 1, question: 'Early bird or Night owl?', optionA: 'Early bird', optionB: 'Night owl', questionGr: 'Πρωινός τύπος ή Νυχτοπούλι;', optionAGr: 'Πρωινός τύπος', optionBGr: 'Νυχτοπούλι' },
  { id: 'lifestyle_plan_flow', category: 'lifestyle', difficulty: 1, question: 'Plan everything or Go with the flow?', optionA: 'Plan everything', optionB: 'Go with the flow', questionGr: 'Σχεδιάζεις τα πάντα ή Πάς με το ρεύμα;', optionAGr: 'Σχεδιάζεις', optionBGr: 'Ρεύμα' },
  { id: 'lifestyle_minimalist_collector', category: 'lifestyle', difficulty: 1, question: 'Minimalist or Collector?', optionA: 'Minimalist', optionB: 'Collector', questionGr: 'Μινιμαλιστής ή Συλλέκτης;', optionAGr: 'Μινιμαλιστής', optionBGr: 'Συλλέκτης' },
  { id: 'lifestyle_clean_messy', category: 'lifestyle', difficulty: 1, question: 'Neat and tidy or Organized chaos?', optionA: 'Neat and tidy', optionB: 'Organized chaos', questionGr: 'Τακτοποιημένος ή Οργανωμένο χάος;', optionAGr: 'Τακτοποιημένος', optionBGr: 'Χάος' },
  { id: 'lifestyle_shower_morning_night', category: 'lifestyle', difficulty: 1, question: 'Shower in the morning or at night?', optionA: 'Morning shower', optionB: 'Night shower', questionGr: 'Πρωινό ή Βραδινό μπάνιο;', optionAGr: 'Πρωινό', optionBGr: 'Βραδινό' },
  { id: 'lifestyle_save_spend', category: 'lifestyle', difficulty: 2, question: 'Save money or Spend on experiences?', optionA: 'Save', optionB: 'Spend on experiences', questionGr: 'Αποταμίευση ή Έξοδα σε εμπειρίες;', optionAGr: 'Αποταμίευση', optionBGr: 'Εμπειρίες' },
  { id: 'lifestyle_routine_variety', category: 'lifestyle', difficulty: 2, question: 'Stick to routine or Crave variety?', optionA: 'Routine', optionB: 'Variety', questionGr: 'Ρουτίνα ή Ποικιλία;', optionAGr: 'Ρουτίνα', optionBGr: 'Ποικιλία' },
  { id: 'lifestyle_indoor_outdoor', category: 'lifestyle', difficulty: 2, question: 'Indoor weekend or Outdoor weekend?', optionA: 'Indoor', optionB: 'Outdoor', questionGr: 'Σαββατοκύριακο μέσα ή έξω;', optionAGr: 'Μέσα', optionBGr: 'Έξω' },
  { id: 'lifestyle_simple_life_ambitious', category: 'lifestyle', difficulty: 2, question: 'Simple quiet life or Ambitious big life?', optionA: 'Simple life', optionB: 'Ambitious life', questionGr: 'Απλή ζωή ή Φιλόδοξη ζωή;', optionAGr: 'Απλή ζωή', optionBGr: 'Φιλόδοξη ζωή' },
  { id: 'lifestyle_city_countryside', category: 'lifestyle', difficulty: 2, question: 'Live in the city or Countryside?', optionA: 'City', optionB: 'Countryside', questionGr: 'Πόλη ή Επαρχία;', optionAGr: 'Πόλη', optionBGr: 'Επαρχία' },
  { id: 'lifestyle_more_time_more_money', category: 'lifestyle', difficulty: 3, question: 'More free time or More money?', optionA: 'More time', optionB: 'More money', questionGr: 'Περισσότερος χρόνος ή περισσότερα χρήματα;', optionAGr: 'Χρόνος', optionBGr: 'Χρήματα' },
  { id: 'lifestyle_change_comfort', category: 'lifestyle', difficulty: 3, question: 'Embrace change or Value comfort?', optionA: 'Change', optionB: 'Comfort', questionGr: 'Αγκαλιάζεις την αλλαγή ή προτιμάς την άνεση;', optionAGr: 'Αλλαγή', optionBGr: 'Άνεση' },
  { id: 'lifestyle_legacy_present', category: 'lifestyle', difficulty: 3, question: 'Live for the future or Live in the present?', optionA: 'Future', optionB: 'Present', questionGr: 'Ζεις για το μέλλον ή το παρόν;', optionAGr: 'Μέλλον', optionBGr: 'Παρόν' },
  { id: 'pets_dog_cat', category: 'pets', difficulty: 1, question: 'Dog or Cat?', optionA: 'Dog', optionB: 'Cat', questionGr: 'Σκύλος ή Γάτα;', optionAGr: 'Σκύλος', optionBGr: 'Γάτα' },
  { id: 'pets_big_small_dog', category: 'pets', difficulty: 1, question: 'Big dog or Small dog?', optionA: 'Big dog', optionB: 'Small dog', questionGr: 'Μεγάλος ή Μικρός σκύλος;', optionAGr: 'Μεγάλος', optionBGr: 'Μικρός' },
  { id: 'pets_one_many_pets', category: 'pets', difficulty: 1, question: 'One pet or Many pets?', optionA: 'One pet', optionB: 'Many pets', questionGr: 'Ένα ή Πολλά κατοικίδια;', optionAGr: 'Ένα', optionBGr: 'Πολλά' },
  { id: 'pets_indoor_outdoor_pet', category: 'pets', difficulty: 1, question: 'Indoor pet or Outdoor pet?', optionA: 'Indoor', optionB: 'Outdoor', questionGr: 'Κατοικίδιο μέσα ή έξω;', optionAGr: 'Μέσα', optionBGr: 'Έξω' },
  { id: 'pets_fish_bird', category: 'pets', difficulty: 1, question: 'Fish or Bird?', optionA: 'Fish', optionB: 'Bird', questionGr: 'Ψάρι ή Πουλί;', optionAGr: 'Ψάρι', optionBGr: 'Πουλί' },
  { id: 'pets_walk_playtime', category: 'pets', difficulty: 2, question: 'Walking your pet or Playtime at home?', optionA: 'Walking', optionB: 'Playtime', questionGr: 'Βόλτα ή Παιχνίδι στο σπίτι;', optionAGr: 'Βόλτα', optionBGr: 'Παιχνίδι' },
  { id: 'pets_adopt_breed', category: 'pets', difficulty: 2, question: 'Adopt or Choose a specific breed?', optionA: 'Adopt', optionB: 'Specific breed', questionGr: 'Υιοθεσία ή Συγκεκριμένη ράτσα;', optionAGr: 'Υιοθεσία', optionBGr: 'Ράτσα' },
  { id: 'pets_pet_bed_sleep', category: 'pets', difficulty: 2, question: 'Pet sleeps in your bed or Its own bed?', optionA: 'In your bed', optionB: 'Own bed', questionGr: 'Το κατοικίδιο κοιμάται στο κρεβάτι σου ή στο δικό του;', optionAGr: 'Στο κρεβάτι σου', optionBGr: 'Στο δικό του' },
  { id: 'pets_pet_names_human', category: 'pets', difficulty: 2, question: 'Human name for pets or Fun quirky name?', optionA: 'Human name', optionB: 'Quirky name', questionGr: 'Ανθρώπινο όνομα ή Αστείο όνομα για κατοικίδιο;', optionAGr: 'Ανθρώπινο', optionBGr: 'Αστείο' },
  { id: 'pets_no_pet_pet_person', category: 'pets', difficulty: 2, question: 'Total pet person or Could live without one?', optionA: 'Pet person', optionB: 'Could live without', questionGr: 'Λάτρης κατοικιδίων ή Θα ζούσες χωρίς;', optionAGr: 'Λάτρης', optionBGr: 'Χωρίς' },
  { id: 'pets_pet_priority_travel', category: 'pets', difficulty: 3, question: 'Plan trips around your pet or Pet stays with someone?', optionA: 'Plan around pet', optionB: 'Pet stays behind', questionGr: 'Σχεδιάζεις ταξίδια με βάση το κατοικίδιο ή μένει πίσω;', optionAGr: 'Μαζί σου', optionBGr: 'Μένει πίσω' },
  { id: 'pets_pet_as_family', category: 'pets', difficulty: 3, question: 'Pet feels like family or Pet is just an animal?', optionA: 'Feels like family', optionB: 'Just an animal', questionGr: 'Το κατοικίδιο είναι οικογένεια ή απλά ζώο;', optionAGr: 'Οικογένεια', optionBGr: 'Ζώο' },
  { id: 'pets_rescue_pure', category: 'pets', difficulty: 3, question: 'Rescue animal or Purebred?', optionA: 'Rescue', optionB: 'Purebred', questionGr: 'Σωσμένο ζώο ή Καθαρόαιμο;', optionAGr: 'Σωσμένο', optionBGr: 'Καθαρόαιμο' },
  { id: 'sports_football_basketball', category: 'sports', difficulty: 1, question: 'Football or Basketball?', optionA: 'Football', optionB: 'Basketball', questionGr: 'Ποδόσφαιρο ή Μπάσκετ;', optionAGr: 'Ποδόσφαιρο', optionBGr: 'Μπάσκετ' },
  { id: 'sports_watch_play', category: 'sports', difficulty: 1, question: 'Watch sports or Play sports?', optionA: 'Watch', optionB: 'Play', questionGr: 'Παρακολουθείς ή Παίζεις άθλημα;', optionAGr: 'Παρακολουθείς', optionBGr: 'Παίζεις' },
  { id: 'sports_gym_outdoor', category: 'sports', difficulty: 1, question: 'Gym or Outdoor workout?', optionA: 'Gym', optionB: 'Outdoor', questionGr: 'Γυμναστήριο ή Άσκηση έξω;', optionAGr: 'Γυμναστήριο', optionBGr: 'Έξω' },
  { id: 'sports_team_solo_sport', category: 'sports', difficulty: 1, question: 'Team sport or Solo sport?', optionA: 'Team sport', optionB: 'Solo sport', questionGr: 'Ομαδικό ή Ατομικό άθλημα;', optionAGr: 'Ομαδικό', optionBGr: 'Ατομικό' },
  { id: 'sports_swim_run', category: 'sports', difficulty: 1, question: 'Swimming or Running?', optionA: 'Swimming', optionB: 'Running', questionGr: 'Κολύμπι ή Τρέξιμο;', optionAGr: 'Κολύμπι', optionBGr: 'Τρέξιμο' },
  { id: 'sports_morning_evening_workout', category: 'sports', difficulty: 2, question: 'Morning workout or Evening workout?', optionA: 'Morning', optionB: 'Evening', questionGr: 'Πρωινή ή Βραδινή άσκηση;', optionAGr: 'Πρωινή', optionBGr: 'Βραδινή' },
  { id: 'sports_competitive_casual', category: 'sports', difficulty: 2, question: 'Competitive or Just for fun?', optionA: 'Competitive', optionB: 'Just for fun', questionGr: 'Ανταγωνιστικό ή Απλά για διασκέδαση;', optionAGr: 'Ανταγωνιστικό', optionBGr: 'Διασκέδαση' },
  { id: 'sports_watch_live_tv', category: 'sports', difficulty: 2, question: 'Watch live at the stadium or On TV?', optionA: 'Live at stadium', optionB: 'On TV', questionGr: 'Ζωντανά στο γήπεδο ή στην τηλεόραση;', optionAGr: 'Γήπεδο', optionBGr: 'Τηλεόραση' },
  { id: 'sports_winter_summer_sport', category: 'sports', difficulty: 2, question: 'Winter sports or Summer sports?', optionA: 'Winter sports', optionB: 'Summer sports', questionGr: 'Χειμερινά ή Καλοκαιρινά αθλήματα;', optionAGr: 'Χειμερινά', optionBGr: 'Καλοκαιρινά' },
  { id: 'sports_yoga_hiit', category: 'sports', difficulty: 2, question: 'Yoga or High-intensity training?', optionA: 'Yoga', optionB: 'HIIT', questionGr: 'Γιόγκα ή Έντονη προπόνηση;', optionAGr: 'Γιόγκα', optionBGr: 'Έντονη προπόνηση' },
  { id: 'sports_discipline_motivation', category: 'sports', difficulty: 3, question: 'Rely on discipline or Wait for motivation?', optionA: 'Discipline', optionB: 'Motivation', questionGr: 'Βασίζεσαι στην πειθαρχία ή περιμένεις κίνητρο;', optionAGr: 'Πειθαρχία', optionBGr: 'Κίνητρο' },
  { id: 'sports_body_mind_focus', category: 'sports', difficulty: 3, question: 'Train the body or Train the mind?', optionA: 'Body', optionB: 'Mind', questionGr: 'Προπονείς σώμα ή μυαλό;', optionAGr: 'Σώμα', optionBGr: 'Μυαλό' },
  { id: 'sports_sport_as_hobby_lifestyle', category: 'sports', difficulty: 3, question: 'Sport is a hobby or Sport is a lifestyle?', optionA: 'Hobby', optionB: 'Lifestyle', questionGr: 'Το άθλημα είναι χόμπι ή τρόπος ζωής;', optionAGr: 'Χόμπι', optionBGr: 'Τρόπος ζωής' },
  { id: 'technology_iphone_android', category: 'technology', difficulty: 1, question: 'iPhone or Android?', optionA: 'iPhone', optionB: 'Android', questionGr: 'iPhone ή Android;', optionAGr: 'iPhone', optionBGr: 'Android' },
  { id: 'technology_laptop_desktop', category: 'technology', difficulty: 1, question: 'Laptop or Desktop?', optionA: 'Laptop', optionB: 'Desktop', questionGr: 'Laptop ή Desktop;', optionAGr: 'Laptop', optionBGr: 'Desktop' },
  { id: 'technology_text_voice_message', category: 'technology', difficulty: 1, question: 'Text or Voice message?', optionA: 'Text', optionB: 'Voice message', questionGr: 'Μήνυμα κειμένου ή Φωνητικό;', optionAGr: 'Κείμενο', optionBGr: 'Φωνητικό' },
  { id: 'technology_wifi_data', category: 'technology', difficulty: 1, question: 'WiFi or Mobile data?', optionA: 'WiFi', optionB: 'Mobile data', questionGr: 'WiFi ή Δεδομένα κινητής;', optionAGr: 'WiFi', optionBGr: 'Δεδομένα' },
  { id: 'technology_new_gadgets_wait', category: 'technology', difficulty: 2, question: 'Buy new gadgets right away or Wait it out?', optionA: 'Buy right away', optionB: 'Wait it out', questionGr: 'Αγοράζεις νέα gadgets αμέσως ή περιμένεις;', optionAGr: 'Αμέσως', optionBGr: 'Περιμένεις' },
  { id: 'technology_social_media_offline', category: 'technology', difficulty: 2, question: 'Active on social media or Prefer offline life?', optionA: 'Social media', optionB: 'Offline life', questionGr: 'Ενεργός στα social media ή προτιμάς offline ζωή;', optionAGr: 'Social media', optionBGr: 'Offline' },
  { id: 'technology_ai_skeptic_fan', category: 'technology', difficulty: 2, question: 'Excited about AI or Skeptical about it?', optionA: 'Excited', optionB: 'Skeptical', questionGr: 'Ενθουσιασμένος με το AI ή Επιφυλακτικός;', optionAGr: 'Ενθουσιασμένος', optionBGr: 'Επιφυλακτικός' },
  { id: 'technology_read_screen_paper', category: 'technology', difficulty: 2, question: 'Read on a screen or Read on paper?', optionA: 'Screen', optionB: 'Paper', questionGr: 'Διαβάζεις σε οθόνη ή σε χαρτί;', optionAGr: 'Οθόνη', optionBGr: 'Χαρτί' },
  { id: 'technology_smart_home_simple', category: 'technology', difficulty: 2, question: 'Smart home gadgets or Keep it simple?', optionA: 'Smart home', optionB: 'Keep simple', questionGr: 'Έξυπνο σπίτι ή Κρατάς το απλό;', optionAGr: 'Έξυπνο σπίτι', optionBGr: 'Απλό' },
  { id: 'technology_notifications_on_off', category: 'technology', difficulty: 2, question: 'Notifications on or Do Not Disturb?', optionA: 'Notifications on', optionB: 'Do Not Disturb', questionGr: 'Ειδοποιήσεις ενεργές ή Μην ενοχλείτε;', optionAGr: 'Ενεργές', optionBGr: 'Μην ενοχλείτε' },
  { id: 'technology_privacy_convenience', category: 'technology', difficulty: 3, question: 'Prioritize privacy or Convenience?', optionA: 'Privacy', optionB: 'Convenience', questionGr: 'Προτεραιότητα η ιδιωτικότητα ή η ευκολία;', optionAGr: 'Ιδιωτικότητα', optionBGr: 'Ευκολία' },
  { id: 'technology_tech_free_day_always_on', category: 'technology', difficulty: 3, question: 'Could do a tech-free day or Always connected?', optionA: 'Tech-free day', optionB: 'Always connected', questionGr: 'Μια μέρα χωρίς τεχνολογία ή Πάντα συνδεδεμένος;', optionAGr: 'Χωρίς τεχνολογία', optionBGr: 'Συνδεδεμένος' },
  { id: 'technology_future_tech_nostalgia', category: 'technology', difficulty: 3, question: 'Excited for the future or Nostalgic for the past?', optionA: 'Future', optionB: 'Nostalgic', questionGr: 'Ενθουσιασμός για το μέλλον ή Νοσταλγία για το παρελθόν;', optionAGr: 'Μέλλον', optionBGr: 'Παρελθόν' },
  { id: 'gaming_pc_console', category: 'gaming', difficulty: 1, question: 'PC or Console?', optionA: 'PC', optionB: 'Console', questionGr: 'PC ή Κονσόλα;', optionAGr: 'PC', optionBGr: 'Κονσόλα' },
  { id: 'gaming_mobile_pc_gaming', category: 'gaming', difficulty: 1, question: 'Mobile games or PC/Console games?', optionA: 'Mobile', optionB: 'PC/Console', questionGr: 'Παιχνίδια κινητού ή PC/Κονσόλα;', optionAGr: 'Κινητό', optionBGr: 'PC/Κονσόλα' },
  { id: 'gaming_single_multiplayer', category: 'gaming', difficulty: 1, question: 'Single player or Multiplayer?', optionA: 'Single player', optionB: 'Multiplayer', questionGr: 'Μονός παίκτης ή Πολλαπλοί παίκτες;', optionAGr: 'Μονός', optionBGr: 'Πολλαπλοί' },
  { id: 'gaming_story_action_game', category: 'gaming', difficulty: 1, question: 'Story-driven games or Action games?', optionA: 'Story-driven', optionB: 'Action', questionGr: 'Παιχνίδια με ιστορία ή Δράσης;', optionAGr: 'Με ιστορία', optionBGr: 'Δράσης' },
  { id: 'gaming_casual_hardcore', category: 'gaming', difficulty: 2, question: 'Casual gamer or Hardcore gamer?', optionA: 'Casual', optionB: 'Hardcore', questionGr: 'Casual gamer ή Hardcore gamer;', optionAGr: 'Casual', optionBGr: 'Hardcore' },
  { id: 'gaming_board_video_games', category: 'gaming', difficulty: 2, question: 'Board games or Video games?', optionA: 'Board games', optionB: 'Video games', questionGr: 'Επιτραπέζια ή Video games;', optionAGr: 'Επιτραπέζια', optionBGr: 'Video games' },
  { id: 'gaming_competitive_coop', category: 'gaming', difficulty: 2, question: 'Competitive games or Co-op games?', optionA: 'Competitive', optionB: 'Co-op', questionGr: 'Ανταγωνιστικά ή Συνεργατικά παιχνίδια;', optionAGr: 'Ανταγωνιστικά', optionBGr: 'Συνεργατικά' },
  { id: 'gaming_play_couple_apart', category: 'gaming', difficulty: 2, question: 'Play games together as a couple or Separately?', optionA: 'Together', optionB: 'Separately', questionGr: 'Παιχνίδια μαζί ως ζευγάρι ή ξεχωριστά;', optionAGr: 'Μαζί', optionBGr: 'Ξεχωριστά' },
  { id: 'gaming_mystery_choice_fan', category: 'gaming', difficulty: 2, question: 'Love mystery/trivia games or Prefer skill games?', optionA: 'Mystery/trivia', optionB: 'Skill games', questionGr: 'Λατρεύεις παιχνίδια μυστηρίου ή Παιχνίδια δεξιοτήτων;', optionAGr: 'Μυστηρίου', optionBGr: 'Δεξιοτήτων' },
  { id: 'gaming_winning_fun', category: 'gaming', difficulty: 2, question: 'Winning matters or Just having fun?', optionA: 'Winning matters', optionB: 'Just fun', questionGr: 'Η νίκη μετράει ή Απλά η διασκέδαση;', optionAGr: 'Νίκη', optionBGr: 'Διασκέδαση' },
  { id: 'gaming_retro_modern_games', category: 'gaming', difficulty: 3, question: 'Retro games or Modern games?', optionA: 'Retro', optionB: 'Modern', questionGr: 'Retro παιχνίδια ή Σύγχρονα;', optionAGr: 'Retro', optionBGr: 'Σύγχρονα' },
  { id: 'gaming_game_escape_connect', category: 'gaming', difficulty: 3, question: 'Games are an escape or Games help you connect?', optionA: 'Escape', optionB: 'Connect', questionGr: 'Τα παιχνίδια είναι διαφυγή ή σύνδεση;', optionAGr: 'Διαφυγή', optionBGr: 'Σύνδεση' },
  { id: 'gaming_finish_every_game_move_on', category: 'gaming', difficulty: 3, question: 'Always finish a game or Move on if bored?', optionA: 'Always finish', optionB: 'Move on', questionGr: 'Πάντα τελειώνεις ένα παιχνίδι ή προχωράς αν βαρεθείς;', optionAGr: 'Τελειώνεις', optionBGr: 'Προχωράς' },
  { id: 'personality_introvert_extrovert', category: 'personality', difficulty: 1, question: 'Introvert or Extrovert?', optionA: 'Introvert', optionB: 'Extrovert', questionGr: 'Εσωστρεφής ή Εξωστρεφής;', optionAGr: 'Εσωστρεφής', optionBGr: 'Εξωστρεφής' },
  { id: 'personality_optimist_realist', category: 'personality', difficulty: 1, question: 'Optimist or Realist?', optionA: 'Optimist', optionB: 'Realist', questionGr: 'Αισιόδοξος ή Ρεαλιστής;', optionAGr: 'Αισιόδοξος', optionBGr: 'Ρεαλιστής' },
  { id: 'personality_thinker_feeler', category: 'personality', difficulty: 1, question: 'Think first or Feel first?', optionA: 'Think first', optionB: 'Feel first', questionGr: 'Σκέφτεσαι πρώτα ή Νιώθεις πρώτα;', optionAGr: 'Σκέφτεσαι', optionBGr: 'Νιώθεις' },
  { id: 'personality_planner_improviser', category: 'personality', difficulty: 1, question: 'Planner or Improviser?', optionA: 'Planner', optionB: 'Improviser', questionGr: 'Σχεδιαστής ή Αυτοσχεδιαστής;', optionAGr: 'Σχεδιαστής', optionBGr: 'Αυτοσχεδιαστής' },
  { id: 'personality_leader_supporter', category: 'personality', difficulty: 1, question: 'Leader or Supporter?', optionA: 'Leader', optionB: 'Supporter', questionGr: 'Ηγέτης ή Υποστηρικτής;', optionAGr: 'Ηγέτης', optionBGr: 'Υποστηρικτής' },
  { id: 'personality_logical_creative', category: 'personality', difficulty: 2, question: 'Logical mind or Creative mind?', optionA: 'Logical', optionB: 'Creative', questionGr: 'Λογικό ή Δημιουργικό μυαλό;', optionAGr: 'Λογικό', optionBGr: 'Δημιουργικό' },
  { id: 'personality_patient_impulsive', category: 'personality', difficulty: 2, question: 'Patient or Impulsive?', optionA: 'Patient', optionB: 'Impulsive', questionGr: 'Υπομονετικός ή Παρορμητικός;', optionAGr: 'Υπομονετικός', optionBGr: 'Παρορμητικός' },
  { id: 'personality_private_open_book', category: 'personality', difficulty: 2, question: 'Private person or Open book?', optionA: 'Private', optionB: 'Open book', questionGr: 'Ιδιωτικός τύπος ή Ανοιχτό βιβλίο;', optionAGr: 'Ιδιωτικός', optionBGr: 'Ανοιχτό βιβλίο' },
  { id: 'personality_perfectionist_go_with_it', category: 'personality', difficulty: 2, question: 'Perfectionist or Good enough is fine?', optionA: 'Perfectionist', optionB: 'Good enough', questionGr: 'Τελειομανής ή Το αρκετά καλό φτάνει;', optionAGr: 'Τελειομανής', optionBGr: 'Αρκετά καλό' },
  { id: 'personality_cautious_bold', category: 'personality', difficulty: 2, question: 'Cautious or Bold?', optionA: 'Cautious', optionB: 'Bold', questionGr: 'Προσεκτικός ή Τολμηρός;', optionAGr: 'Προσεκτικός', optionBGr: 'Τολμηρός' },
  { id: 'personality_heart_head_decisions', category: 'personality', difficulty: 3, question: 'Decide with your heart or your head?', optionA: 'Heart', optionB: 'Head', questionGr: 'Αποφασίζεις με την καρδιά ή το μυαλό;', optionAGr: 'Καρδιά', optionBGr: 'Μυαλό' },
  { id: 'personality_change_yourself_accept', category: 'personality', difficulty: 3, question: 'Always improving yourself or Accepting who you are?', optionA: 'Improving', optionB: 'Accepting', questionGr: 'Πάντα βελτιώνεσαι ή Αποδέχεσαι τον εαυτό σου;', optionAGr: 'Βελτίωση', optionBGr: 'Αποδοχή' },
  { id: 'personality_mask_authentic', category: 'personality', difficulty: 3, question: 'Show your true self always or Adapt to situations?', optionA: 'True self always', optionB: 'Adapt', questionGr: 'Δείχνεις πάντα τον αληθινό εαυτό ή προσαρμόζεσαι;', optionAGr: 'Αληθινός εαυτός', optionBGr: 'Προσαρμογή' },
  { id: 'random_day_night', category: 'random', difficulty: 1, question: 'Day or Night?', optionA: 'Day', optionB: 'Night', questionGr: 'Μέρα ή Νύχτα;', optionAGr: 'Μέρα', optionBGr: 'Νύχτα' },
  { id: 'random_hot_cold', category: 'random', difficulty: 1, question: 'Hot weather or Cold weather?', optionA: 'Hot', optionB: 'Cold', questionGr: 'Ζέστη ή Κρύο;', optionAGr: 'Ζέστη', optionBGr: 'Κρύο' },
  { id: 'random_left_right', category: 'random', difficulty: 1, question: 'Left side or Right side of the bed?', optionA: 'Left side', optionB: 'Right side', questionGr: 'Αριστερή ή Δεξιά πλευρά κρεβατιού;', optionAGr: 'Αριστερή', optionBGr: 'Δεξιά' },
  { id: 'random_window_aisle', category: 'random', difficulty: 1, question: 'Window seat or Aisle seat?', optionA: 'Window', optionB: 'Aisle', questionGr: 'Θέση παράθυρο ή διάδρομος;', optionAGr: 'Παράθυρο', optionBGr: 'Διάδρομος' },
  { id: 'random_elevator_stairs', category: 'random', difficulty: 1, question: 'Elevator or Stairs?', optionA: 'Elevator', optionB: 'Stairs', questionGr: 'Ασανσέρ ή Σκάλες;', optionAGr: 'Ασανσέρ', optionBGr: 'Σκάλες' },
  { id: 'random_silence_noise', category: 'random', difficulty: 2, question: 'Complete silence or Background noise?', optionA: 'Silence', optionB: 'Background noise', questionGr: 'Απόλυτη σιωπή ή Ήχος φόντου;', optionAGr: 'Σιωπή', optionBGr: 'Ήχος φόντου' },
  { id: 'random_full_moon_starry', category: 'random', difficulty: 2, question: 'Full moon night or Starry sky?', optionA: 'Full moon', optionB: 'Starry sky', questionGr: 'Πανσέληνος ή Έναστρος ουρανός;', optionAGr: 'Πανσέληνος', optionBGr: 'Έναστρος ουρανός' },
  { id: 'random_text_emoji_words', category: 'random', difficulty: 2, question: 'Emojis or Words?', optionA: 'Emojis', optionB: 'Words', questionGr: 'Emojis ή Λέξεις;', optionAGr: 'Emojis', optionBGr: 'Λέξεις' },
  { id: 'random_superpower_fly_invisible', category: 'random', difficulty: 2, question: 'Superpower: Fly or Be invisible?', optionA: 'Fly', optionB: 'Invisible', questionGr: 'Υπερδύναμη: Πέταγμα ή Αοράτους;', optionAGr: 'Πέταγμα', optionBGr: 'Αόρατος' },
  { id: 'random_time_travel_past_future', category: 'random', difficulty: 2, question: 'Time travel to the past or the future?', optionA: 'Past', optionB: 'Future', questionGr: 'Ταξίδι στο παρελθόν ή το μέλλον;', optionAGr: 'Παρελθόν', optionBGr: 'Μέλλον' },
  { id: 'random_read_mind_predict_future', category: 'random', difficulty: 3, question: 'Read minds or Predict the future?', optionA: 'Read minds', optionB: 'Predict future', questionGr: 'Διαβάζεις σκέψεις ή Προβλέπεις το μέλλον;', optionAGr: 'Διαβάζεις σκέψεις', optionBGr: 'Προβλέπεις' },
  { id: 'random_one_wish_many_small', category: 'random', difficulty: 3, question: 'One big wish or Many small wishes?', optionA: 'One big wish', optionB: 'Many small', questionGr: 'Μία μεγάλη ευχή ή Πολλές μικρές;', optionAGr: 'Μία μεγάλη', optionBGr: 'Πολλές μικρές' },
  { id: 'random_forget_bad_remember_all', category: 'random', difficulty: 3, question: 'Forget bad memories or Remember everything?', optionA: 'Forget bad', optionB: 'Remember all', questionGr: 'Ξεχνάς τα κακά ή Θυμάσαι τα πάντα;', optionAGr: 'Ξεχνάς', optionBGr: 'Θυμάσαι' },
  { id: 'fun_karaoke_dance', category: 'fun', difficulty: 1, question: 'Karaoke or Dancing?', optionA: 'Karaoke', optionB: 'Dancing', questionGr: 'Καραόκε ή Χορός;', optionAGr: 'Καραόκε', optionBGr: 'Χορός' },
  { id: 'fun_board_arcade', category: 'fun', difficulty: 1, question: 'Board game night or Arcade?', optionA: 'Board games', optionB: 'Arcade', questionGr: 'Επιτραπέζια ή Arcade;', optionAGr: 'Επιτραπέζια', optionBGr: 'Arcade' },
  { id: 'fun_prank_serious', category: 'fun', difficulty: 1, question: 'Prank someone or Play it serious?', optionA: 'Prank', optionB: 'Serious', questionGr: 'Φάρσα ή Σοβαρότητα;', optionAGr: 'Φάρσα', optionBGr: 'Σοβαρότητα' },
  { id: 'fun_costume_party_chill', category: 'fun', difficulty: 1, question: 'Costume party or Chill hangout?', optionA: 'Costume party', optionB: 'Chill hangout', questionGr: 'Πάρτι με στολές ή Χαλαρή βραδιά;', optionAGr: 'Πάρτι στολών', optionBGr: 'Χαλαρή βραδιά' },
  { id: 'fun_roller_coaster_carousel', category: 'fun', difficulty: 1, question: 'Roller coaster or Carousel?', optionA: 'Roller coaster', optionB: 'Carousel', questionGr: 'Τρενάκι λούνα παρκ ή Καρουζέλ;', optionAGr: 'Τρενάκι', optionBGr: 'Καρουζέλ' },
  { id: 'fun_trivia_charades', category: 'fun', difficulty: 2, question: 'Trivia night or Charades?', optionA: 'Trivia', optionB: 'Charades', questionGr: 'Trivia βραδιά ή Παντομίμα;', optionAGr: 'Trivia', optionBGr: 'Παντομίμα' },
  { id: 'fun_photobooth_candid', category: 'fun', difficulty: 2, question: 'Photobooth pics or Candid photos?', optionA: 'Photobooth', optionB: 'Candid', questionGr: 'Photobooth ή Αυθόρμητες φωτογραφίες;', optionAGr: 'Photobooth', optionBGr: 'Αυθόρμητες' },
  { id: 'fun_laugh_loud_giggle', category: 'fun', difficulty: 2, question: 'Laugh out loud or Quiet giggle?', optionA: 'Laugh loud', optionB: 'Quiet giggle', questionGr: 'Δυνατό γέλιο ή Σιγανό χαχανητό;', optionAGr: 'Δυνατό γέλιο', optionBGr: 'Σιγανό' },
  { id: 'fun_theme_park_museum', category: 'fun', difficulty: 2, question: 'Theme park or Museum?', optionA: 'Theme park', optionB: 'Museum', questionGr: 'Λούνα παρκ ή Μουσείο;', optionAGr: 'Λούνα παρκ', optionBGr: 'Μουσείο' },
  { id: 'fun_water_fight_snowball', category: 'fun', difficulty: 2, question: 'Water fight or Snowball fight?', optionA: 'Water fight', optionB: 'Snowball fight', questionGr: 'Μάχη με νερό ή Μάχη με χιονόμπαλες;', optionAGr: 'Νερό', optionBGr: 'Χιονόμπαλες' },
  { id: 'fun_silly_dignified', category: 'fun', difficulty: 3, question: 'Be silly in public or Stay dignified?', optionA: 'Be silly', optionB: 'Stay dignified', questionGr: 'Είσαι αστείος δημόσια ή κρατάς αξιοπρέπεια;', optionAGr: 'Αστείος', optionBGr: 'Αξιοπρέπεια' },
  { id: 'fun_plan_surprise_party', category: 'fun', difficulty: 3, question: 'Plan a surprise party or Prefer no surprises?', optionA: 'Plan surprise', optionB: 'No surprises', questionGr: 'Σχεδιάζεις πάρτι έκπληξη ή Προτιμάς χωρίς εκπλήξεις;', optionAGr: 'Έκπληξη', optionBGr: 'Χωρίς εκπλήξεις' },
  { id: 'fun_fun_now_later', category: 'fun', difficulty: 3, question: 'Fun right now or Save it for later?', optionA: 'Fun now', optionB: 'Save for later', questionGr: 'Διασκέδαση τώρα ή Την αφήνεις για αργότερα;', optionAGr: 'Τώρα', optionBGr: 'Αργότερα' },
  { id: 'holidays_christmas_summer_holiday', category: 'holidays', difficulty: 1, question: 'Christmas holidays or Summer holidays?', optionA: 'Christmas', optionB: 'Summer', questionGr: 'Χριστουγεννιάτικες ή Καλοκαιρινές διακοπές;', optionAGr: 'Χριστούγεννα', optionBGr: 'Καλοκαίρι' },
  { id: 'holidays_beach_vacation_city_vacation', category: 'holidays', difficulty: 1, question: 'Beach vacation or City vacation?', optionA: 'Beach vacation', optionB: 'City vacation', questionGr: 'Διακοπές παραλία ή πόλη;', optionAGr: 'Παραλία', optionBGr: 'Πόλη' },
  { id: 'holidays_fireworks_quiet_night', category: 'holidays', difficulty: 1, question: 'Fireworks celebration or Quiet night?', optionA: 'Fireworks', optionB: 'Quiet night', questionGr: 'Πυροτεχνήματα ή Ήσυχη βραδιά;', optionAGr: 'Πυροτεχνήματα', optionBGr: 'Ήσυχη βραδιά' },
  { id: 'holidays_gifts_experiences', category: 'holidays', difficulty: 1, question: 'Gifts or Experiences for holidays?', optionA: 'Gifts', optionB: 'Experiences', questionGr: 'Δώρα ή Εμπειρίες για γιορτές;', optionAGr: 'Δώρα', optionBGr: 'Εμπειρίες' },
  { id: 'holidays_family_gathering_getaway', category: 'holidays', difficulty: 1, question: 'Family gathering or Getaway trip?', optionA: 'Family gathering', optionB: 'Getaway trip', questionGr: 'Οικογενειακή συγκέντρωση ή Ταξίδι απόδρασης;', optionAGr: 'Οικογένεια', optionBGr: 'Απόδραση' },
  { id: 'holidays_decorate_early_last_minute', category: 'holidays', difficulty: 2, question: 'Decorate early or Last minute?', optionA: 'Decorate early', optionB: 'Last minute', questionGr: 'Στολίζεις νωρίς ή Την τελευταία στιγμή;', optionAGr: 'Νωρίς', optionBGr: 'Τελευταία στιγμή' },
  { id: 'holidays_host_guest', category: 'holidays', difficulty: 2, question: 'Host the holiday or Be a guest?', optionA: 'Host', optionB: 'Guest', questionGr: 'Φιλοξενείς ή Είσαι καλεσμένος;', optionAGr: 'Φιλοξενείς', optionBGr: 'Καλεσμένος' },
  { id: 'holidays_new_year_resolutions', category: 'holidays', difficulty: 2, question: 'Make resolutions or Skip them?', optionA: 'Make resolutions', optionB: 'Skip them', questionGr: 'Κάνεις νέες αποφάσεις ή Τις προσπερνάς;', optionAGr: 'Αποφάσεις', optionBGr: 'Τις προσπερνάς' },
  { id: 'holidays_holiday_movie_marathon', category: 'holidays', difficulty: 2, question: 'Holiday movie marathon or Outdoor activities?', optionA: 'Movie marathon', optionB: 'Outdoor activities', questionGr: 'Μαραθώνιος ταινιών ή Υπαίθριες δραστηριότητες;', optionAGr: 'Ταινίες', optionBGr: 'Υπαίθριες' },
  { id: 'holidays_small_celebration_big_party', category: 'holidays', difficulty: 2, question: 'Small celebration or Big party?', optionA: 'Small celebration', optionB: 'Big party', questionGr: 'Μικρή γιορτή ή Μεγάλο πάρτι;', optionAGr: 'Μικρή', optionBGr: 'Μεγάλο' },
  { id: 'holidays_tradition_new_experience', category: 'holidays', difficulty: 3, question: 'Keep old traditions or Try something new?', optionA: 'Old traditions', optionB: 'Something new', questionGr: 'Κρατάς παλιές παραδόσεις ή Δοκιμάζεις κάτι νέο;', optionAGr: 'Παραδόσεις', optionBGr: 'Κάτι νέο' },
  { id: 'holidays_holidays_with_family_partner', category: 'holidays', difficulty: 3, question: 'Holidays with family or Just with your partner?', optionA: 'With family', optionB: 'Just partner', questionGr: 'Γιορτές με οικογένεια ή Μόνο με τον/την σύντροφο;', optionAGr: 'Οικογένεια', optionBGr: 'Σύντροφος' },
  { id: 'holidays_holiday_meaning_ritual', category: 'holidays', difficulty: 3, question: 'Holidays are about meaning or About the ritual?', optionA: 'Meaning', optionB: 'Ritual', questionGr: 'Οι γιορτές έχουν νόημα ή είναι τελετουργικό;', optionAGr: 'Νόημα', optionBGr: 'Τελετουργικό' },
  { id: 'work_office_remote', category: 'work', difficulty: 1, question: 'Office or Remote work?', optionA: 'Office', optionB: 'Remote', questionGr: 'Γραφείο ή Απομακρυσμένη εργασία;', optionAGr: 'Γραφείο', optionBGr: 'Απομακρυσμένη' },
  { id: 'work_morning_work_night_work', category: 'work', difficulty: 1, question: 'Work in the morning or at night?', optionA: 'Morning', optionB: 'Night', questionGr: 'Δουλεύεις πρωί ή βράδυ;', optionAGr: 'Πρωί', optionBGr: 'Βράδυ' },
  { id: 'work_team_solo_work', category: 'work', difficulty: 1, question: 'Teamwork or Solo work?', optionA: 'Teamwork', optionB: 'Solo work', questionGr: 'Ομαδική ή Ατομική εργασία;', optionAGr: 'Ομαδική', optionBGr: 'Ατομική' },
  { id: 'work_stable_job_risky_startup', category: 'work', difficulty: 1, question: 'Stable job or Risky startup?', optionA: 'Stable job', optionB: 'Startup', questionGr: 'Σταθερή δουλειά ή Ριψοκίνδυνο startup;', optionAGr: 'Σταθερή', optionBGr: 'Startup' },
  { id: 'work_desk_job_active_job', category: 'work', difficulty: 1, question: 'Desk job or Active job?', optionA: 'Desk job', optionB: 'Active job', questionGr: 'Δουλειά γραφείου ή Δραστήρια δουλειά;', optionAGr: 'Γραφείο', optionBGr: 'Δραστήρια' },
  { id: 'work_passion_paycheck', category: 'work', difficulty: 2, question: 'Work for passion or Work for paycheck?', optionA: 'Passion', optionB: 'Paycheck', questionGr: 'Δουλεύεις για πάθος ή για μισθό;', optionAGr: 'Πάθος', optionBGr: 'Μισθός' },
  { id: 'work_meetings_deep_work', category: 'work', difficulty: 2, question: 'Meetings or Deep focused work?', optionA: 'Meetings', optionB: 'Deep work', questionGr: 'Συναντήσεις ή Βαθιά συγκεντρωμένη δουλειά;', optionAGr: 'Συναντήσεις', optionBGr: 'Βαθιά δουλειά' },
  { id: 'work_boss_own_business', category: 'work', difficulty: 2, question: 'Work for a boss or Run your own business?', optionA: 'Work for boss', optionB: 'Own business', questionGr: 'Δουλεύεις για αφεντικό ή Έχεις δική σου επιχείρηση;', optionAGr: 'Αφεντικό', optionBGr: 'Δική σου επιχείρηση' },
  { id: 'work_early_deadline_last_minute', category: 'work', difficulty: 2, question: 'Finish early or Work at the deadline?', optionA: 'Finish early', optionB: 'At the deadline', questionGr: 'Τελειώνεις νωρίς ή Στο deadline;', optionAGr: 'Νωρίς', optionBGr: 'Deadline' },
  { id: 'work_multitask_one_thing', category: 'work', difficulty: 2, question: 'Multitask or Focus on one thing?', optionA: 'Multitask', optionB: 'One thing', questionGr: 'Πολλαπλές εργασίες ή Μία τη φορά;', optionAGr: 'Πολλαπλές', optionBGr: 'Μία τη φορά' },
  { id: 'work_work_life_balance_hustle', category: 'work', difficulty: 3, question: 'Work-life balance or Hustle culture?', optionA: 'Balance', optionB: 'Hustle', questionGr: 'Ισορροπία ζωής-δουλειάς ή Hustle κουλτούρα;', optionAGr: 'Ισορροπία', optionBGr: 'Hustle' },
  { id: 'work_job_identity_just_a_job', category: 'work', difficulty: 3, question: 'Job defines your identity or Just a job?', optionA: 'Defines identity', optionB: 'Just a job', questionGr: 'Η δουλειά σε ορίζει ή Είναι απλά δουλειά;', optionAGr: 'Σε ορίζει', optionBGr: 'Απλά δουλειά' },
  { id: 'work_retire_early_work_forever', category: 'work', difficulty: 3, question: 'Retire early or Keep working forever?', optionA: 'Retire early', optionB: 'Work forever', questionGr: 'Πρόωρη σύνταξη ή Δουλεύεις για πάντα;', optionAGr: 'Πρόωρη σύνταξη', optionBGr: 'Για πάντα' },
  { id: 'nature_forest_desert', category: 'nature', difficulty: 1, question: 'Forest or Desert?', optionA: 'Forest', optionB: 'Desert', questionGr: 'Δάσος ή Έρημος;', optionAGr: 'Δάσος', optionBGr: 'Έρημος' },
  { id: 'nature_sunrise_sunset', category: 'nature', difficulty: 1, question: 'Sunrise or Sunset?', optionA: 'Sunrise', optionB: 'Sunset', questionGr: 'Ανατολή ή Δύση ηλίου;', optionAGr: 'Ανατολή', optionBGr: 'Δύση' },
  { id: 'nature_rain_sunshine', category: 'nature', difficulty: 1, question: 'Rain or Sunshine?', optionA: 'Rain', optionB: 'Sunshine', questionGr: 'Βροχή ή Λιακάδα;', optionAGr: 'Βροχή', optionBGr: 'Λιακάδα' },
  { id: 'nature_ocean_lake', category: 'nature', difficulty: 1, question: 'Ocean or Lake?', optionA: 'Ocean', optionB: 'Lake', questionGr: 'Ωκεανός ή Λίμνη;', optionAGr: 'Ωκεανός', optionBGr: 'Λίμνη' },
  { id: 'nature_garden_wild_nature', category: 'nature', difficulty: 1, question: 'Tidy garden or Wild nature?', optionA: 'Garden', optionB: 'Wild nature', questionGr: 'Τακτοποιημένος κήπος ή Άγρια φύση;', optionAGr: 'Κήπος', optionBGr: 'Άγρια φύση' },
  { id: 'nature_hiking_picnic', category: 'nature', difficulty: 2, question: 'Hiking or Picnic?', optionA: 'Hiking', optionB: 'Picnic', questionGr: 'Πεζοπορία ή Πικνίκ;', optionAGr: 'Πεζοπορία', optionBGr: 'Πικνίκ' },
  { id: 'nature_stars_clouds', category: 'nature', difficulty: 2, question: 'Stargazing or Cloud watching?', optionA: 'Stargazing', optionB: 'Cloud watching', questionGr: 'Παρατήρηση αστεριών ή Σύννεφων;', optionAGr: 'Αστέρια', optionBGr: 'Σύννεφα' },
  { id: 'nature_camping_cabin', category: 'nature', difficulty: 2, question: 'Camping in a tent or Staying in a cabin?', optionA: 'Tent', optionB: 'Cabin', questionGr: 'Σκηνή ή Καλύβα;', optionAGr: 'Σκηνή', optionBGr: 'Καλύβα' },
  { id: 'nature_wildlife_botanical', category: 'nature', difficulty: 2, question: 'Wildlife safari or Botanical garden?', optionA: 'Wildlife safari', optionB: 'Botanical garden', questionGr: 'Σαφάρι άγριας ζωής ή Βοτανικός κήπος;', optionAGr: 'Σαφάρι', optionBGr: 'Βοτανικός κήπος' },
  { id: 'nature_mountains_valley', category: 'nature', difficulty: 2, question: 'Mountain peak or Quiet valley?', optionA: 'Mountain peak', optionB: 'Quiet valley', questionGr: 'Κορυφή βουνού ή Ήσυχη κοιλάδα;', optionAGr: 'Κορυφή', optionBGr: 'Κοιλάδα' },
  { id: 'nature_nature_escape_city_comfort', category: 'nature', difficulty: 3, question: 'Escape to nature or Stay in city comfort?', optionA: 'Nature escape', optionB: 'City comfort', questionGr: 'Απόδραση στη φύση ή Άνεση της πόλης;', optionAGr: 'Φύση', optionBGr: 'Πόλη' },
  { id: 'nature_protect_nature_enjoy_it', category: 'nature', difficulty: 3, question: 'Actively protect nature or Simply enjoy it?', optionA: 'Protect it', optionB: 'Enjoy it', questionGr: 'Προστατεύεις ενεργά τη φύση ή Απλά την απολαμβάνεις;', optionAGr: 'Προστατεύεις', optionBGr: 'Απολαμβάνεις' },
  { id: 'nature_silence_of_nature_sounds', category: 'nature', difficulty: 3, question: 'Silence in nature or Sounds of nature?', optionA: 'Silence', optionB: 'Sounds of nature', questionGr: 'Σιωπή στη φύση ή Ήχοι της φύσης;', optionAGr: 'Σιωπή', optionBGr: 'Ήχοι φύσης' },
]


// ── Question Engine ──────────────────────────────────────────────
// Scales to any number of questions in MYSTERY_QUESTIONS without any
// changes needed here or in the game screen.

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
 *     Rounds 1-3  → Easy   (difficulty 1)
 *     Rounds 4-7  → Medium (difficulty 2)
 *     Rounds 8-10 → Deep   (difficulty 3)
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
