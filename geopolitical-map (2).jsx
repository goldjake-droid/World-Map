import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as d3 from "d3";

// ── TopoJSON decoders ────────────────────────────────────────────────
function topoDecode(topology, object) {
  const arcs = topology.arcs, t = topology.transform;
  function decArc(ai) {
    const arc = arcs[ai < 0 ? ~ai : ai], cs = []; let x = 0, y = 0;
    for (const p of arc) { x += p[0]; y += p[1]; cs.push([x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]); }
    if (ai < 0) cs.reverse(); return cs;
  }
  function decRing(r) { const cs = []; for (const ai of r) { const d = decArc(ai); for (let i = 0; i < d.length; i++) { if (i > 0 || !cs.length) cs.push(d[i]); } } return cs; }
  function decGeom(g) {
    if (g.type === "Polygon") return { type: "Polygon", coordinates: g.arcs.map(decRing) };
    if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.arcs.map(p => p.map(decRing)) };
    return { type: g.type, coordinates: [] };
  }
  return { type: "FeatureCollection", features: object.geometries.map(g => ({ type: "Feature", id: g.id, properties: g.properties || {}, geometry: decGeom(g) })) };
}
function topoMesh(topology, object) {
  const arcs = topology.arcs, t = topology.transform;
  function decArc(ai) {
    const arc = arcs[ai < 0 ? ~ai : ai], cs = []; let x = 0, y = 0;
    for (const p of arc) { x += p[0]; y += p[1]; cs.push([x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]); }
    if (ai < 0) cs.reverse(); return cs;
  }
  const used = {};
  for (const g of object.geometries) { const aa = g.type === "Polygon" ? g.arcs : g.type === "MultiPolygon" ? g.arcs.flat() : []; for (const r of aa) for (const a of r) { used[a < 0 ? ~a : a] = 1; } }
  const lines = []; for (const k of Object.keys(used)) lines.push(decArc(parseInt(k)));
  return { type: "MultiLineString", coordinates: lines };
}

// ── Regions (kept as secondary view) ─────────────────────────────────
const REGIONS = {
  "North America": { color: "#5B8DEF", ids: [840, 124, 484, 320, 84, 222, 340, 558, 188, 591, 192, 388, 332, 214, 780, 44, 630] },
  "South America": { color: "#34D399", ids: [76, 32, 170, 604, 862, 152, 218, 68, 600, 858, 328, 740] },
  "Europe": { color: "#818CF8", ids: [826, 250, 276, 380, 724, 620, 528, 56, 756, 40, 752, 578, 208, 246, 372, 616, 203, 642, 348, 300, 100, 191, 688, 703, 705, 440, 428, 233, 352, 442, 196, 8, 807, 499, 70, 498, 804, 112, 304] },
  "Middle East": { color: "#FBBF24", ids: [682, 784, 376, 364, 368, 760, 400, 422, 414, 634, 48, 512, 887, 275, 792] },
  "Africa": { color: "#F87171", ids: [566, 710, 818, 404, 231, 288, 834, 12, 504, 788, 800, 686, 384, 120, 450, 508, 716, 24, 466, 854, 562, 148, 729, 728, 706, 434, 454, 894, 646, 108, 768, 204, 694, 430, 478, 270, 624, 226, 266, 178, 180, 140, 232, 262, 174, 480, 426, 748, 72, 516, 732, 324] },
  "Central & South Asia": { color: "#FB923C", ids: [398, 860, 795, 417, 762, 4, 586, 496, 356, 50, 144, 524, 64, 462] },
  "East Asia": { color: "#22D3EE", ids: [156, 392, 410, 408, 158] },
  "Southeast Asia": { color: "#C084FC", ids: [764, 704, 608, 458, 702, 360, 104, 116, 418, 96, 626] },
  "Oceania": { color: "#F472B6", ids: [36, 554, 598, 242, 90, 548, 540] },
  "Russia & Caucasus": { color: "#94A3B8", ids: [643, 268, 51, 31] },
};
function getRegion(id) { const n = parseInt(id); for (const [name, d] of Object.entries(REGIONS)) if (d.ids.includes(n)) return { name, color: d.color }; return { name: "Other", color: "#475569" }; }

// ── ISO3 → Numeric ID (World Bank) ───────────────────────────────────
const ISO3_TO_NUM = { AFG: "004", ALB: "008", DZA: "012", AGO: "024", ARG: "032", ARM: "051", AUS: "036", AUT: "040", AZE: "031", BHS: "044", BHR: "048", BGD: "050", BLR: "112", BEL: "056", BLZ: "084", BEN: "204", BTN: "064", BOL: "068", BIH: "070", BWA: "072", BRA: "076", BRN: "096", BGR: "100", BFA: "854", BDI: "108", KHM: "116", CMR: "120", CAN: "124", CPV: "132", CAF: "140", TCD: "148", CHL: "152", CHN: "156", COL: "170", COM: "174", COG: "178", COD: "180", CRI: "188", CIV: "384", HRV: "191", CUB: "192", CYP: "196", CZE: "203", DNK: "208", DJI: "262", DOM: "214", ECU: "218", EGY: "818", SLV: "222", GNQ: "226", ERI: "232", EST: "233", SWZ: "748", ETH: "231", FJI: "242", FIN: "246", FRA: "250", GAB: "266", GMB: "270", GEO: "268", DEU: "276", GHA: "288", GRC: "300", GTM: "320", GIN: "324", GNB: "624", GUY: "328", HTI: "332", HND: "340", HUN: "348", ISL: "352", IND: "356", IDN: "360", IRN: "364", IRQ: "368", IRL: "372", ISR: "376", ITA: "380", JAM: "388", JPN: "392", JOR: "400", KAZ: "398", KEN: "404", PRK: "408", KOR: "410", KWT: "414", KGZ: "417", LAO: "418", LVA: "428", LBN: "422", LSO: "426", LBR: "430", LBY: "434", LTU: "440", LUX: "442", MDG: "450", MWI: "454", MYS: "458", MDV: "462", MLI: "466", MRT: "478", MUS: "480", MEX: "484", MDA: "498", MNG: "496", MNE: "499", MAR: "504", MOZ: "508", MMR: "104", NAM: "516", NPL: "524", NLD: "528", NZL: "554", NIC: "558", NER: "562", NGA: "566", MKD: "807", NOR: "578", OMN: "512", PAK: "586", PAN: "591", PNG: "598", PRY: "600", PER: "604", PHL: "608", POL: "616", PRT: "620", QAT: "634", ROU: "642", RUS: "643", RWA: "646", SAU: "682", SEN: "686", SRB: "688", SLE: "694", SGP: "702", SVK: "703", SVN: "705", SLB: "090", SOM: "706", ZAF: "710", SSD: "728", ESP: "724", LKA: "144", SDN: "729", SUR: "740", SWE: "752", CHE: "756", SYR: "760", TWN: "158", TJK: "762", TZA: "834", THA: "764", TLS: "626", TGO: "768", TTO: "780", TUN: "788", TUR: "792", TKM: "795", UGA: "800", UKR: "804", ARE: "784", GBR: "826", USA: "840", URY: "858", UZB: "860", VUT: "548", VEN: "862", VNM: "704", PSE: "275", YEM: "887", ZMB: "894", ZWE: "716" };

