/**
 * Ren's Shop: affiliate picks per city + ORIRI Originals (coming soon).
 *
 * Dubai links go to Amazon.ae, KL links go to Shopee. A product can have one or
 * both; the page only shows it in the cities it has a link for.
 * Clicks are counted by first-party analytics as `shop:<city>:<id>`.
 */

export type CityKey = 'dubai' | 'kl';
export type ShelfKey = 'daily' | 'wear' | 'kitchen' | 'move' | 'care';

export const CITIES: Record<CityKey, { label: string; store: string; currency: string; hint: string }> = {
  dubai: { label: 'Dubai', store: 'Amazon.ae', currency: 'AED', hint: 'Ships across the UAE · As an Amazon Associate I earn from qualifying purchases' },
  kl: { label: 'Kuala Lumpur', store: 'Shopee', currency: 'RM', hint: 'Ships across Malaysia with Shopee · affiliate links' },
};

export const SHELVES: { key: ShelfKey; title: string; sub: string; cover: string }[] = [
  { key: 'daily', title: 'My daily non-negotiables', sub: 'In my bag and on my desk, every single day', cover: '/shop/shelf-daily.jpg' },
  { key: 'wear', title: 'What I move in', sub: 'Pilates, padel and the school run, same leggings', cover: '/shop/shelf-wear.jpg' },
  { key: 'kitchen', title: 'The healthy kitchen', sub: 'Make the good meal the easy meal', cover: '/shop/shelf-kitchen.jpg' },
  { key: 'move', title: 'Move & recover', sub: 'Pilates at home, padel, and the rest days', cover: '/shop/shelf-move.jpg' },
  { key: 'care', title: 'Self-care rituals', sub: 'Slow mornings and proper rest nights', cover: '/shop/kl/cosrx-good-morning-cleanser.jpg' },
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
  /** Product photo URL (store image or /shop/...). Empty = name tile until a photo is added. */
  image: string;
  tag?: "Ren's fave" | 'New' | 'Bestseller';
  links: Partial<Record<CityKey, CityLink>>;
}

/** This week's obsession per city: id of one pick (or null to hide the feature). */
export const FEATURED_ID: Record<CityKey, string | null> = { dubai: 'crz-butterlift-leggings', kl: 'cosrx-good-morning-cleanser' };

/** Ren's picks. Filled from the links Ren sends. */
export const PICKS: ShopPick[] = [
  { id: 'crz-butterlift-leggings', name: "CRZ Yoga Butterlift leggings", why: 'The pair I reach for first. Sculpting, squat-proof and soft all day.', shelf: 'wear', image: 'https://m.media-amazon.com/images/I/61QM3rIONQL._AC_SL600_.jpg', tag: "Ren's fave", links: { dubai: { url: 'https://www.amazon.ae/dp/B0FH4GSPVB?tag=oriri-21' } } },
  { id: 'crz-butterluxe-bra', name: "CRZ Yoga Butterluxe longline bra", why: 'Supportive enough for padel, comfy enough to wear as a top.', shelf: 'wear', image: 'https://m.media-amazon.com/images/I/71jifKXjwyL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B0DGL2WVLV?tag=oriri-21' } } },
  { id: 'crz-strappy-bra', name: "CRZ Yoga strappy sports bra", why: 'The pretty back makes reformer class feel a little extra.', shelf: 'wear', image: 'https://m.media-amazon.com/images/I/819SWT9niSL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B0BWDGTYZ9?tag=oriri-21' } } },
  { id: 'crz-crop-tank', name: "CRZ Yoga Pima cotton crop tank", why: 'Breathable cotton for hot Dubai workouts.', shelf: 'wear', image: 'https://m.media-amazon.com/images/I/71phVEHphvL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B0869DXL98?tag=oriri-21' } } },
  { id: 'crz-wide-leg-pants', name: "CRZ Yoga wide-leg lounge pants", why: 'Studio to coffee without changing.', shelf: 'wear', image: 'https://m.media-amazon.com/images/I/61JqSD575vL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B0GH73328X?tag=oriri-21' } } },
  { id: 'nike-court-vision-lo', name: "Nike Court Vision Lo", why: 'The clean white sneaker that goes with everything.', shelf: 'daily', image: 'https://m.media-amazon.com/images/I/61DaOVbc5vL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B09NRY5JF9?tag=oriri-21' } } },
  { id: 'new-balance-530', name: "New Balance 530", why: 'The comfy chunky sneaker for walks, errands and school runs.', shelf: 'daily', image: 'https://m.media-amazon.com/images/I/61amgun7XML._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B088WY3FNY?tag=oriri-21' } } },
  { id: 'fitflop-flip-flops', name: "FitFlop ergonomic flip-flops", why: 'Pool, beach, post-class. My feet thank me.', shelf: 'daily', image: 'https://m.media-amazon.com/images/I/61Cg-3s5ECL._AC_SL600_.jpg', links: { dubai: { url: 'https://www.amazon.ae/dp/B01M0AJONL?tag=oriri-21' } } },
  // Kuala Lumpur (Shopee affiliate links)
  { id: 'cosrx-good-morning-cleanser', name: 'COSRX Low pH Good Morning Cleanser', why: 'The gentle first step of a slow morning. Clean, never tight.', shelf: 'care', image: '/shop/kl/cosrx-good-morning-cleanser.jpg', tag: "Ren's fave", links: { kl: { url: 'https://s.shopee.com.my/50aahQxt7M' } } },
  { id: 'the-raw-aqua-cera-sunscreen', name: 'The Raw. Aqua Cera tinted sunscreen', why: 'Daily SPF for the KL sun, light enough to wear to Pilates.', shelf: 'care', image: '', links: { kl: { url: 'https://s.shopee.com.my/2BGPKCe8uI' } } },
  { id: 'numbuzin-no5-serum', name: 'numbuzin No.5+ vitamin serum', why: 'My one glow serum. Keeps the routine short.', shelf: 'care', image: '/shop/kl/numbuzin-no5-serum.jpg', links: { kl: { url: 'https://s.shopee.com.my/5fqHUYKAzK' } } },
  { id: 'koolfever-eye-mask', name: 'Koolfever cooling eye mask', why: 'Ten cool minutes after a late night or a flight.', shelf: 'care', image: '/shop/kl/koolfever-eye-mask.jpg', links: { kl: { url: 'https://s.shopee.com.my/8fTt47y46r' } } },
  { id: 'wm-collagen-sleeping-mask', name: 'WM collagen sleeping mask', why: 'Pop it on, go to sleep, wake up rested-looking.', shelf: 'care', image: '', links: { kl: { url: 'https://s.shopee.com.my/6L5yHp8B2B' } } },
  { id: 'biocho-rosemary-hair-oil', name: 'BIOCHO olive & rosemary hair oil', why: 'A calm Sunday hair-oiling ritual.', shelf: 'care', image: '', links: { kl: { url: 'https://s.shopee.com.my/2LZpWRsFpk' } } },
];
