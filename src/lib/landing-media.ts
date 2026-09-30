/**
 * Marketing landing imagery — Unsplash (`images.unsplash.com`), free license:
 * https://unsplash.com/license
 *
 * Hero slides favour **tight shots** (hands, racket, ball, net) — same mood as the
 * dark close-up action frame users preferred, not wide empty-court establishing shots.
 */

export type LandingSlide = {
  src: string;
  alt: string;
  /** Passed to `object-position` (hero framing per photo). */
  objectPosition?: string;
};

const u = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const HERO_CAROUSEL_SLIDES: LandingSlide[] = [
  {
    src: u("photo-1658723826297-fe4d1b1e6600", 2400),
    alt: "Rackets and yellow balls arranged on a blue court",
    objectPosition: "center 48%",
  },
  {
    src: u("photo-1646649852046-b758d2d573f3", 2400),
    alt: "Player ready with a racket on the baseline",
    objectPosition: "center 34%",
  },
  {
    src: u("photo-1510846699902-9211b99dac11", 2400),
    alt: "Fast doubles rally on a blue court",
    objectPosition: "center 38%",
  },
  {
    src: u("photo-1654350301609-4ca7fca4c6c1", 2400),
    alt: "Net mesh and white band up close",
    objectPosition: "center 42%",
  },
  {
    src: u("photo-1715333155413-45f4aafe57b3", 2400),
    alt: "Athlete posing with racket on court",
    objectPosition: "center 30%",
  },
  {
    src: u("photo-1646649851780-d9701b7c3c04", 2400),
    alt: "High angle view of a player and racket on blue turf",
    objectPosition: "center 36%",
  },
];