// ══════════════════════════════════════════════════════════════════════
// COMPREHENSIVE DATA — every TopoJSON country covered
// Political Stability: 0=Very Stable, 1=Stable, 2=Moderate, 3=Unstable, 4=Critical
// Freedom Index: 0-100 (Freedom House style)
// Conflict: 0=Peaceful, 1=Low, 2=Moderate, 3=High, 4=Critical
// ══════════════════════════════════════════════════════════════════════

const STABILITY_DATA = {
  // Very Stable (0) — consolidated democracies, low corruption, strong institutions
  840:0, 124:0, 554:0, 36:0, 578:0, 752:0, 246:0, 208:0, 352:0, 372:0, 756:0, 442:0, 528:0, 56:0, 276:0, 40:0, 620:0, 724:0, 380:0, 826:0, 392:0, 410:0, 858:0, 188:0, 152:0,
  // Stable (1) — functional democracies, some issues
  250:1, 616:1, 203:1, 703:1, 705:1, 233:1, 428:1, 440:1, 300:1, 196:1, 191:1, 591:1, 214:1, 458:1, 72:1, 516:1, 270:1, 242:1, 548:1, 96:1, 44:1, 388:1, 780:1, 630:1, 540:1, 158:1, 328:1, 740:1, 64:1, 462:1, 90:1, 304:1, 686:1, 834:1,
  // Moderate (2) — flawed democracies or stable autocracies, some tensions
  76:2, 32:2, 170:2, 484:2, 604:2, 218:2, 68:2, 600:2, 356:2, 360:2, 608:2, 764:2, 704:2, 116:2, 418:2, 496:2, 50:2, 144:2, 524:2, 348:2, 642:2, 100:2, 688:2, 499:2, 807:2, 8:2, 70:2, 498:2, 268:2, 51:2, 400:2, 788:2, 504:2, 818:2, 12:2, 682:2, 784:2, 634:2, 414:2, 512:2, 48:2, 266:2, 178:2, 288:2, 768:2, 204:2, 398:2, 417:2, 646:2, 450:2, 454:2, 894:2, 480:2, 262:2, 710:2, 426:2, 748:2, 792:2, 320:2, 222:2, 340:2, 84:2, 598:2, 558:2, 174:2,
  // Unstable (3) — authoritarian, active unrest, weak institutions
  862:3, 192:3, 332:3, 156:3, 643:3, 364:3, 586:3, 112:3, 804:3, 566:3, 434:3, 231:3, 120:3, 324:3, 624:3, 694:3, 854:3, 466:3, 562:3, 478:3, 508:3, 716:3, 24:3, 800:3, 108:3, 376:3, 422:3, 368:3, 226:3, 860:3, 795:3, 762:3, 404:3, 430:3, 232:3, 626:3, 148:3, 31:3, 275:3, 338:3, 887:3, 408:3, 104:3,
  // Critical (4) — active war, state collapse, humanitarian crisis
  760:4, 728:4, 729:4, 706:4, 180:4, 140:4, 4:4, 434:4, 887:4,
};
// Override conflicts: some have dual entries above, last write wins for these:
STABILITY_DATA[434] = 3; // Libya unstable
STABILITY_DATA[887] = 4; // Yemen critical — Houthi war, US strikes
STABILITY_DATA[732] = 3; // W. Sahara
STABILITY_DATA[364] = 4; // Iran — active war with US/Israel since Feb 2026
STABILITY_DATA[422] = 4; // Lebanon — 2026 Israeli invasion, Hezbollah war
STABILITY_DATA[376] = 4; // Israel — multi-front war (Iran, Lebanon, Gaza)
STABILITY_DATA[275] = 4; // Palestine — Gaza devastated
STABILITY_DATA[804] = 4; // Ukraine — full-scale war with Russia
STABILITY_DATA[104] = 4; // Myanmar — civil war, junta vs resistance
STABILITY_DATA[729] = 4; // Sudan — civil war SAF vs RSF, 150k+ dead
STABILITY_DATA[760] = 4; // Syria — post-Assad transition, ongoing conflict
STABILITY_DATA[180] = 4; // DR Congo — M23 insurgency, eastern collapse
STABILITY_DATA[140] = 4; // CAR — armed groups control territory
STABILITY_DATA[706] = 4; // Somalia — Al-Shabaab insurgency
STABILITY_DATA[728] = 4; // South Sudan — fragile, violence ongoing
STABILITY_DATA[4] = 4;   // Afghanistan — Taliban rule, humanitarian crisis
STABILITY_DATA[332] = 4; // Haiti — gang-controlled, state collapse
STABILITY_DATA[586] = 3; // Pakistan — at war with Afghanistan Feb 2026
STABILITY_DATA[231] = 3; // Ethiopia — Amhara conflict, Oromia clashes
STABILITY_DATA[566] = 3; // Nigeria — Boko Haram, banditry, kidnappings
STABILITY_DATA[484] = 3; // Mexico — cartel violence, military operations
STABILITY_DATA[854] = 3; // Burkina Faso — jihadist insurgency, junta
STABILITY_DATA[466] = 3; // Mali — jihadist insurgency, Wagner/junta
STABILITY_DATA[562] = 3; // Niger — military junta, Sahel insurgency
STABILITY_DATA[862] = 4; // Venezuela — US captured Maduro Jan 2026
STABILITY_DATA[170] = 3; // Colombia — ELN, FARC dissidents active

const STABILITY_COLORS = ["#22c55e", "#6ee7b7", "#fbbf24", "#f97316", "#ef4444"];
const STABILITY_LABELS = ["Very Stable", "Stable", "Moderate", "Unstable", "Critical"];

