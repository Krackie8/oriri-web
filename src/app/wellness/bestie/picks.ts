/**
 * Homepage pillar cards and their 2 preview picks.
 * Edit text, photos (Unsplash ID, full URL or imported file) and links here.
 */
import teaForTwo from '../../../assets/tea-for-two.jpg';
import { links } from './config';

export type PillarKey = 'move' | 'meal' | 'mindset' | 'meetup';

export interface Pick {
  title: string;
  meta: string;
  image: string;
  /** Optional link: '/path' on this site or a full URL. */
  url?: string;
  /** Members-only preview (shows a small lock). */
  members?: boolean;
}

export interface Pillar {
  key: PillarKey;
  name: string;
  covers: string;
  image: string;
  picks: [Pick, Pick];
}

export const PILLARS: Pillar[] = [
  {
    key: 'move',
    name: 'Move',
    covers: 'Studios & recovery',
    image: '1717500252297-b09508db7ceb',
    picks: [
      { title: 'Reformer Pilates', meta: 'Studio · a favourite of Ren', image: '1747239069226-55382c570116', url: links.maps('reformer pilates studio') },
      { title: 'Sauna & cold plunge', meta: 'Recovery', image: '1717356495389-6ab1e5ff9d84', url: links.maps('sauna cold plunge recovery') },
    ],
  },
  {
    key: 'meal',
    name: 'Meal',
    covers: 'Cafés, restaurants, recipes',
    image: '1512621776951-a57141f2eefd',
    picks: [
      { title: 'Slow brunch café', meta: 'Café', image: '1542372147193-a7aca54189cd', url: links.maps('healthy brunch cafe') },
      { title: 'Glow bowl', meta: 'Recipe · at home', image: '1546069901-ba9599a7e63c', url: links.recipe('salmon avocado bowl') },
    ],
  },
  {
    key: 'mindset',
    name: 'Mindset',
    covers: 'Podcasts by category, books, articles',
    image: '1742867114414-4594a9cf240c',
    picks: [
      { title: 'Tea for Two', meta: 'Podcast · Renee & Amanda', image: teaForTwo, url: '/podcast' },
      { title: 'Atomic Habits, chapter one', meta: 'Book', image: '1707142979946-a745d1d0092c', url: links.book('Atomic Habits James Clear') },
    ],
  },
  {
    key: 'meetup',
    name: 'Meetup',
    covers: 'Stepsisters free events · swipe for a bestie',
    image: '1536010305525-f7aa0834e2c7',
    picks: [
      { title: 'Stepsisters sunset walk', meta: 'Free community event', image: '1491438590914-bc09fcaaf77a', url: '/bestie#stepsisters' },
      { title: 'Swipe for a bestie', meta: 'Members · connect on Instagram', image: '1555817129-2fa6b81bd8e5', members: true },
    ],
  },
];
