/**
 * ISO 3166-1 alpha-2 codes (common countries and territories).
 * Used for nationality: stored value = uppercase code (e.g. "PT").
 */
const ALPHA2 =
  "AD,AE,AF,AG,AI,AL,AM,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,SS,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,XK,YE,YT,ZA,ZM,ZW";

const SET = new Set(ALPHA2.split(","));

export const ISO_COUNTRY_CODES_SORTED = [...SET].sort();

export function isIsoCountryCode(code: string): boolean {
  return SET.has(code.trim().toUpperCase());
}

/** Localized country name from the ISO code (e.g. PT → "Portugal" / "Portugal"). */
export function countryLabelFromCode(code: string, locale: string): string {
  const c = code.trim().toUpperCase();
  if (!isIsoCountryCode(c)) return code;
  try {
    const loc = locale === "en" || !locale ? "en" : locale;
    const dn = new Intl.DisplayNames([loc, "en"], { type: "region" });
    return dn.of(c) ?? c;
  } catch {
    return c;
  }
}

/** Legacy free text (e.g. "Portugal"); invalid 2-letter codes are not included. */
export function isLegacyNationalityFreeText(value: string): boolean {
  const t = value.trim();
  if (t.length < 3 || t.length > 80) return false;
  return !isIsoCountryCode(t);
}