const FREEDOM_DATA = {
  // Full democracies (90-100)
  578:100, 752:100, 246:100, 554:99, 124:98, 208:97, 372:97, 352:94, 36:95, 756:96, 620:96, 528:97, 56:96, 40:93, 233:94, 858:98, 152:93, 188:97, 705:95, 276:94,
  // High freedom (80-89)
  826:93, 250:90, 724:90, 380:89, 428:89, 440:89, 191:85, 300:87, 703:90, 410:83, 392:96, 840:83, 616:81, 32:84, 203:92, 591:88, 214:82, 44:91, 780:83, 388:82, 72:82, 64:84, 242:80, 548:83, 90:80,
  // Partial freedom (50-79)
  76:73, 170:55, 604:71, 218:64, 484:60, 356:66, 360:59, 608:56, 458:51, 524:58, 50:39, 144:56, 348:69, 642:73, 100:70, 688:62, 499:67, 807:66, 8:67, 70:55, 498:62, 268:58, 51:51, 400:34, 788:32, 504:37, 710:79, 516:77, 328:72, 740:71, 834:34, 450:61, 646:21, 768:48, 204:66, 288:80, 398:23, 417:28, 292:71, 626:52, 332:32, 792:32, 584:67, 270:47, 686:66, 764:29, 116:25, 418:13, 496:60,
  // Low freedom (20-49)
  818:18, 12:32, 682:7, 784:17, 634:25, 414:36, 512:23, 48:14, 862:14, 192:13, 716:28, 24:26, 454:63, 894:52, 508:43, 566:43, 120:16, 324:28, 854:32, 562:30, 478:31, 266:22, 178:20, 804:39, 586:37, 156:9, 704:19, 364:14, 231:22, 800:34, 108:10, 422:40, 480:84, 262:24, 748:7, 426:65, 320:51, 222:61, 340:44, 84:67, 598:62, 558:44, 600:56, 68:66, 174:33, 462:40,
  // Very low freedom (0-19)
  643:19, 112:8, 408:3, 760:1, 728:2, 706:7, 729:5, 180:17, 140:9, 4:10, 434:9, 148:15, 795:2, 860:11, 762:8, 104:9, 232:2, 226:8, 624:18, 694:29, 430:40, 466:20, 376:77, 275:4, 368:29, 887:11, 31:7, 332:32, 732:3,
};

const CONFLICT_DATA = {
  // Peaceful (0) — no active conflict
  840:0, 124:0, 554:0, 36:0, 578:0, 752:0, 246:0, 208:0, 352:0, 372:0, 756:0, 442:0, 528:0, 56:0, 276:0, 40:0, 620:0, 724:0, 380:0, 392:0, 858:0, 188:0, 152:0, 616:0, 203:0, 703:0, 705:0, 233:0, 428:0, 440:0, 191:0, 72:0, 516:0, 458:0, 96:0, 44:0, 740:0, 64:0, 242:0, 548:0, 90:0, 540:0, 304:0, 388:0, 780:0, 462:0, 270:0, 398:0, 496:0, 266:0, 178:0, 480:0, 214:0, 328:0, 442:0, 600:0, 630:0, 68:0, 498:0, 174:0, 591:0, 826:0, 300:0, 196:0, 499:0, 807:0, 8:0, 410:0, 704:0, 158:0, 348:0,
  // Low (1) — minor tensions, sporadic incidents
  250:1, 840:1, 826:1, 76:1, 32:1, 484:1, 218:1, 604:1, 356:1, 360:1, 608:1, 764:1, 116:1, 418:1, 50:1, 144:1, 524:1, 642:1, 100:1, 688:1, 70:1, 400:1, 788:1, 504:1, 12:1, 682:1, 784:1, 634:1, 414:1, 512:1, 48:1, 288:1, 768:1, 204:1, 834:1, 646:1, 450:1, 454:1, 894:1, 710:1, 426:1, 748:1, 686:1, 268:1, 51:1, 417:1, 792:1, 320:1, 222:1, 340:1, 84:1, 598:1, 558:1, 862:1, 170:1, 626:1,
  // Moderate (2) — political violence, insurgency, significant unrest
  192:2, 332:2, 156:2, 643:2, 364:2, 112:2, 566:2, 120:2, 324:2, 854:2, 478:2, 716:2, 508:2, 231:2, 800:2, 108:2, 226:2, 860:2, 795:2, 762:2, 404:2, 430:2, 232:2, 31:2, 422:2, 376:2, 408:2, 434:2, 148:2, 624:2, 694:2, 466:2, 562:2, 818:2, 262:2, 732:2,
  // High (3) — active armed conflict, major violence
  586:3, 804:3, 368:3, 275:3, 24:3, 104:3, 170:2,
  // Critical (4) — full-scale war, state collapse
  760:4, 728:4, 729:4, 706:4, 180:4, 140:4, 4:4, 887:4,
};
// Fix overrides — 2026 conflict realities
CONFLICT_DATA[840] = 1; // US — involved in Iran war but homeland stable
CONFLICT_DATA[170] = 2; // Colombia — ELN, FARC dissidents
CONFLICT_DATA[364] = 4; // Iran — active war with US/Israel
CONFLICT_DATA[422] = 4; // Lebanon — Israeli invasion, Hezbollah war
CONFLICT_DATA[376] = 4; // Israel — multi-front war (Iran, Lebanon, Gaza)
CONFLICT_DATA[275] = 4; // Palestine — Gaza war ongoing
CONFLICT_DATA[804] = 4; // Ukraine — full-scale war with Russia
CONFLICT_DATA[104] = 4; // Myanmar — civil war
CONFLICT_DATA[643] = 3; // Russia — waging war in Ukraine
CONFLICT_DATA[729] = 4; // Sudan — civil war, mass atrocities in Darfur
CONFLICT_DATA[332] = 3; // Haiti — gang warfare, state collapse
CONFLICT_DATA[586] = 4; // Pakistan — at war with Afghanistan since Feb 2026
CONFLICT_DATA[4] = 4;   // Afghanistan — Taliban rule + Pakistan strikes
CONFLICT_DATA[484] = 3; // Mexico — cartel violence at conflict levels
CONFLICT_DATA[862] = 3; // Venezuela — US invaded, captured Maduro
CONFLICT_DATA[231] = 3; // Ethiopia — Amhara, Oromia armed conflict
CONFLICT_DATA[854] = 3; // Burkina Faso — jihadist insurgency
CONFLICT_DATA[466] = 3; // Mali — jihadist insurgency
CONFLICT_DATA[562] = 3; // Niger — Sahel insurgency
CONFLICT_DATA[566] = 3; // Nigeria — Boko Haram, banditry
CONFLICT_DATA[368] = 3; // Iraq — militia activity, Iran spillover
CONFLICT_DATA[887] = 4; // Yemen — Houthi war, US strikes
CONFLICT_DATA[760] = 3; // Syria — post-Assad instability, multiple factions

const CONFLICT_COLORS = ["#22c55e", "#84cc16", "#fbbf24", "#f97316", "#ef4444"];
const CONFLICT_LABELS = ["Peaceful", "Low", "Moderate", "High", "Critical"];

