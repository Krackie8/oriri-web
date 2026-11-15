# What does UAE data law require of the Bestie loop?

Research for issue #58. Researched 2026-11-15. **This is not legal advice.** It is an engineering reading of the law to guide Bestie loop v1. Confirm with UAE counsel before launch.

## Short answer

The UAE federal PDPL (Federal Decree-Law No. 45 of 2021) applies to Oriri if the operating company is on mainland Dubai or in a free zone without its own data law. The law is in force, but its **Executive Regulations still appear not to have been issued**. The regulations would fix breach-reporting deadlines, the cross-border "adequate country" list and the compliance window. In practice, the statute's core duties already bind Oriri, and the parts the regulations will define should be built conservatively now. For Bestie this means: consent as the legal basis, treating Check-in energy/mood as possibly **sensitive (health)** data, the full set of Member rights including profiling, and a written basis for hosting data outside the UAE.

## Source status

| Source | What it is | Trust |
|---|---|---|
| PDPL English text, UAE Legislation portal: https://uaelegislation.gov.ae/en/legislations/1972 (download: /1972/download) | Official text. The Arabic version prevails. | Primary. Blocked (HTTP 403) to automated fetch, so article contents below were cross-checked against the secondary sources below. |
| Arabic PDF: https://government.ae/-/media/Documents-2023/ArFederal-Decree-Law-No-45-of-2021-regarding-the-Protection-of-Personal-Data.pdf | Official, Arabic | Primary |
| UAE government portal, data protection laws: https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws (updated 4 Dec 2025) | Official summary | Primary (summary only) |
| Hunton Andrews Kurth analysis: https://www.hunton.com/privacy-and-cybersecurity-law-blog/data-protection-in-the-uae-game-changing-federal-uae-data-law | Law-firm reading of the decree | Secondary |
| Article-by-article explainer: https://legal-wires.com/uae/federal-decree-by-law-concerning-the-protection-of-personal-data | Secondary | Secondary |
| Morgan Lewis, June 2026: https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data | Status of the regulator and regulations | Secondary, recent |

**Gap:** I could not fetch the official English text directly. Article numbers below match two independent secondary sources. Check them against the official PDF before quoting them to a regulator.

## Which law applies (DIFC / ADGM)

- PDPL Art. 2 **excludes** free zones that have their own data protection law: the DIFC (DIFC Data Protection Law No. 5 of 2020), the ADGM (Data Protection Regulations 2021) and Dubai Healthcare City. It also excludes government data, health data already covered by other legislation, and banking/credit data. (Hunton; legal-wires)
- **Binding:** which regime applies depends on **where Oriri's legal entity is licensed**, not where users live. A mainland Dubai licence, or a free zone with no data law of its own (e.g. DMCC, Dubai Internet City), means the PDPL applies. A DIFC or ADGM licence means the GDPR-like DIFC or ADGM regime applies instead, with its own commissioner, registration and fees. *Open question for the founder: confirm the licensing jurisdiction.*
- The PDPL also reaches controllers outside the UAE that process residents' data (Art. 2).
- The Federal Law No. 2 of 2019 on ICT in health fields mainly binds healthcare providers. A wellness app that is not a licensed health service is probably outside it. Check this if Oriri ever offers clinical or practitioner features.

## Regulator and regulations status

- The UAE Data Office (Federal Decree-Law No. 44 of 2021) is the PDPL regulator.
- In June 2026 a Federal Authority for AI and Data was announced to consolidate bodies. As of then the PDPL Executive Regulations **had not been issued** (Morgan Lewis). Vendor pages claiming specific "Cabinet Decision" numbers could not be traced to a primary publication. Treat them as unverified.
- Once the regulations are issued, the decree gives **six months** to comply (Hunton). The duties written in the statute already bind Oriri.

## Obligations by Bestie feature

**B** = binding statutory duty. **A** = advice or best practice (including duties left to the regulations, which are worth meeting now).

### Area-level location
- B: Consent is the main legal basis. There is **no "legitimate interests" basis** in the PDPL, and the other bases are contract, legal obligation and public interest (Art. 4; Hunton). Picking a current city or area to get Suggestions can rest on contract performance. Storing location history to learn from it needs consent.
- B: Consent must be specific, informed, unambiguous, given by a clear affirmative act, provable, and withdrawable at any time (Art. 6; Hunton).
- B: Data minimisation and purpose limitation (Art. 5).
- A: Store area or city, never GPS coordinates. Do not reuse location for grouping without a separate opt-in.

