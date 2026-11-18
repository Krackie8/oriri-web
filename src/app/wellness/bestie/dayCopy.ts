/**
 * The Day plan's words for who is looking. A Member (signed in and joined) is never told she is on
 * a free trial or that she needs membership; a visitor on her free day still is.
 */
export function dayCopy(isMember: boolean) {
  return isMember
    ? {
        badge: 'Member',
        lockedTitle: (day: string) => `${day} is coming`,
        lockedBody: 'Bestie plans today for now. Planning your whole week is on its way.',
        showWaitlist: false,
        tracker: 'Bestie learns from what you swap and skip to plan better.',
        learnsIntro: 'This is day 1. Bestie learns from what you swap and skip.',
      }
    : {
        badge: 'Free trial · today only',
        lockedTitle: (day: string) => `${day} is for members`,
        lockedBody: 'Your free trial plans today. Members get every day planned, and Bestie learns what works for you.',
        showWaitlist: true,
        tracker: 'Saved on this device. With membership, Bestie learns from it to plan better.',
        learnsIntro: 'This is day 1. As a member, every tick teaches Bestie what works for you.',
      }
}
