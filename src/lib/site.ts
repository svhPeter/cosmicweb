export const site = {
  name: "Cosmos",
  tagline: "A premium interactive space exploration and learning platform.",
  description:
    "Explore the Solar System in 3D, study planets with NASA-grounded data, and compare size, gravity and time across worlds. An editorial platform for space lovers, students, and the endlessly curious.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://cosmos.example",
  twitter: "@cosmos",
  ogImage: "/og/cosmos.png",
} as const;

export const navigation = [
  { href: "/explore", label: "Explore" },
  { href: "/planets", label: "Planets" },
  { href: "/compare", label: "Compare" },
  { href: "/today", label: "Today" },
  { href: "/about", label: "About" },
] as const;

export const footerLinks = [
  {
    heading: "Platform",
    links: [
      { href: "/explore", label: "3D Solar System" },
      { href: "/planets", label: "Planets" },
      { href: "/compare", label: "Compare" },
      { href: "/today", label: "Today in Space" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { href: "/about", label: "About Cosmos" },
      { href: "/about#methodology", label: "Methodology" },
      { href: "/about#sources", label: "Sources" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { href: "/api/v1/bodies", label: "Bodies API" },
      { href: "/api/v1/apod", label: "APOD API" },
      { href: "/api/v1/launches", label: "Launches API" },
      { href: "/api/v1/news", label: "News API" },
    ],
  },
] as const;
