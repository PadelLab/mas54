export const CONTINENT_IDS = [
  "northAmerica",
  "southAmerica",
  "europe",
  "africa",
  "asia",
  "oceania",
] as const;

export type ContinentId = (typeof CONTINENT_IDS)[number];

const NORTH_AMERICA = new Set(
  "AG,AI,AW,BB,BL,BM,BQ,BS,BZ,CA,CR,CU,CW,DM,DO,GD,GL,GP,GT,HN,HT,JM,KN,KY,LC,MF,MQ,MS,MX,NI,PA,PM,PR,SV,SX,TC,TT,UM,US,VC,VG,VI".split(
    ",",
  ),
);
const SOUTH_AMERICA = new Set("AR,BO,BR,CL,CO,EC,FK,GF,GS,GY,PE,PY,SR,UY,VE".split(","));
const EUROPE = new Set(
  "AD,AL,AT,AX,BA,BE,BG,BY,CH,CY,CZ,DE,DK,EE,ES,FI,FO,FR,GB,GG,GI,GR,HR,HU,IE,IM,IS,IT,JE,LI,LT,LU,LV,MC,MD,ME,MK,MT,NL,NO,PL,PT,RO,RS,RU,SE,SI,SJ,SK,SM,UA,VA,XK".split(
    ",",
  ),
);
const AFRICA = new Set(
  "AO,BF,BI,BJ,BW,CD,CF,CG,CI,CM,CV,DJ,DZ,EG,EH,ER,ET,GA,GH,GM,GN,GQ,GW,KE,KM,LR,LS,LY,MA,MG,ML,MR,MU,MW,MZ,NA,NE,NG,RE,RW,SC,SD,SH,SL,SN,SO,SS,ST,SZ,TD,TG,TN,TZ,UG,YT,ZA,ZM,ZW".split(
    ",",
  ),
);
const ASIA = new Set(
  "AE,AF,AM,AZ,BD,BH,BN,BT,CC,CN,CX,GE,HK,ID,IL,IN,IO,IQ,IR,JO,JP,KG,KH,KP,KR,KW,KZ,LA,LB,LK,MM,MN,MO,MV,MY,NP,OM,PH,PK,PS,QA,SA,SG,SY,TH,TJ,TL,TM,TR,TW,UZ,VN,YE".split(
    ",",
  ),
);
const OCEANIA = new Set(
  "AS,AU,CK,FJ,FM,GU,KI,MH,MP,NC,NF,NR,NU,NZ,PF,PG,PN,PW,SB,TK,TO,TV,VU,WF,WS".split(","),
);

/** Continent from an ISO 3166-1 alpha-2 code. */
export function continentFromCountryCode(code: string): ContinentId | null {
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return null;
  if (NORTH_AMERICA.has(c)) return "northAmerica";
  if (SOUTH_AMERICA.has(c)) return "southAmerica";
  if (EUROPE.has(c)) return "europe";
  if (AFRICA.has(c)) return "africa";
  if (ASIA.has(c)) return "asia";
  if (OCEANIA.has(c)) return "oceania";
  return null;
}
