/**
 * Ren's Shop: affiliate picks per city + ORIRI Originals (coming soon).
 *
 * Dubai links go to Amazon.ae, KL links go to Shopee. A product can have one or
 * both; the page only shows it in the cities it has a link for.
 * Clicks are counted by first-party analytics as `shop:<city>:<id>`.
 */

export type CityKey = 'dubai' | 'kl';
export type ShelfKey = 'daily' | 'kitchen' | 'move';

export const CITIES: Record<CityKey, { label: string; store: string; currency: string; hint: string }> = {
  dubai: { label: 'Dubai', store: 'Amazon.ae', currency: 'AED', hint: 'Ships across the UAE with Amazon.ae · affiliate links' },
  kl: { label: 'Kuala Lumpur', store: 'Shopee', currency: 'RM', hint: 'Ships across Malaysia with Shopee · affiliate links' },
};

export const SHELVES: { key: ShelfKey; title: string; sub: string; cover: string }[] = [
  { key: 'daily', title: 'My daily non-negotiables', sub: 'In my bag and on my desk, every single day', cover: '/shop/shelf-daily.jpg' },
  { key: 'kitchen', title: 'The healthy kitchen', sub: 'Make the good meal the easy meal', cover: '/shop/shelf-kitchen.jpg' },
  { key: 'move', title: 'Move & recover', sub: 'Pilates at home, padel, and the rest days', cover: '/shop/shelf-move.jpg' },
];

export interface CityLink {
  url: string;
  /** Shown as "AED 129" / "RM 139". Optional: prices change, so leave out if unsure. */
  price?: number;
}

export interface ShopPick {
  id: string;
  name: string;
  /** Ren's one-line reason, shown in italic. */
  why: string;
  shelf: ShelfKey;
  /** Product photo URL (store image or /shop/...). */
  image: string;
  tag?: "Ren's fave" | 'New' | 'Bestseller';
  links: Partial<Record<CityKey, CityLink>>;
}

/** This week's obsession: id of one pick (or null to hide the feature). */
export const FEATURED_ID: string | null = null;

/** Ren's picks. Filled from the links Ren sends. */
export const PICKS: ShopPick[] = [];
