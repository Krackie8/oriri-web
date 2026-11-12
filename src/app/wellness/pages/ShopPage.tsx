/**
 * Shop with Ren: ORIRI Originals (coming soon) + Ren's affiliate picks.
 * Dubai shops Amazon.ae, KL shops Shopee. Picks live in ../shop/catalog.ts.
 * Buy buttons open the store in a new tab and are counted for Admin › Traffic.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cx } from '../bestie/kit';
import { countShopClick } from '../analytics/firstParty';
import { CITIES, FEATURED_ID, PICKS, SHELVES, type CityKey, type ShopPick } from '../shop/catalog';

const DISPLAY: React.CSSProperties = { fontFamily: 'var(--font-wb-logo)', fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0 };
const SERIF: React.CSSProperties = { fontFamily: 'var(--font-wb-logo)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 };
const CITY_KEY = 'wb_shop_city';
const label = 'text-[11px] font-semibold uppercase tracking-[0.16em]';

function startCity(): CityKey {
  try {
    const q = new URLSearchParams(location.search).get('city');
    if (q === 'kl' || q === 'dubai') return q;
    const saved = localStorage.getItem(CITY_KEY);
    if (saved === 'kl' || saved === 'dubai') return saved;
    if (/Kuala_Lumpur|Kuching/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '')) return 'kl';
  } catch {
    /* storage blocked */
  }
  return 'dubai';
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ShopPage() {
  const [city, setCityState] = useState<CityKey>(startCity);
  const setCity = (c: CityKey) => {
    setCityState(c);
    try {
      localStorage.setItem(CITY_KEY, c);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    document.title = 'Shop with Ren · ORIRI';
  }, []);

  const picks = useMemo(() => PICKS.filter((p) => p.links[city]), [city]);
  const featured = FEATURED_ID ? picks.find((p) => p.id === FEATURED_ID) : undefined;
  const c = CITIES[city];

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="mt-16 overflow-hidden bg-gradient-to-b from-[#CDB49C] to-[#D9C4B0]">
        <div className="mx-auto max-w-[430px] px-5 pt-9 text-center">
          <p className={cx(label, 'text-[#4A2F24]')}>The ORIRI Shop</p>
          <h1 className="mt-3 text-[52px] leading-[0.95] text-wb-paper" style={DISPLAY}>
            Shop with Ren
          </h1>
          <p className="mx-auto mt-4 max-w-[34ch] text-[16px] leading-relaxed text-[#4A2F24]">
            The things I actually use for slow mornings, real meals and moving my body. Tried, loved, re-bought.
          </p>
          <div className="mt-6 grid gap-2.5">
            {[
              ['ORIRI Originals', () => scrollToId('originals')],
              ['Shop my Dubai edit', () => (setCity('dubai'), scrollToId('picks'))],
              ['Shop my KL edit', () => (setCity('kl'), scrollToId('picks'))],
            ].map(([t, go]) => (
              <button
                key={t as string}
                type="button"
                onClick={go as () => void}
                className="bg-wb-paper py-[15px] text-[21px] text-wb-ink transition-colors hover:bg-[#4A2F24] hover:text-wb-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A2F24]"
                style={DISPLAY}
              >
                {t as string}
              </button>
            ))}
          </div>
          <img
            src="/shop/ren-studio.jpg"
            alt="Ren, founder of ORIRI"
            width={760}
            height={1013}
            fetchPriority="high"
            className="mx-auto mt-8 block w-[88%]"
            style={{ WebkitMaskImage: 'radial-gradient(120% 95% at 50% 70%, #000 62%, transparent 92%)', maskImage: 'radial-gradient(120% 95% at 50% 70%, #000 62%, transparent 92%)' }}
          />
        </div>
      </section>

      {/* ORIRI Originals */}
      <section id="originals" className="scroll-mt-16 bg-wb-stone">
        <div className="mx-auto max-w-[430px] px-5 py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[32px] leading-tight text-[#4A2F24]" style={DISPLAY}>
              ORIRI Originals
            </h2>
            <span className={cx(label, 'text-[#8A6E5C]')}>Made by Ren</span>
          </div>
          <div className="mt-5 flex flex-col items-center gap-1.5 border border-wb-sand bg-wb-paper px-5 py-11 text-center">
            <span className={cx(label, 'text-[#8A6E5C]')}>Coming soon</span>
            <p className="text-[24px] text-[#4A2F24]" style={DISPLAY}>
              Something I'm making for you.
            </p>
          </div>
        </div>
      </section>

      {/* Ren's Picks */}
      <div id="picks" className="mx-auto max-w-[430px] scroll-mt-16 px-5 pb-4 pt-12 text-center">
        <h2 className="text-[38px] leading-tight text-[#4A2F24]" style={DISPLAY}>
          Ren's Picks
        </h2>
        <p className="mt-1 text-[15px] text-[#8A6E5C]">Choose your city to shop my favourites where you live.</p>
      </div>
      <nav aria-label="Choose your city" className="sticky top-16 z-30 border-b border-wb-sand bg-wb-paper/95 backdrop-blur">
        <div className="mx-auto grid max-w-[430px] grid-cols-2 px-5 py-3">
          {(Object.keys(CITIES) as CityKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={city === k}
              onClick={() => setCity(k)}
              className={cx(
                'flex flex-col items-center gap-0.5 border border-[#4A2F24] py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6E5C] focus-visible:ring-offset-2',
                city === k ? 'bg-[#4A2F24] text-wb-paper' : 'text-[#4A2F24]',
              )}
            >
              <span className="text-[20px] leading-tight" style={DISPLAY}>
                {CITIES[k].label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">{CITIES[k].store}</span>
            </button>
          ))}
        </div>
      </nav>
      <p className="mx-auto max-w-[430px] px-5 pt-2 text-center text-[13px] text-[#8A6E5C]">{c.hint}</p>

      <div className="mx-auto max-w-[430px] px-5">
        {featured && <Featured pick={featured} city={city} />}

        {picks.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-1.5 border border-wb-sand px-5 py-11 text-center">
            <span className={cx(label, 'text-[#8A6E5C]')}>{c.label} edit</span>
            <p className="text-[24px] text-[#4A2F24]" style={DISPLAY}>
              My first picks land here this week.
            </p>
          </div>
        ) : (
          SHELVES.map((s) => {
            const items = picks.filter((p) => p.shelf === s.key && p.id !== featured?.id);
            if (!items.length) return null;
            return (
              <section key={s.key} className="mt-11">
                <div className="flex items-center gap-4">
                  <img src={s.cover} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0">
                    <h3 className="text-[24px] leading-tight" style={SERIF}>
                      {s.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-[#8A6E5C]">{s.sub}</p>
                  </div>
                </div>
                <div className="-mx-5 mt-4 grid snap-x snap-mandatory auto-cols-[62%] grid-flow-col gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                  {items.map((p) => (
                    <PickCard key={p.id} pick={p} city={city} />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <aside className="mt-12 flex flex-col items-center gap-4 bg-wb-stone px-6 py-7 text-center">
          <img src="/shop/ren-note.jpg" alt="Ren" className="h-24 w-24 rounded-full object-cover" />
          <p className="text-[20px] leading-snug text-[#4A2F24]" style={DISPLAY}>
            "I only add things I've used for at least a month. If it's here, it earned its spot in my routine."
          </p>
          <span className={cx(label, 'text-[#8A6E5C]')}>Ren, founder of ORIRI</span>
        </aside>
      </div>
    </div>
  );
}

function BuyLink({ pick, city, className, children }: { pick: ShopPick; city: CityKey; className: string; children: React.ReactNode }) {
  const link = pick.links[city]!;
  return (
    <a href={link.url} target="_blank" rel="sponsored noopener noreferrer" onClick={() => countShopClick(city, pick.id)} className={className}>
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
    </a>
  );
}

const price = (pick: ShopPick, city: CityKey) => {
  const p = pick.links[city]?.price;
  return p ? `${CITIES[city].currency} ${p}` : '';
};

function PickCard({ pick, city }: { pick: ShopPick; city: CityKey }) {
  return (
    <article className="flex min-w-0 snap-start flex-col gap-2.5">
      <div className="relative aspect-[4/5] overflow-hidden bg-wb-stone">
        <img src={pick.image} alt={pick.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        {pick.tag && <span className="absolute left-2.5 top-2.5 bg-wb-paper px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#4A2F24]">{pick.tag}</span>}
      </div>
      <h4 className="text-[14px] font-medium">{pick.name}</h4>
      <p className="text-[15px] leading-snug text-[#8A6E5C]" style={DISPLAY}>
        "{pick.why}"
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[13px] tabular-nums">{price(pick, city)}</span>
        <BuyLink
          pick={pick}
          city={city}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#4A2F24] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A2F24] hover:bg-[#4A2F24] hover:text-wb-paper"
        >
          Shop
        </BuyLink>
      </div>
    </article>
  );
}

function Featured({ pick, city }: { pick: ShopPick; city: CityKey }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[30px] leading-tight text-[#4A2F24]" style={DISPLAY}>
          This week's obsession
        </h2>
        <span className={cx(label, 'shrink-0 text-[#8A6E5C]')}>Ren's pick</span>
      </div>
      <article className="mt-4 bg-wb-stone">
        <img src={pick.image} alt={pick.name} className="aspect-[4/3] w-full object-cover" />
        <div className="flex flex-col gap-3 p-6">
          <span className={cx(label, 'text-[#8A6E5C]')}>
            {CITIES[city].store}
            {price(pick, city) && ` · ${price(pick, city)}`}
          </span>
          <h3 className="text-[30px] leading-tight" style={SERIF}>
            {pick.name}
          </h3>
          <p className="text-[19px] text-[#4A2F24]" style={DISPLAY}>
            "{pick.why}"
          </p>
          <BuyLink
            pick={pick}
            city={city}
            className="inline-flex items-center gap-2 self-start rounded-full bg-[#4A2F24] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-wb-paper hover:bg-wb-ink"
          >
            Shop on {CITIES[city].store}
          </BuyLink>
        </div>
      </article>
    </section>
  );
}
