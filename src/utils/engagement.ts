// When an engagement count is worth showing.
//
// A brand-new catalogue would otherwise read "3 views", "0 likes", "1 vote" everywhere. Below
// these thresholds the number is hidden rather than shown small: views give way to a "New"
// badge, likes and shares show just their icon, and the rating invites a vote instead of
// averaging a handful of them. The counts themselves are always the real ones.

export const MIN_SHOWN_VIEWS = 50
export const MIN_SHOWN_LIKES = 50
export const MIN_SHOWN_SHARES = 50
export const MIN_SHOWN_RATING_VOTES = 10

export const showViewCount = (count: number) => count >= MIN_SHOWN_VIEWS
export const showLikeCount = (count: number) => count >= MIN_SHOWN_LIKES
export const showShareCount = (count: number) => count >= MIN_SHOWN_SHARES
export const showRatingAverage = (votes: number) => votes >= MIN_SHOWN_RATING_VOTES
