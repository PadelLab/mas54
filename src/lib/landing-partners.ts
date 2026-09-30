/** Club partners shown in the landing marquee. */
export type LandingPartner = {
  name: string;
  /** Gray mark for the light theme. */
  srcLight?: string;
  /** White mark for the dark theme. */
  srcDark?: string;
  /** Optional single logo when light/dark variants are not needed. */
  src?: string;
};

export const LANDING_PARTNERS: LandingPartner[] = [
  {
    name: "UniWorld Air Cargo",
    srcLight: "/marketing/partners/uniworld-gray.png",
    srcDark: "/marketing/partners/uniworld-white.png",
  },
  {
    name: "Grupo AG",
    srcLight: "/marketing/partners/grupoag-gray.png",
    srcDark: "/marketing/partners/grupoag-white.png",
  },
  {
    name: "Círculo de Seguros",
    srcLight: "/marketing/partners/circulo-gray.png",
    srcDark: "/marketing/partners/circulo-white.png",
  },
];
