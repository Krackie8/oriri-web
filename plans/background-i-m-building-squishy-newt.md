# Home highlights: give Tea for Two and Nourish equal billing

## Context
At the top of Home, the Tea for Two card is a large plum gradient card. Nourish ("New in") sits under it as a small white card, so visitors mostly notice the podcast. The user wants both highlights to be visually prominent.

File: `src/app/components/HomeScreen.tsx`, the block just after the ORIRI header (about lines 448–495). Nothing else changes.

## Design
Two **equal-weight feature cards placed side by side** (`grid grid-cols-2 gap-3`), with the same height (`min-h-[230px]`) and the same structure:
- a label row;
- a large Cormorant title, about 24px;
- one short line of copy;
- a round action button pinned to the bottom.

**Card 1: Tea for Two** (keeps its plum gradient `#A9646F → #874652` and ring decoration)
- Label "New episode". Title "Tea for Two". Below the title, the latest episode name, cut off after 2 lines.
- Bottom row: a white play button (plays `latestFive[0]` via the existing `handleEpisodeClick`) and an "All episodes" text link to `/episodes`.

**Card 2: Nourish** (new espresso-brown gradient `#8B5E3C → #2B1D16`, matching the tool, with gold `#E9D3B4` rings)
- A small gold "NEW · FREE" pill as the label. Title "Nourish". Copy "Your Day 1 meal plan, groceries and recipes in seconds."
- Bottom row: a gold round arrow button with the text "Try it free". The whole card navigates to `/nourish`.
- A soft pulsing gold dot next to "NEW" draws the eye (`animate-pulse`).

Both cards use matching shadows, so neither looks secondary. Below 340px wide, the cards stack (`grid-cols-1 min-[340px]:grid-cols-2`).

The `Leaf` import stays, since it's still used further down the page.

## Verification
- At 375px, the two cards sit side by side at equal height with readable text, and taps work: play starts the latest episode, "All episodes" goes to `/episodes`, and the Nourish card goes to `/nourish`.
- On desktop, the layout keeps the same proportions.
