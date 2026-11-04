import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow, InstagramLink, Photo, PhotoPlaceholder, PilotCta } from '../components/ui';

const BEATS = [
  {
    n: '01',
    title: 'It started with tea.',
    body: 'ORIRI began as Tea for Two, honest conversations between friends about building a life in the UAE: growth, wellness, and the highs and lows of change.',
  },
  {
    n: '02',
    title: 'Rising better, together.',
    body: "Our listeners kept asking the same thing. Not what to do, but how to make it part of a real, busy life. That's the gap we care about.",
  },
  {
    n: '03',
    title: 'Now, a bestie.',
    body: 'Wellness Bestie brings a calm wellness ritual to every woman, whatever her budget or schedule. Each real experience has a free digital twin, curated for her day.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-28 md:px-10 md:pt-40">
        <Eyebrow>About ORIRI</Eyebrow>
        <h1 className="wb-rise mt-6 max-w-4xl text-[46px] sm:text-[64px] lg:text-[92px]">
          Oriri. Latin for <span className="text-wb-sage-deep">to rise.</span>
        </h1>
      </section>

      <section className="px-3 md:px-6" aria-label="Desert landscape">
        <Photo
          id="1520440718111-45fe694b330a"
          alt="Wide, quiet desert landscape"
          className="mx-auto aspect-[4/5] max-w-[1320px] rounded-[36px] sm:aspect-[16/9] lg:aspect-[21/9]"
          w={2000}
          h={860}
          eager
        />
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 md:px-10 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-3 lg:gap-10">
          {BEATS.map((b) => (
            <article key={b.n} className="border-t border-wb-ink/15 pt-6">
              <p className="text-[14px] tabular-nums text-wb-taupe">{b.n}</p>
              <h2 className="mt-4 text-[30px] sm:text-[34px]">{b.title}</h2>
              <p className="mt-4 text-[17px] leading-[1.7] text-wb-soft">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-4 px-5 md:px-10 lg:grid-cols-[1fr_1fr_0.8fr]">
        {/* ▶ PHOTO PLACEHOLDER: Ren in a favourite Dubai spot (landscape or square) */}
        <PhotoPlaceholder label="Ren in a favourite Dubai spot. Square or landscape." ratio="aspect-square" />
        <Photo id="1528458909336-e7a0adfed0a5" alt="Close-up of natural beige linen" className="aspect-square rounded-[28px]" w={800} h={800} />
        <Photo id="1526547319484-63dce467060b" alt="A cup and saucer on a café table" className="aspect-square rounded-[28px] lg:aspect-auto" w={700} h={800} />
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 text-center md:px-10 lg:py-32">
        <h2 className="mx-auto max-w-2xl text-[38px] sm:text-[52px]">Come rise with us.</h2>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <PilotCta location="about" />
          <InstagramLink location="about" />
        </div>
        <p className="mt-10 text-[15px] text-wb-taupe">
          Still love the conversations?{' '}
          <Link to="/podcast" className="text-wb-ink underline underline-offset-4">
            Listen to Tea for Two
          </Link>
        </p>
      </section>
    </>
  );
}