// ── Alliances & Blocs ────────────────────────────────────────────────
const ALLIANCES = {
  NATO: { color: "#60a5fa", dash: "none", ids: [840,124,826,250,276,380,724,620,528,56,442,208,578,352,792,300,616,203,348,100,642,191,705,233,428,440,8,807,499,246,40] },
  EU: { color: "#a78bfa", dash: "4 2", ids: [250,276,380,724,620,528,56,442,40,752,246,208,372,616,203,642,348,300,100,191,703,705,440,428,233,196,807] },
  BRICS: { color: "#f59e0b", dash: "none", ids: [76,643,356,156,710,818,231,364,682,784,32] },
  OPEC: { color: "#ef4444", dash: "6 2", ids: [682,364,368,414,862,566,12,24,178,226,434,634] },
  ASEAN: { color: "#c084fc", dash: "none", ids: [360,458,608,764,704,104,116,418,96,702] },
  "African Union": { color: "#f87171", dash: "4 2", ids: [566,710,818,404,231,288,834,12,504,788,800,686,384,120,450,508,716,24,466,854,562,148,729,728,706,434,454,894,646,108,768,204,694,430,478,270,624,226,266,178,180,140,232,262,174,72,516,324,748,426] },
  "Five Eyes": { color: "#22d3ee", dash: "3 3", ids: [840,826,124,36,554] },
  G7: { color: "#fbbf24", dash: "5 2", ids: [840,826,250,276,380,124,392] },
};

const interpolators = { YlGnBu: t => d3.interpolateYlGnBu(t), YlOrRd: t => d3.interpolateYlOrRd(t), RdYlGn: t => d3.interpolateRdYlGn(t) };

// ── Briefing fetcher ─────────────────────────────────────────────────
async function fetchBriefingForCountry(name) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: `You are a geopolitical intelligence analyst. Give a brief real-time briefing on ${name}. Search for the latest news. Respond ONLY with a JSON object, no markdown or backticks:\n{"headline":"Top story under 15 words","stability":"stable|tensions|conflict|crisis","keyFacts":["fact1","fact2","fact3"],"recentNews":["headline1","headline2","headline3"],"governmentType":"type","leader":"name","population":"approx","gdp":"approx","analysis":"2-3 sentence geopolitical analysis"}` }],
    }),
  });
  const data = await res.json();
  const txt = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
  return JSON.parse(txt.replace(/```json|```/g, "").trim());
}

