/**
 * Overall radar height box — shared by the real map and the `dynamic()` skeleton
 * so the card does not jump on hydrate (which looked like different font sizes across profiles).
 */
export const OVERALL_RADAR_CHART_BOX_CLASS =
  "mx-auto h-[min(320px,78vw)] w-full min-h-[240px] sm:h-[min(360px,68vw)] md:h-[min(400px,42vw)] md:min-h-[340px] lg:h-[420px] lg:min-h-[360px]";
