/** Shop · coming soon. Later: ORIRI merch and curated affiliate picks. */
import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Card, Eyebrow, GoldRule, Screen, WaitlistLink } from '../bestie/kit';

export default function ShopPage() {
  return (
    <Screen className="pb-16">
      <div className="pt-10">
        <Eyebrow>The ORIRI shop</Eyebrow>
        <h1 className="mt-3 text-[40px] leading-[1.05]">Coming soon.</h1>
        <GoldRule className="mt-5" />
        <p className="mt-5 text-[17px] leading-relaxed text-wb-soft">
          Our own ORIRI pieces, plus the things we actually use and love, all in one place.
        </p>
      </div>

      <Card className="mt-8 flex items-start gap-4 p-6">
        <ShoppingBag className="mt-1 h-6 w-6 shrink-0 text-wb-gold" strokeWidth={1.3} />
        <div>
          <h2 className="text-[22px]">Be first to know</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-wb-soft">Join the waitlist and we'll tell you when the shop opens.</p>
          <WaitlistLink source="shop" className="mt-5" size="md" />
        </div>
      </Card>
    </Screen>
  );
}
