# Off-the-shelf clip option — parked research

These are saved candidate notes and historical prices from September 5, 2026. The current prototype uses the printed v0.2 head. No clip adapter has been built or validated.

**Yes, with an adapter.** A useful candidate is the **Mueller BU-34 smooth-jaw micro clip**, or **BU-34X** in stainless steel. The manufacturer's [BU-34 series datasheet](https://www.muellerelectric.com/product_files/229/DS-BU-34.pdf) specifies approximately **27.8 × 5.1 × 7.9 mm**, with up to **5.6 mm jaw spread**. Smooth jaws make this a more relevant starting point than a coarse-toothed electrical clip, though grip on grape skin still needs testing.

| Candidate | Material | Listed single-piece price, checked September 5, 2026 |
| --- | --- | --- |
| [Mueller BU-34 at DigiKey](https://www.digikey.com/en/products/detail/mueller-electric-co/BU-34/304581) | Nickel-plated steel | **$0.66**, before tax/shipping |
| [Mueller BU-34X at DigiKey](https://www.digikey.com/en/products/detail/mueller-electric-co/BU-34X/4766487) | Stainless steel | **$1.17**, before tax/shipping |

A proposed conversion would hold the clip's fixed shank in a printed cradle and put a sliding cam on the pushrod. Advancing the rod would press the clip's rear lever to open it; retracting the rod would release the lever and let the clip spring close. That preserves the current squeeze-to-close direction, but **grip force would come from the clip spring**, rather than direct control through our jaw linkage.

This is an engineering concept, not a validated drop-in adapter. The catalog gives overall dimensions, not the tail/pivot geometry or spring force needed to finish a reliable mount and cam. Measure one sample's mounting shape, lever travel, and opening force, and verify that our **2.39 mm rod stroke** gives sufficient travel. Simply attaching the rod to the solder/crimp tail will not actuate the jaw. A rigid push/pull conversion with controllable closing force would need a separate crank and likely clip modification. The supplied v0.2 files implement the printed head; they do not claim compatibility with an unmeasured clip.