// ── Component ────────────────────────────────────────────────────────
export default function GeoScope() {
  const [topoData, setTopoData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("stability"); // DEFAULT: stability
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchIdx, setSearchIdx] = useState(-1);
  const searchRef = useRef(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareBriefings, setCompareBriefings] = useState({});
  const [compareLoading, setCompareLoading] = useState({});
  const [liveGDP, setLiveGDP] = useState(null);
  const [livePop, setLivePop] = useState(null);
  const [liveDataLoading, setLiveDataLoading] = useState(true);
  const [activeAlliances, setActiveAlliances] = useState([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);

  // Load TopoJSON
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json()).then(d => { setTopoData(d); setMapReady(true); }).catch(() => setMapReady(true));
  }, []);

  // Load World Bank data
  useEffect(() => {
    setLiveDataLoading(true);
    const fetchWB = async (indicator) => {
      try {
        const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=300&date=2023`);
        const d = await r.json();
        if (!d[1]) return {};
        const map = {};
        for (const e of d[1]) { if (!e.value || !e.countryiso3code) continue; const numId = ISO3_TO_NUM[e.countryiso3code]; if (numId) map[parseInt(numId)] = e.value; }
        return map;
      } catch { return {}; }
    };
    Promise.all([fetchWB("NY.GDP.MKTP.CD"), fetchWB("SP.POP.TOTL")]).then(([gdp, pop]) => {
      setLiveGDP(gdp); setLivePop(pop); setLiveDataLoading(false);
    });
  }, []);

  // D3 zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const z = d3.zoom().scaleExtent([1, 12]).on("zoom", e => { d3.select(gRef.current).attr("transform", e.transform); });
    d3.select(svgRef.current).call(z);
    zoomRef.current = z;
  }, [topoData]);

  const proj = useMemo(() => d3.geoNaturalEarth1().scale(155).translate([390, 240]), []);
  const pathGen = useMemo(() => d3.geoPath().projection(proj), [proj]);
  const countries = useMemo(() => { if (!topoData) return []; return topoDecode(topoData, topoData.objects.countries).features.filter(f => f.properties.name !== "Antarctica" && f.properties.name !== "Fr. S. Antarctic Lands"); }, [topoData]);
  const borderMeshPath = useMemo(() => { if (!topoData) return ""; return pathGen(topoMesh(topoData, topoData.objects.countries)) || ""; }, [topoData, pathGen]);
  const graticule = useMemo(() => d3.geoGraticule10(), []);
  const gratPath = useMemo(() => pathGen(graticule), [pathGen, graticule]);
  const sphere = useMemo(() => pathGen({ type: "Sphere" }), [pathGen]);

  const choroData = useMemo(() => ({
    stability: { label: "Political Stability", max: 4, data: STABILITY_DATA, fmt: v => STABILITY_LABELS[v] || "Unknown" },
    gdp: { label: "GDP (Current US$)", max: 28e12, interp: "YlGnBu", data: liveGDP || {}, fmt: v => { if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`; if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`; return `$${(v / 1e6).toFixed(0)}M`; } },
    population: { label: "Population", max: 1.45e9, interp: "YlOrRd", data: livePop || {}, fmt: v => { if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`; if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`; return `${(v / 1e3).toFixed(0)}K`; } },
    freedom: { label: "Freedom Index", max: 100, interp: "RdYlGn", data: FREEDOM_DATA, fmt: v => `${v}/100` },
    conflict: { label: "Conflict Level", max: 4, data: CONFLICT_DATA, fmt: v => CONFLICT_LABELS[v] || "Unknown" },
    region: { label: "Region", data: {}, fmt: () => "" },
  }), [liveGDP, livePop]);

  const getFill = useCallback((feat, isHov, isSel) => {
    const id = parseInt(feat.id);
    const isCompared = compareMode && compareIds.includes(feat.id);

    if (mode === "region") {
      const c = getRegion(id).color;
      if (isSel || isCompared) return c;
      if (isHov) return d3.color(c)?.brighter(0.4)?.formatHex() || c;
      return d3.color(c)?.darker(0.5)?.formatHex() || c;
    }
    if (mode === "stability") {
      const val = STABILITY_DATA[id];
      const color = val !== undefined ? STABILITY_COLORS[val] : "#1e293b";
      if (isSel || isCompared) return d3.color(color)?.brighter(0.5)?.formatHex() || color;
      if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex() || color;
      return d3.color(color)?.darker(0.3)?.formatHex() || color;
    }
    if (mode === "conflict") {
      const val = CONFLICT_DATA[id];
      const color = val !== undefined ? CONFLICT_COLORS[val] : "#1e293b";
      if (isSel || isCompared) return d3.color(color)?.brighter(0.5)?.formatHex() || color;
      if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex() || color;
      return d3.color(color)?.darker(0.3)?.formatHex() || color;
    }
    // Continuous scales (gdp, population, freedom)
    const m = choroData[mode]; if (!m) return "#1e293b";
    const val = m.data[id]; if (val === undefined) return "#141a26";
    const t = Math.min(val / m.max, 1);
    const color = interpolators[m.interp](t);
    if (isSel || isCompared) return d3.color(color)?.brighter(0.5)?.formatHex() || color;
    if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex() || color;
    return color;
  }, [mode, choroData, compareMode, compareIds]);

  const flyTo = useCallback((feat) => {
    if (!svgRef.current || !zoomRef.current || !pathGen) return;
    const bounds = pathGen.bounds(feat);
    const dx = bounds[1][0] - bounds[0][0], dy = bounds[1][1] - bounds[0][1];
    const cx = (bounds[0][0] + bounds[1][0]) / 2, cy = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.min(8, 0.85 / Math.max(dx / 780, dy / 460));
    const translate = [780 / 2 - scale * cx, 460 / 2 - scale * cy];
    d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  }, [pathGen]);

  const resetZoom = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity); };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return countries.filter(c => c.properties.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, countries]);

  const handleSearchSelect = (feat) => {
    setSearchQuery(""); setSearchFocused(false); setSearchIdx(-1);
    flyTo(feat);
    if (compareMode) {
      if (!compareIds.includes(feat.id) && compareIds.length < 3) {
        setCompareIds(p => [...p, feat.id]);
        setCompareLoading(p => ({ ...p, [feat.id]: true }));
        fetchBriefingForCountry(feat.properties.name).then(b => {
          setCompareBriefings(p => ({ ...p, [feat.id]: { ...b, country: feat.properties.name, region: getRegion(feat.id).name, regionColor: getRegion(feat.id).color } }));
        }).catch(() => { }).finally(() => setCompareLoading(p => ({ ...p, [feat.id]: false })));
      }
    } else {
      setSelected(feat.id);
      setLoading(true); setError(null); setBriefing(null);
      fetchBriefingForCountry(feat.properties.name).then(b => {
        const rg = getRegion(feat.id); setBriefing({ ...b, country: feat.properties.name, region: rg.name, regionColor: rg.color });
      }).catch(() => setError("Briefing failed.")).finally(() => setLoading(false));
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchIdx(p => Math.min(p + 1, searchResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchIdx(p => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && searchIdx >= 0 && searchResults[searchIdx]) { e.preventDefault(); handleSearchSelect(searchResults[searchIdx]); }
    else if (e.key === "Escape") { setSearchFocused(false); setSearchQuery(""); }
  };

  const handleClick = (feat) => {
    if (compareMode) {
      if (compareIds.includes(feat.id)) {
        setCompareIds(p => p.filter(x => x !== feat.id));
        setCompareBriefings(p => { const n = { ...p }; delete n[feat.id]; return n; });
      } else if (compareIds.length < 3) {
        setCompareIds(p => [...p, feat.id]);
        setCompareLoading(p => ({ ...p, [feat.id]: true }));
        fetchBriefingForCountry(feat.properties.name).then(b => {
          setCompareBriefings(p => ({ ...p, [feat.id]: { ...b, country: feat.properties.name, region: getRegion(feat.id).name, regionColor: getRegion(feat.id).color } }));
        }).catch(() => { }).finally(() => setCompareLoading(p => ({ ...p, [feat.id]: false })));
      }
    } else {
      setSelected(feat.id); flyTo(feat);
      setLoading(true); setError(null); setBriefing(null);
      fetchBriefingForCountry(feat.properties.name).then(b => {
        const rg = getRegion(feat.id); setBriefing({ ...b, country: feat.properties.name, region: rg.name, regionColor: rg.color });
      }).catch(() => setError("Briefing failed.")).finally(() => setLoading(false));
    }
  };

  const toggleCompare = () => {
    if (compareMode) { setCompareMode(false); setCompareIds([]); setCompareBriefings({}); setCompareLoading({}); }
    else { setCompareMode(true); setSelected(null); setBriefing(null); }
  };

  const stabColor = s => ({ stable: "#22c55e", tensions: "#fbbf24", conflict: "#f97316", crisis: "#ef4444" }[s?.toLowerCase()] || "#64748b");

  // Compute hotspots: countries ranked by combined instability score
  const hotspots = useMemo(() => {
    if (!countries.length) return [];
    return countries
      .map(c => {
        const id = parseInt(c.id);
        const stab = STABILITY_DATA[id] ?? 0;
        const conf = CONFLICT_DATA[id] ?? 0;
        const free = FREEDOM_DATA[id];
        const freeScore = free !== undefined ? Math.max(0, (100 - free) / 25) : 0; // invert: low freedom = high score
        const score = stab * 2 + conf * 2.5 + freeScore;
        return { id: c.id, name: c.properties.name, score, stab, conf, free };
      })
      .filter(h => h.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [countries]);

  const toggleAlliance = (name) => {
    setActiveAlliances(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  };

  const hovFeat = countries.find(c => c.id === hovered);
  const selFeat = countries.find(c => c.id === selected);
  const modes = [{ k: "stability", l: "STABILITY" }, { k: "conflict", l: "CONFLICT" }, { k: "freedom", l: "FREEDOM" }, { k: "gdp", l: "GDP" }, { k: "population", l: "POP" }, { k: "region", l: "REGION" }];
  const showPanel = (!compareMode && selected) || (compareMode && compareIds.length > 0);

  // Get stability color for a country
  const getStabColorForId = (id) => {
    const v = STABILITY_DATA[parseInt(id)];
    return v !== undefined ? STABILITY_COLORS[v] : "#475569";
  };

  const BriefingContent = ({ b, regionColor }) => (
    <div style={{ animation: "fadeUp 0.35s ease" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", background: `${stabColor(b.stability)}10`, border: `1px solid ${stabColor(b.stability)}22`, borderRadius: 3, marginBottom: 10 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: stabColor(b.stability), boxShadow: `0 0 6px ${stabColor(b.stability)}` }} />
        <span style={{ fontSize: 8, fontWeight: 600, color: stabColor(b.stability), letterSpacing: "0.14em" }}>{(b.stability || "UNKNOWN").toUpperCase()}</span>
      </div>
      <p style={{ fontSize: 12, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600, color: "#f1f5f9", margin: "0 0 10px", lineHeight: 1.4 }}>{b.headline}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
        {[{ l: "GOV TYPE", v: b.governmentType }, { l: "LEADER", v: b.leader }, { l: "POPULATION", v: b.population }, { l: "GDP", v: b.gdp }].map((x, i) => (
          <div key={i} style={{ padding: "5px 7px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 3 }}>
            <div style={{ fontSize: 6.5, color: "#3b4a5c", letterSpacing: "0.12em", marginBottom: 1, fontWeight: 600 }}>{x.l}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.3 }}>{x.v || "—"}</div>
          </div>
        ))}
      </div>
      {b.keyFacts?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 7, color: "#3b4a5c", letterSpacing: "0.14em", marginBottom: 4, fontWeight: 600 }}>KEY FACTS</div>
          {b.keyFacts.map((f, i) => (<div key={i} style={{ display: "flex", gap: 6, marginBottom: 3 }}><div style={{ width: 3, height: 3, borderRadius: "50%", background: regionColor, marginTop: 5, flexShrink: 0, opacity: 0.7 }} /><span style={{ fontSize: 9, color: "#8896a7", lineHeight: 1.45 }}>{f}</span></div>))}
        </div>
      )}
      {b.recentNews?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 7, color: "#3b4a5c", letterSpacing: "0.14em", marginBottom: 4, fontWeight: 600 }}>RECENT NEWS</div>
          {b.recentNews.map((n, i) => (<div key={i} style={{ padding: "5px 8px", marginBottom: 2, borderLeft: `2px solid ${regionColor}40`, background: "rgba(255,255,255,0.01)" }}><span style={{ fontSize: 9, color: "#8896a7", lineHeight: 1.45 }}>{n}</span></div>))}
        </div>
      )}
      {b.analysis && (
        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 3 }}>
          <div style={{ fontSize: 7, color: "#3b4a5c", letterSpacing: "0.14em", marginBottom: 3, fontWeight: 600 }}>ANALYSIS</div>
          <p style={{ fontSize: 9.5, color: "#8896a7", lineHeight: 1.55, margin: 0 }}>{b.analysis}</p>
        </div>
      )}
    </div>
  );

  const LoadDots = ({ text }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 0" }}>
      {[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#475569", animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
      <span style={{ color: "#475569", fontSize: 9, letterSpacing: "0.12em" }}>{text}</span>
    </div>
  );

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#070b12", fontFamily: "'IBM Plex Mono',monospace", color: "#e2e8f0", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, opacity: 0.01, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.04) 2px,rgba(255,255,255,0.04) 4px)" }} />

      {/* ── Header ── */}
      <div style={{ position: "relative", zIndex: 20, padding: "10px 18px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,11,18,0.97)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            <h1 style={{ margin: 0, fontSize: 17, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 700, letterSpacing: "-0.03em", color: "#f1f5f9" }}>GEOSCOPE</h1>
            <span style={{ fontSize: 7.5, color: "#22c55e", fontWeight: 600, letterSpacing: "0.15em", padding: "1px 5px", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 3 }}>LIVE</span>
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: "0 1 260px", minWidth: 160 }}>
            <input ref={searchRef} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchIdx(-1); }}
              onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} onKeyDown={handleSearchKeyDown}
              placeholder="Search country..." style={{ width: "100%", padding: "5px 10px 5px 28px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#e2e8f0", fontSize: 10.5, fontFamily: "'IBM Plex Mono',monospace", outline: "none", boxSizing: "border-box" }} />
            <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            {searchFocused && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 3, background: "rgba(10,15,25,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden", zIndex: 100, maxHeight: 260, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                {searchResults.map((feat, i) => {
                  const rg = getRegion(feat.id); const sv = STABILITY_DATA[parseInt(feat.id)];
                  return (
                    <div key={feat.id} onClick={() => handleSearchSelect(feat)}
                      style={{ padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: i === searchIdx ? "rgba(255,255,255,0.06)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: sv !== undefined ? STABILITY_COLORS[sv] : "#475569", flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, color: "#e2e8f0", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500 }}>{feat.properties.name}</span>
                      <span style={{ fontSize: 7.5, color: "#475569", marginLeft: "auto" }}>{rg.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            <button onClick={toggleCompare} style={{
              background: compareMode ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${compareMode ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}`,
              color: compareMode ? "#4ade80" : "#64748b", padding: "4px 9px", borderRadius: 3, cursor: "pointer",
              fontSize: 8.5, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em", fontWeight: 600,
            }}>{compareMode ? "COMPARING" : "COMPARE"}</button>
            <button onClick={resetZoom} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", padding: "4px 9px", borderRadius: 3, cursor: "pointer", fontSize: 8.5, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em" }}>RESET</button>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: 1, marginTop: 7, background: "rgba(255,255,255,0.02)", borderRadius: 4, padding: 2, width: "fit-content" }}>
          {modes.map(m => (
            <button key={m.k} onClick={() => setMode(m.k)} style={{
              padding: "3px 10px", borderRadius: 3, border: "none", cursor: "pointer",
              fontSize: 8, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.1em", fontWeight: 600,
              background: mode === m.k ? "rgba(255,255,255,0.1)" : "transparent",
              color: mode === m.k ? "#f1f5f9" : "#3b4a5c", transition: "all 0.15s",
            }}>{m.l}{(m.k === "gdp" || m.k === "population") && liveDataLoading ? " ⟳" : ""}</button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minHeight: 15 }}>
          {mode === "stability" && STABILITY_LABELS.map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 5, borderRadius: 1, background: STABILITY_COLORS[i] }} />
              <span style={{ fontSize: 7.5, color: "#475569" }}>{l}</span>
            </div>
          ))}
          {mode === "conflict" && CONFLICT_LABELS.map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 10, height: 5, borderRadius: 1, background: CONFLICT_COLORS[i] }} />
              <span style={{ fontSize: 7.5, color: "#475569" }}>{l}</span>
            </div>
          ))}
          {mode === "region" && Object.entries(REGIONS).map(([n, d]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 7, height: 3, borderRadius: 1, background: d.color, opacity: 0.8 }} />
              <span style={{ fontSize: 7, color: "#3b4a5c" }}>{n.toUpperCase()}</span>
            </div>
          ))}
          {["gdp", "population", "freedom"].includes(mode) && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 7.5, color: "#475569" }}>{choroData[mode].label}{liveDataLoading && (mode === "gdp" || mode === "population") ? " (loading...)" : ""}:</span>
              <span style={{ fontSize: 7, color: "#475569" }}>LOW</span>
              <div style={{
                width: 90, height: 4, borderRadius: 3,
                background: mode === "gdp" ? "linear-gradient(90deg,#081d58,#1d91c0,#ffffcc)" :
                  mode === "population" ? "linear-gradient(90deg,#ffffb2,#fd8d3c,#b10026)" :
                    "linear-gradient(90deg,#d73027,#ffffbf,#1a9850)"
              }} />
              <span style={{ fontSize: 7, color: "#475569" }}>HIGH</span>
            </div>
          )}
          {compareMode && <span style={{ fontSize: 7.5, color: "#4ade80", marginLeft: 6 }}>Click up to 3 countries to compare</span>}
        </div>

        {/* Alliance toggles */}
        <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
          <span style={{ fontSize: 7, color: "#2a3544", letterSpacing: "0.12em", fontWeight: 600, marginRight: 3 }}>ALLIANCES</span>
          {Object.entries(ALLIANCES).map(([name, data]) => (
            <button key={name} onClick={() => toggleAlliance(name)} style={{
              padding: "2px 7px", borderRadius: 3, cursor: "pointer",
              fontSize: 7.5, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600,
              background: activeAlliances.includes(name) ? `${data.color}20` : "rgba(255,255,255,0.02)",
              border: `1px solid ${activeAlliances.includes(name) ? `${data.color}50` : "rgba(255,255,255,0.05)"}`,
              color: activeAlliances.includes(name) ? data.color : "#3b4a5c",
              transition: "all 0.15s",
            }}>{name.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ display: "flex", height: "calc(100vh - 100px)", position: "relative", zIndex: 5 }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {!mapReady ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
              <div style={{ width: 22, height: 22, border: "2px solid #1e293b", borderTop: "2px solid #22c55e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em" }}>LOADING GEODATA...</span>
            </div>
          ) : (
            <svg ref={svgRef} viewBox="0 0 780 460" style={{ width: "100%", height: "100%", cursor: "grab" }} preserveAspectRatio="xMidYMid meet">
              <defs><radialGradient id="oc" cx="50%" cy="45%"><stop offset="0%" stopColor="#0d1320" /><stop offset="100%" stopColor="#070b12" /></radialGradient></defs>
              <g ref={gRef}>
                <path d={sphere} fill="url(#oc)" stroke="rgba(34,197,94,0.05)" strokeWidth="0.5" />
                <path d={gratPath} fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.3" />
                {countries.map(feat => {
                  const d = pathGen(feat); if (!d) return null;
                  const isH = hovered === feat.id;
                  const isS = selected === feat.id || (compareMode && compareIds.includes(feat.id));
                  return (<path key={feat.id ?? feat.properties.name} d={d} fill={getFill(feat, isH, isS)} stroke="none" style={{ cursor: "pointer", transition: "fill 0.2s ease" }}
                    onClick={e => { e.stopPropagation(); handleClick(feat); }} onMouseEnter={() => setHovered(feat.id)} onMouseLeave={() => setHovered(null)} />);
                })}
                <path d={borderMeshPath} fill="none" stroke="rgba(200,215,235,0.2)" strokeWidth="0.4" strokeLinejoin="round" style={{ pointerEvents: "none" }} />
                {(compareMode ? compareIds : [selected].filter(Boolean)).map(id => {
                  const feat = countries.find(c => c.id === id); if (!feat) return null;
                  const d = pathGen(feat); if (!d) return null;
                  return <path key={"sel-" + id} d={d} fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeLinejoin="round" style={{ pointerEvents: "none" }} />;
                })}
                {hovered && hovered !== selected && !(compareMode && compareIds.includes(hovered)) && (() => {
                  const feat = countries.find(c => c.id === hovered); if (!feat) return null;
                  const d = pathGen(feat); if (!d) return null;
                  return <path d={d} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" strokeLinejoin="round" style={{ pointerEvents: "none" }} />;
                })()}

                {/* Alliance overlays */}
                {activeAlliances.map(allianceName => {
                  const alliance = ALLIANCES[allianceName];
                  if (!alliance) return null;
                  return alliance.ids.map(numId => {
                    const feat = countries.find(c => parseInt(c.id) === numId);
                    if (!feat) return null;
                    const d = pathGen(feat);
                    if (!d) return null;
                    return (
                      <path key={`${allianceName}-${numId}`} d={d}
                        fill={`${alliance.color}12`}
                        stroke={alliance.color}
                        strokeWidth="1.2"
                        strokeDasharray={alliance.dash}
                        strokeLinejoin="round"
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  });
                })}
              </g>
            </svg>
          )}

          {/* Hover tooltip */}
          {hovFeat && (
            <div style={{ position: "absolute", bottom: 12, left: 12, padding: "5px 10px", background: "rgba(7,11,18,0.93)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 7, animation: "fadeUp 0.1s ease" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: getStabColorForId(hovFeat.id) }} />
              <span style={{ fontSize: 11, color: "#f1f5f9", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600 }}>{hovFeat.properties.name}</span>
              <span style={{ fontSize: 8, color: "#475569" }}>{getRegion(hovFeat.id).name}</span>
              {mode !== "region" && mode !== "stability" && (() => {
                const v = choroData[mode]?.data[parseInt(hovFeat.id)];
                if (v === undefined) return null;
                return <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>{choroData[mode].fmt(v)}</span>;
              })()}
              {(mode === "stability") && (() => {
                const v = STABILITY_DATA[parseInt(hovFeat.id)];
                return <span style={{ fontSize: 8, color: v !== undefined ? STABILITY_COLORS[v] : "#475569", fontWeight: 600 }}>{v !== undefined ? STABILITY_LABELS[v] : "No data"}</span>;
              })()}
            </div>
          )}
          <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 7, color: "#1a2030", letterSpacing: "0.08em" }}>SCROLL TO ZOOM · DRAG TO PAN</div>

          {/* Hotspots Panel */}
          {showHotspots && hotspots.length > 0 && !showPanel && (
            <div style={{ position: "absolute", top: 10, left: 10, width: 210, background: "rgba(7,11,18,0.94)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, backdropFilter: "blur(12px)", overflow: "hidden", animation: "fadeUp 0.3s ease", zIndex: 10, maxHeight: "calc(100% - 20px)", overflowY: "auto" }}>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#f87171", letterSpacing: "0.12em" }}>HOTSPOTS</span>
                </div>
                <button onClick={() => setShowHotspots(false)} style={{ background: "none", border: "none", color: "#3b4a5c", cursor: "pointer", fontSize: 10, padding: 1 }}>×</button>
              </div>
              {hotspots.map((h, i) => {
                const stabVal = h.stab;
                const stabCol = stabVal !== undefined ? STABILITY_COLORS[stabVal] : "#475569";
                return (
                  <div key={h.id}
                    onClick={() => { const feat = countries.find(c => c.id === h.id); if (feat) { handleClick(feat); } }}
                    style={{ padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, borderBottom: "1px solid rgba(255,255,255,0.02)", background: hovered === h.id ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.15s" }}
                    onMouseEnter={() => setHovered(h.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span style={{ fontSize: 9, color: "#3b4a5c", fontWeight: 700, width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: stabCol, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, color: "#e2e8f0", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 1 }}>
                        <span style={{ fontSize: 7, color: stabCol, fontWeight: 600 }}>{STABILITY_LABELS[h.stab] || "?"}</span>
                        <span style={{ fontSize: 7, color: CONFLICT_COLORS[h.conf] || "#475569" }}>{CONFLICT_LABELS[h.conf] || "?"}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 8, color: "#ef4444", fontWeight: 700, opacity: 0.6 }}>{h.score.toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hotspots reopen button */}
          {!showHotspots && !showPanel && (
            <button onClick={() => setShowHotspots(true)} style={{ position: "absolute", top: 10, left: 10, background: "rgba(7,11,18,0.9)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, zIndex: 10 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444" }} />
              <span style={{ fontSize: 8, color: "#f87171", fontWeight: 600, letterSpacing: "0.1em", fontFamily: "'IBM Plex Mono',monospace" }}>HOTSPOTS</span>
            </button>
          )}
        </div>

        {/* ── Side Panel ── */}
        {showPanel && (
          <div style={{ width: compareMode ? Math.min(compareIds.length * 220 + 40, 660) : 360, maxWidth: compareMode ? "70vw" : "42vw", borderLeft: "1px solid rgba(255,255,255,0.04)", background: "rgba(7,11,18,0.98)", overflowY: "auto", animation: "slideIn 0.25s ease", transition: "width 0.3s ease" }}>
            {!compareMode && selected && (
              <>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: getStabColorForId(selected) }} />
                      <h2 style={{ margin: 0, fontSize: 14, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 700, color: "#f1f5f9" }}>{selFeat?.properties.name}</h2>
                    </div>
                    <span style={{ fontSize: 7.5, color: "#3b4a5c", letterSpacing: "0.12em" }}>{getRegion(selected).name.toUpperCase()}</span>
                  </div>
                  <button onClick={() => { setSelected(null); setBriefing(null); setError(null); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", color: "#475569", width: 22, height: 22, borderRadius: 3, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
                <div style={{ padding: "10px 14px" }}>
                  {loading && <LoadDots text="FETCHING INTEL..." />}
                  {error && <p style={{ color: "#ef4444", fontSize: 9 }}>{error}</p>}
                  {briefing && <BriefingContent b={briefing} regionColor={getRegion(selected).color} />}
                </div>
              </>
            )}
            {compareMode && compareIds.length > 0 && (
              <>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#4ade80", letterSpacing: "0.1em" }}>COMPARING {compareIds.length}</span>
                  <button onClick={() => { setCompareIds([]); setCompareBriefings({}); setCompareLoading({}); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", color: "#475569", padding: "2px 7px", borderRadius: 3, cursor: "pointer", fontSize: 7.5, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em" }}>CLEAR</button>
                </div>
                {Object.keys(compareBriefings).length > 0 && (
                  <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 7, color: "#3b4a5c", letterSpacing: "0.14em", marginBottom: 6, fontWeight: 600 }}>QUICK COMPARE</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8.5 }}>
                      <thead><tr>
                        <th style={{ textAlign: "left", padding: "3px 5px", fontSize: 6.5, color: "#3b4a5c", borderBottom: "1px solid rgba(255,255,255,0.04)" }}></th>
                        {compareIds.map(id => { const f = countries.find(c => c.id === id); return <th key={id} style={{ textAlign: "left", padding: "3px 5px", fontSize: 8.5, color: "#e2e8f0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600 }}><div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: getStabColorForId(id) }} />{f?.properties.name}</div></th>; })}
                      </tr></thead>
                      <tbody>
                        {["stability", "governmentType", "leader", "population", "gdp"].map(field => (
                          <tr key={field}>
                            <td style={{ padding: "3px 5px", color: "#3b4a5c", fontSize: 6.5, letterSpacing: "0.1em", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{field === "governmentType" ? "GOV TYPE" : field.toUpperCase()}</td>
                            {compareIds.map(id => { const b = compareBriefings[id]; const val = b?.[field] || "—"; return <td key={id} style={{ padding: "3px 5px", color: field === "stability" ? stabColor(val) : "#8896a7", fontSize: 8.5, borderBottom: "1px solid rgba(255,255,255,0.02)", fontWeight: field === "stability" ? 600 : 400 }}>{field === "stability" ? (val || "—").toUpperCase() : val}</td>; })}
                          </tr>
                        ))}
                        <tr><td style={{ padding: "3px 5px", color: "#3b4a5c", fontSize: 6.5, letterSpacing: "0.1em", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.02)" }}>FREEDOM</td>{compareIds.map(id => { const v = FREEDOM_DATA[parseInt(id)]; return <td key={id} style={{ padding: "3px 5px", color: "#8896a7", fontSize: 8.5, borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{v !== undefined ? `${v}/100` : "—"}</td>; })}</tr>
                        <tr><td style={{ padding: "3px 5px", color: "#3b4a5c", fontSize: 6.5, letterSpacing: "0.1em", fontWeight: 600 }}>CONFLICT</td>{compareIds.map(id => { const v = CONFLICT_DATA[parseInt(id)]; return <td key={id} style={{ padding: "3px 5px", color: v !== undefined ? CONFLICT_COLORS[v] : "#8896a7", fontSize: 8.5, fontWeight: 600 }}>{v !== undefined ? CONFLICT_LABELS[v] : "—"}</td>; })}</tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                  {compareIds.map((id, idx) => {
                    const feat = countries.find(c => c.id === id); const b = compareBriefings[id]; const isL = compareLoading[id]; const rg = getRegion(id);
                    return (
                      <div key={id} style={{ flex: 1, padding: "8px 10px", borderRight: idx < compareIds.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: getStabColorForId(id) }} />
                            <span style={{ fontSize: 10, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 700, color: "#f1f5f9" }}>{feat?.properties.name}</span>
                          </div>
                          <button onClick={() => { setCompareIds(p => p.filter(x => x !== id)); setCompareBriefings(p => { const n = { ...p }; delete n[id]; return n; }); }} style={{ background: "none", border: "none", color: "#3b4a5c", cursor: "pointer", fontSize: 10, padding: 1 }}>×</button>
                        </div>
                        {isL && <LoadDots text="LOADING..." />}
                        {b && <BriefingContent b={b} regionColor={rg.color} />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes slideIn{from{transform:translateX(14px);opacity:0;}to{transform:translateX(0);opacity:1;}}
        @keyframes fadeUp{from{transform:translateY(5px);opacity:0;}to{transform:translateY(0);opacity:1;}}
        @keyframes pulse{0%,80%,100%{opacity:0.3;transform:scale(0.8);}40%{opacity:1;transform:scale(1.2);}}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:3px;}
        input::placeholder{color:#3b4a5c;}
      `}</style>
    </div>
  );
}
