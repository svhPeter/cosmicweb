import type { CelestialBody } from "@/data-platform/schemas/body";
import { CelestialBodySchema } from "@/data-platform/schemas/body";

/**
 * Cosmos' canonical celestial-body dataset.
 *
 * Numbers are drawn from the NASA/JPL fact sheets
 * (https://nssdc.gsfc.nasa.gov/planetary/factsheet/) and rounded to values
 * students and curious readers expect to see. They are stable enough to
 * embed in a product without external fetches.
 *
 * `render` fields are the tunable knobs used by /explore. They are not to
 * scale (a true-scale solar system is unreadable on a screen) — they are a
 * carefully composed visual rendering of relative differences.
 */
const rawBodies: CelestialBody[] = [
  {
    id: "sun",
    slug: "sun",
    name: "The Sun",
    type: "star",
    tagline: "A G-type main-sequence star at the gravitational center of our Solar System.",
    description:
      "The Sun is a nearly spherical ball of hot plasma, powered by the fusion of hydrogen into helium in its core. It accounts for 99.86% of the Solar System's mass and sets the tempo for all orbital motion inside it.",
    facts: [
      "Surface temperature is about 5,500°C; the core reaches roughly 15 million°C.",
      "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
      "The Sun converts ~600 million tonnes of hydrogen into helium every second.",
    ],
    physical: {
      radiusKm: 695_700,
      massKg: 1.989e30,
      gravityMs2: 274,
      meanTemperatureC: 5505,
      axialTiltDeg: 7.25,
    },
    orbit: {
      dayLengthHours: 25.05 * 24,
      yearLengthDays: 0,
      distanceFromSunKm: 0,
      orbitalEccentricity: 0,
    },
    atmosphere: {
      summary:
        "The Sun has no solid surface; its visible 'surface' is the photosphere, wrapped by a chromosphere and extended corona.",
      composition: ["Hydrogen (~73%)", "Helium (~25%)", "Oxygen, carbon, iron, others (~2%)"],
    },
    moons: { count: 0, notable: [] },
    comparisonToEarth: {
      gravity: 27.9,
      radius: 109,
      mass: 333_000,
      dayLength: 25.05,
      yearLength: 0,
    },
    render: {
      colorHex: "#ffcf7a",
      emissiveHex: "#ffb84d",
      relativeSize: 6.2,
      orbitAu: 0,
      ringed: false,
    },
    sources: [
      { label: "NASA Sun fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html" },
      { label: "NASA Science — Our Sun", url: "https://science.nasa.gov/sun/" },
    ],
  },
  {
    id: "mercury",
    slug: "mercury",
    name: "Mercury",
    type: "planet",
    tagline: "The smallest planet, closest to the Sun, with extreme temperature swings.",
    description:
      "Mercury is a small, rocky world with almost no atmosphere. Its heavily cratered surface records billions of years of impacts, and because it rotates slowly its dayside and nightside experience some of the harshest temperature contrasts in the Solar System.",
    facts: [
      "A solar day on Mercury (sunrise to sunrise) lasts about 176 Earth days.",
      "Daytime highs reach ~430°C; nighttime lows drop below −180°C.",
      "Despite being the closest planet to the Sun, ice is believed to exist in permanently shadowed polar craters.",
    ],
    physical: {
      radiusKm: 2_439.7,
      massKg: 3.3011e23,
      gravityMs2: 3.7,
      meanTemperatureC: 167,
      axialTiltDeg: 0.034,
    },
    orbit: {
      dayLengthHours: 4222.6,
      yearLengthDays: 88,
      distanceFromSunKm: 57_900_000,
      orbitalEccentricity: 0.2056,
    },
    atmosphere: {
      summary: "A tenuous exosphere, not a true atmosphere — atoms knocked off the surface by solar wind and impacts.",
      composition: ["Oxygen", "Sodium", "Hydrogen", "Helium", "Potassium"],
    },
    moons: { count: 0, notable: [] },
    comparisonToEarth: {
      gravity: 0.38,
      radius: 0.383,
      mass: 0.055,
      dayLength: 175.94,
      yearLength: 0.241,
    },
    render: {
      colorHex: "#9a8f85",
      relativeSize: 0.45,
      orbitAu: 1.1,
      orbitalPeriodYears: 0.241,
      ringed: false,
    },
    orbitalElements: {
      semiMajorAxisAu: 0.38709927,
      eccentricity: 0.20563593,
      inclinationDeg: 7.00497902,
      longitudeAscendingNodeDeg: 48.33076593,
      argumentOfPeriapsisDeg: 29.12703035,
      meanLongitudeAtEpochDeg: 252.25032350,
      orbitalPeriodYears: 0.2408467,
    },
    sources: [
      { label: "NASA Mercury fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html" },
    ],
  },
  {
    id: "venus",
    slug: "venus",
    name: "Venus",
    type: "planet",
    tagline: "A shrouded, volcanic world with a runaway greenhouse atmosphere.",
    description:
      "Venus is often called Earth's sister in size, but its environment is alien: a thick carbon dioxide atmosphere, clouds of sulphuric acid, and surface pressures comparable to being a kilometre underwater on Earth. Its surface hides under a permanent veil of bright cloud.",
    facts: [
      "Surface pressure is about 92 times that of Earth at sea level.",
      "Venus rotates backwards compared to most planets — the Sun rises in the west.",
      "A day on Venus (243 Earth days) is longer than its year (225 Earth days).",
    ],
    physical: {
      radiusKm: 6_051.8,
      massKg: 4.8675e24,
      gravityMs2: 8.87,
      meanTemperatureC: 464,
      axialTiltDeg: 177.36,
    },
    orbit: {
      dayLengthHours: 5832.5,
      yearLengthDays: 224.7,
      distanceFromSunKm: 108_200_000,
      orbitalEccentricity: 0.0068,
    },
    atmosphere: {
      summary:
        "A dense CO₂ atmosphere with clouds of sulphuric acid, producing a runaway greenhouse effect hotter than Mercury's dayside.",
      composition: ["Carbon dioxide (~96%)", "Nitrogen (~3.5%)", "Trace sulphuric acid, water vapour"],
    },
    moons: { count: 0, notable: [] },
    comparisonToEarth: {
      gravity: 0.904,
      radius: 0.949,
      mass: 0.815,
      dayLength: 243.02,
      yearLength: 0.615,
    },
    render: {
      colorHex: "#e5c07b",
      relativeSize: 0.92,
      orbitAu: 1.6,
      orbitalPeriodYears: 0.615,
      ringed: false,
    },
    orbitalElements: {
      semiMajorAxisAu: 0.72333566,
      eccentricity: 0.00677672,
      inclinationDeg: 3.39467605,
      longitudeAscendingNodeDeg: 76.67984255,
      argumentOfPeriapsisDeg: 54.92262463,
      meanLongitudeAtEpochDeg: 181.97909950,
      orbitalPeriodYears: 0.61519726,
    },
    sources: [
      { label: "NASA Venus fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html" },
    ],
  },
  {
    id: "earth",
    slug: "earth",
    name: "Earth",
    type: "planet",
    tagline: "The only known world with active plate tectonics, liquid oceans, and life.",
    description:
      "Earth is the reference point for everything we know about habitable worlds. Its magnetic field, liquid water, tectonic activity, and nitrogen-rich atmosphere combine to produce the dynamic biosphere we live in.",
    facts: [
      "Earth's atmosphere extinguishes most small meteoroids — only the largest reach the ground.",
      "Our Moon is large relative to Earth, and it stabilises our axial tilt over long timescales.",
      "Earth's magnetic field deflects most of the solar wind, protecting the atmosphere.",
    ],
    physical: {
      radiusKm: 6_371,
      massKg: 5.972e24,
      gravityMs2: 9.81,
      meanTemperatureC: 15,
      axialTiltDeg: 23.44,
    },
    orbit: {
      dayLengthHours: 23.934,
      yearLengthDays: 365.25,
      distanceFromSunKm: 149_600_000,
      orbitalEccentricity: 0.0167,
    },
    atmosphere: {
      summary: "A nitrogen-oxygen atmosphere with trace argon, carbon dioxide and water vapour.",
      composition: ["Nitrogen (~78%)", "Oxygen (~21%)", "Argon (~0.93%)", "CO₂ + trace gases"],
    },
    moons: { count: 1, notable: ["The Moon"] },
    comparisonToEarth: { gravity: 1, radius: 1, mass: 1, dayLength: 1, yearLength: 1 },
    render: {
      colorHex: "#4a90e2",
      relativeSize: 1,
      orbitAu: 2.1,
      orbitalPeriodYears: 1,
      ringed: false,
    },
    orbitalElements: {
      semiMajorAxisAu: 1.00000261,
      eccentricity: 0.01671123,
      inclinationDeg: 0.00001531,
      longitudeAscendingNodeDeg: -5.11260389,
      argumentOfPeriapsisDeg: 114.20783,
      meanLongitudeAtEpochDeg: 100.46457166,
      orbitalPeriodYears: 1.0000174,
    },
    sources: [
      { label: "NASA Earth fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html" },
    ],
  },
  {
    id: "mars",
    slug: "mars",
    name: "Mars",
    type: "planet",
    tagline: "The rusty, cold world with the Solar System's tallest volcano and longest canyon.",
    description:
      "Mars is a half-size cousin of Earth, with seasons, polar ice caps, and striking geological features like Olympus Mons and Valles Marineris. Today its atmosphere is thin and cold, but evidence points to a wetter, warmer past.",
    facts: [
      "Olympus Mons is roughly 22 km tall — about 2.5× the height of Everest from sea level.",
      "Mars has two tiny moons: Phobos and Deimos, likely captured asteroids.",
      "Dust storms on Mars can grow to cover the entire planet.",
    ],
    physical: {
      radiusKm: 3_389.5,
      massKg: 6.4171e23,
      gravityMs2: 3.71,
      meanTemperatureC: -65,
      axialTiltDeg: 25.19,
    },
    orbit: {
      dayLengthHours: 24.623,
      yearLengthDays: 687,
      distanceFromSunKm: 227_900_000,
      orbitalEccentricity: 0.0934,
    },
    atmosphere: {
      summary: "A thin CO₂ atmosphere less than 1% of Earth's surface pressure.",
      composition: ["Carbon dioxide (~95%)", "Nitrogen (~2.8%)", "Argon (~2%)", "Trace oxygen, water vapour"],
    },
    moons: { count: 2, notable: ["Phobos", "Deimos"] },
    comparisonToEarth: {
      gravity: 0.379,
      radius: 0.532,
      mass: 0.107,
      dayLength: 1.029,
      yearLength: 1.881,
    },
    render: {
      colorHex: "#c96a4a",
      relativeSize: 0.55,
      orbitAu: 2.8,
      orbitalPeriodYears: 1.881,
      ringed: false,
    },
    orbitalElements: {
      semiMajorAxisAu: 1.52371034,
      eccentricity: 0.09339410,
      inclinationDeg: 1.84969142,
      longitudeAscendingNodeDeg: 49.55953891,
      argumentOfPeriapsisDeg: 286.50210,
      meanLongitudeAtEpochDeg: -4.55343205,
      orbitalPeriodYears: 1.8808476,
    },
    sources: [
      { label: "NASA Mars fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html" },
    ],
  },
  {
    id: "jupiter",
    slug: "jupiter",
    name: "Jupiter",
    type: "planet",
    tagline: "The largest planet — a gas giant whose storms have raged for centuries.",
    description:
      "Jupiter is a gas giant more than 300 times Earth's mass, with cloud bands driven by powerful jet streams and a centuries-old storm — the Great Red Spot — visible through small telescopes. Its gravitational influence has shaped the architecture of the Solar System.",
    facts: [
      "Jupiter's day is the shortest of any planet: just under 10 hours.",
      "The Great Red Spot is a storm larger than Earth that has been observed for over 300 years.",
      "Jupiter has at least 95 known moons, including the four Galilean moons.",
    ],
    physical: {
      radiusKm: 69_911,
      massKg: 1.898e27,
      gravityMs2: 24.79,
      meanTemperatureC: -110,
      axialTiltDeg: 3.13,
    },
    orbit: {
      dayLengthHours: 9.925,
      yearLengthDays: 4_331,
      distanceFromSunKm: 778_600_000,
      orbitalEccentricity: 0.0489,
    },
    atmosphere: {
      summary:
        "A deep hydrogen/helium atmosphere banded by jet streams, with colorful cloud decks of ammonia and ammonium hydrosulphide.",
      composition: ["Hydrogen (~90%)", "Helium (~10%)", "Trace methane, ammonia, water"],
    },
    moons: { count: 95, notable: ["Io", "Europa", "Ganymede", "Callisto"] },
    comparisonToEarth: {
      gravity: 2.528,
      radius: 10.97,
      mass: 317.8,
      dayLength: 0.414,
      yearLength: 11.862,
    },
    render: {
      colorHex: "#d5a875",
      bandHex: "#b4855a",
      relativeSize: 3.4,
      orbitAu: 4.4,
      orbitalPeriodYears: 11.862,
      ringed: true,
      ringInnerHex: "#a78865",
      ringOuterHex: "#d6b789",
    },
    orbitalElements: {
      semiMajorAxisAu: 5.20288700,
      eccentricity: 0.04838624,
      inclinationDeg: 1.30439695,
      longitudeAscendingNodeDeg: 100.47390909,
      argumentOfPeriapsisDeg: 273.86740,
      meanLongitudeAtEpochDeg: 34.39644051,
      orbitalPeriodYears: 11.862615,
    },
    sources: [
      { label: "NASA Jupiter fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html" },
    ],
  },
  {
    id: "saturn",
    slug: "saturn",
    name: "Saturn",
    type: "planet",
    tagline: "The ringed jewel of the Solar System.",
    description:
      "Saturn is the second-largest planet, famous for its bright ring system of water-ice particles. A gas giant with a layered hydrogen/helium envelope, it hosts a remarkable family of moons — including methane-rich Titan and ice-fountain Enceladus.",
    facts: [
      "Saturn's rings are enormously wide (~282,000 km) but surprisingly thin (often <1 km thick).",
      "Titan is the only moon with a substantial atmosphere and surface liquids (methane lakes).",
      "Saturn is less dense than water — in a big enough bathtub, it would float.",
    ],
    physical: {
      radiusKm: 58_232,
      massKg: 5.683e26,
      gravityMs2: 10.44,
      meanTemperatureC: -140,
      axialTiltDeg: 26.73,
    },
    orbit: {
      dayLengthHours: 10.656,
      yearLengthDays: 10_747,
      distanceFromSunKm: 1_433_500_000,
      orbitalEccentricity: 0.0565,
    },
    atmosphere: {
      summary: "Hydrogen and helium with trace hydrocarbons and ammonia ices giving it a pale butter hue.",
      composition: ["Hydrogen (~96%)", "Helium (~3%)", "Methane, ammonia (trace)"],
    },
    moons: { count: 146, notable: ["Titan", "Enceladus", "Mimas", "Iapetus"] },
    comparisonToEarth: {
      gravity: 1.065,
      radius: 9.14,
      mass: 95.2,
      dayLength: 0.444,
      yearLength: 29.457,
    },
    render: {
      colorHex: "#e3c38a",
      bandHex: "#c4a06b",
      relativeSize: 2.8,
      orbitAu: 5.6,
      orbitalPeriodYears: 29.457,
      ringed: true,
      ringInnerHex: "#e0c89b",
      ringOuterHex: "#b6966b",
    },
    orbitalElements: {
      semiMajorAxisAu: 9.53667594,
      eccentricity: 0.05386179,
      inclinationDeg: 2.48599187,
      longitudeAscendingNodeDeg: 113.66242448,
      argumentOfPeriapsisDeg: 339.39164,
      meanLongitudeAtEpochDeg: 49.95424423,
      orbitalPeriodYears: 29.447498,
    },
    sources: [
      { label: "NASA Saturn fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html" },
    ],
  },
  {
    id: "uranus",
    slug: "uranus",
    name: "Uranus",
    type: "planet",
    tagline: "An ice giant tipped onto its side, orbiting the Sun at an extreme axial tilt.",
    description:
      "Uranus is an ice giant with a pale cyan color caused by methane in its atmosphere. It is tipped almost perpendicular to its orbit, giving it extreme decades-long seasons, and it hosts a faint ring system of its own.",
    facts: [
      "Uranus' axis is tilted about 98° — it effectively rolls around the Sun.",
      "It was the first planet discovered with a telescope (William Herschel, 1781).",
      "Each pole experiences roughly 42 Earth-years of continuous sunlight, then 42 of darkness.",
    ],
    physical: {
      radiusKm: 25_362,
      massKg: 8.681e25,
      gravityMs2: 8.69,
      meanTemperatureC: -195,
      axialTiltDeg: 97.77,
    },
    orbit: {
      dayLengthHours: 17.24,
      yearLengthDays: 30_589,
      distanceFromSunKm: 2_872_500_000,
      orbitalEccentricity: 0.0457,
    },
    atmosphere: {
      summary: "Hydrogen, helium and methane; methane absorbs red light, giving Uranus its cyan tint.",
      composition: ["Hydrogen (~83%)", "Helium (~15%)", "Methane (~2%)"],
    },
    moons: { count: 28, notable: ["Titania", "Oberon", "Miranda", "Ariel", "Umbriel"] },
    comparisonToEarth: {
      gravity: 0.886,
      radius: 3.981,
      mass: 14.54,
      dayLength: 0.72,
      yearLength: 83.747,
    },
    render: {
      colorHex: "#8ed6d3",
      bandHex: "#6fbeb9",
      relativeSize: 1.9,
      orbitAu: 6.6,
      orbitalPeriodYears: 83.747,
      ringed: true,
      ringInnerHex: "#a8d7d4",
      ringOuterHex: "#6ea7a4",
    },
    orbitalElements: {
      semiMajorAxisAu: 19.18916464,
      eccentricity: 0.04725744,
      inclinationDeg: 0.77263783,
      longitudeAscendingNodeDeg: 74.01692503,
      argumentOfPeriapsisDeg: 96.99886,
      meanLongitudeAtEpochDeg: 313.23810451,
      orbitalPeriodYears: 84.016846,
    },
    sources: [
      { label: "NASA Uranus fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html" },
    ],
  },
  {
    id: "neptune",
    slug: "neptune",
    name: "Neptune",
    type: "planet",
    tagline: "A deep-blue ice giant with the strongest winds in the Solar System.",
    description:
      "Neptune is a cold, windy ice giant with supersonic storms and fast-changing dark spots. The most distant planet, it was predicted by mathematics before being seen — a triumph of Newtonian gravitation applied to the motion of Uranus.",
    facts: [
      "Winds on Neptune can reach 2,100 km/h — faster than the speed of sound on Earth.",
      "Neptune has only completed a single orbit around the Sun since its discovery in 1846.",
      "Its largest moon, Triton, orbits backwards and is likely a captured Kuiper Belt object.",
    ],
    physical: {
      radiusKm: 24_622,
      massKg: 1.024e26,
      gravityMs2: 11.15,
      meanTemperatureC: -200,
      axialTiltDeg: 28.32,
    },
    orbit: {
      dayLengthHours: 16.11,
      yearLengthDays: 60_190,
      distanceFromSunKm: 4_495_100_000,
      orbitalEccentricity: 0.0113,
    },
    atmosphere: {
      summary: "Hydrogen, helium and methane with trace hydrocarbons; methane gives Neptune its deep blue.",
      composition: ["Hydrogen (~80%)", "Helium (~19%)", "Methane (~1.5%)"],
    },
    moons: { count: 16, notable: ["Triton", "Nereid", "Proteus"] },
    comparisonToEarth: {
      gravity: 1.137,
      radius: 3.865,
      mass: 17.15,
      dayLength: 0.673,
      yearLength: 164.79,
    },
    render: {
      colorHex: "#3c63b0",
      bandHex: "#2a4a8a",
      relativeSize: 1.85,
      orbitAu: 7.4,
      orbitalPeriodYears: 164.79,
      ringed: true,
      ringInnerHex: "#4f76b8",
      ringOuterHex: "#2e4c86",
    },
    orbitalElements: {
      semiMajorAxisAu: 30.06992276,
      eccentricity: 0.00859048,
      inclinationDeg: 1.77004347,
      longitudeAscendingNodeDeg: 131.78422574,
      argumentOfPeriapsisDeg: 273.18053,
      meanLongitudeAtEpochDeg: -55.12002969,
      orbitalPeriodYears: 164.79132,
    },
    sources: [
      { label: "NASA Neptune fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html" },
    ],
  },
  {
    id: "pluto",
    slug: "pluto",
    name: "Pluto",
    type: "dwarf_planet",
    tagline: "A small, icy world in the Kuiper Belt — reclassified as a dwarf planet in 2006.",
    description:
      "Pluto is a cold, rocky-icy world with a surprisingly diverse surface: nitrogen glaciers, mountains of water ice, and a thin seasonal atmosphere. NASA's New Horizons flyby in 2015 turned it from a distant dot into a richly detailed world.",
    facts: [
      "Pluto and its large moon Charon are nearly a binary system — their common center of gravity lies outside Pluto.",
      "Pluto's surface hosts nitrogen-ice glaciers that slowly flow like those on Earth.",
      "It has five known moons: Charon, Styx, Nix, Kerberos, and Hydra.",
    ],
    physical: {
      radiusKm: 1_188.3,
      massKg: 1.303e22,
      gravityMs2: 0.62,
      meanTemperatureC: -225,
      axialTiltDeg: 122.53,
    },
    orbit: {
      dayLengthHours: 153.3,
      yearLengthDays: 90_560,
      distanceFromSunKm: 5_906_400_000,
      orbitalEccentricity: 0.2488,
    },
    atmosphere: {
      summary: "A thin, seasonal atmosphere that expands when Pluto nears the Sun and partially freezes when it recedes.",
      composition: ["Nitrogen", "Methane", "Carbon monoxide"],
    },
    moons: { count: 5, notable: ["Charon", "Styx", "Nix", "Kerberos", "Hydra"] },
    comparisonToEarth: {
      gravity: 0.063,
      radius: 0.186,
      mass: 0.0022,
      dayLength: 6.387,
      yearLength: 247.94,
    },
    render: {
      colorHex: "#c8a67e",
      relativeSize: 0.18,
      orbitAu: 8.1,
      orbitalPeriodYears: 247.94,
      ringed: false,
    },
    orbitalElements: {
      semiMajorAxisAu: 39.48211675,
      eccentricity: 0.24882730,
      inclinationDeg: 17.14001206,
      longitudeAscendingNodeDeg: 110.30393684,
      argumentOfPeriapsisDeg: 113.76328,
      meanLongitudeAtEpochDeg: 238.92903833,
      orbitalPeriodYears: 247.92065,
    },
    sources: [
      { label: "NASA Pluto fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html" },
      { label: "NASA — New Horizons", url: "https://science.nasa.gov/mission/new-horizons/" },
    ],
  },
];

/** Validate once at module load to catch typos early. */
const parsed = rawBodies.map((b) => CelestialBodySchema.parse(b));

export const bodies: CelestialBody[] = parsed;
export const planets: CelestialBody[] = parsed.filter((b) => b.type === "planet" || b.type === "dwarf_planet");

export const bodiesById = Object.fromEntries(parsed.map((b) => [b.id, b])) as Record<string, CelestialBody>;
export const bodiesBySlug = Object.fromEntries(parsed.map((b) => [b.slug, b])) as Record<string, CelestialBody>;

export function getBodyBySlug(slug: string): CelestialBody | undefined {
  return bodiesBySlug[slug];
}

export function getBodyById(id: string): CelestialBody | undefined {
  return bodiesById[id];
}
