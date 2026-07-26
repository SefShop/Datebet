// A left-game system notice is now a real row in the messages table
// (inserted by GameChatOverlay when a player deliberately exits the
// active game flow), so it flows through the existing message
// send/load/realtime/unread pipeline entirely unchanged — no separate
// channel or pub/sub is needed. This marker is the only thing that
// distinguishes it from a normal user message: prefixed onto the stored
// text with a null control character, which is not something a real
// user can type through the chat input, so it can never collide with
// genuine message content. ChatPanel checks for this prefix at render
// time to display the notice differently and strips it from what's shown.
export const LEFT_GAME_MARKER = '\u0000LEFT_GAME\u0000'