### Photo Proof uploads
- B: A photo is personal data, and may show other people's faces or the Member's home. Use it only for the Completion purpose (Art. 5). Keep it secure (Art. 20).
- B: The Member can request erasure (Art. 15).
- A: Strip EXIF/GPS metadata on upload. Use a private storage bucket with RLS and signed URLs. Set a retention limit (e.g. keep the Completion record and delete the image after N days). Tell Members not to photograph others.

### Energy / mood Check-ins (possible sensitive data)
- B: "Sensitive personal data" includes data revealing **health** (Art. 1). Daily mood/energy tied to a named Member can plausibly reveal mental-health state, so treat it as sensitive.
- B: Processing large volumes of sensitive data, or high-risk processing, triggers a **DPO** (Art. 10; the DPO may be external and need not be UAE-based) and a **data protection impact assessment** (Art. 21).
- A: Get a separate, explicit consent for mood data. Write a short DPIA now. Name an accountable privacy contact even before volume makes a DPO mandatory.

### Profiling to personalise, and later to group Members
- B: Members have the right to object to decisions based solely on automated processing, including profiling, that produce legal or serious effects (Art. 18).
- B: The privacy notice must state the purposes and recipients before processing (Art. 13; Hunton).
- A: Personalised Suggestions are low-impact. **Grouping Members** (Meet up), which reveals one Member's data or presence to others, is a new purpose. Give it its own opt-in, shown at the moment it ships, plus a way to see and reset "what Bestie has learned".

### Data export and deletion
- B: Right to information/access (Art. 13), portability to another controller in a structured, machine-readable form (Art. 14), correction and erasure (Art. 15), and restriction/stopping of processing (Arts. 16-17).
- A: Response deadlines will come from the regulations. Aim for 30 days. Build a self-serve JSON export and a hard-delete that also removes Proof photos from storage, backups excepted (document backup expiry).

### Minimum age
- B: The PDPL text has **no specific children's provision** that the sources show. Consent must be valid, though, and under UAE civil law full legal capacity starts at 21 Gregorian years (Federal Civil Transactions Law; check this with counsel). Minors' consent is therefore doubtful.
- A: Restrict the app to 18+ through a self-declared age gate at sign-up. Under-18s are not the target audience anyway. Note that the Federal Child Digital Safety Law (Decree-Law 26 of 2025) was not researched here.

### Storing data outside the UAE (Supabase region)
- B: The PDPL allows transfers to countries the Data Office deems adequate. For others, it requires safeguards set by the regulations, such as a contract binding the recipient to PDPL-level protection, with exceptions including the data subject's express consent (Arts. 22-23; Hunton). The adequacy list has **not been published**.
- B: The privacy notice must describe cross-border transfers and their safeguards (Hunton).
- A: Until the regulations land, rely on (1) Supabase's DPA, signed and on file, with standard contractual terms, (2) explicit disclosure plus consent at sign-up, and (3) choosing the nearest region that meets EU GDPR standards (e.g. Frankfurt), which is the most defensible "adequate" choice. Revisit this when the list appears.

### Breach
- B: Report any breach that could affect privacy, confidentiality or security to the Data Office **and** affected Members. There is no "high risk" threshold, and the deadline will be set by the regulations (Art. 9; Hunton).
- A: Keep an incident runbook with a 72-hour internal target.

## Checklist for Bestie loop v1

- [ ] Confirm the licensing jurisdiction (mainland/PDPL vs DIFC vs ADGM). This decides which law applies.
- [ ] Privacy notice: purposes, data categories, recipients (Supabase, email provider), transfer outside the UAE and its safeguards, rights, how to complain to the UAE Data Office.
- [ ] Sign-up shows an 18+ age gate and separate, unticked consents for (a) the core service and transfer outside the UAE, and (b) storing mood/energy Check-ins. Log each consent with a timestamp and version.
- [ ] Settings: withdraw any consent, and have Bestie stop using that data at once.
- [ ] Location stored at area/city level only. No GPS stored.
- [ ] Proof: EXIF stripped, private bucket, RLS, signed URLs, retention period set.
- [ ] Self-serve data export (JSON) and account deletion that covers Check-ins, Suggestions, Completions and Proof files.
- [ ] "What Bestie learned" view with a reset. Grouping or Meet up matching stays off until it gets its own opt-in.
- [ ] One-page DPIA for mood data and profiling. Named privacy contact. Plan for a DPO when volume grows.
- [ ] Supabase DPA on file. Region choice and reasoning written up as an ADR.
- [ ] Breach runbook covering notice to the Data Office and Members.
- [ ] Watch for the Executive Regulations. The six-month compliance clock starts when they are issued.
