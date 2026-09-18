import type { Metadata, Viewport } from "next";
import ErrorBoundary from '@/components/ErrorBoundary';
import "./globals.css";

const SITE_URL = "https://axissai.live";
const SITE_NAME = "AXISS";
const SITE_TITLE = "AXISS — ADVANCED X-INTELLIGENCE SYSTEM ";
const SITE_DESCRIPTION = "The open-source Palantir alternative. Track live aircraft, satellites, and worldwide CCTV cameras on a 3D globe. Run Nmap scans, DNS lookups, WHOIS queries, SSL cert analysis & threat intelligence — all from your browser. 20+ data sources including live earthquake, wildfire, cyber threat and conflict feeds, plus mapped reference data such as nuclear facilities. Free & open source.";

// AXISS Sovereign Slate Favicon (Royal Blue & Teal Crosshair)
const FAVICON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23080A0C'/%3E%3Cpath d='M32 10 L52 50 L42 50 L32 28 L22 50 L12 50 Z' fill='%232D76D6'/%3E%3Ccircle cx='32' cy='34' r='6' fill='none' stroke='%2314B8A6' stroke-width='3'/%3E%3Cpath d='M32 4 L32 14 M32 54 L32 64 M4 32 L14 32 M50 32 L64 32' stroke='%2314B8A6' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";

export const viewport: Viewport = {
  themeColor: "#080A0C", // Updated to Sovereign Slate Void
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | AXISS Intelligence",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    // OSINT Tools - Primary focus
    "OSINT tools", "free OSINT tools", "online OSINT toolkit", "OSINT framework",
    "nmap online", "nmap scanner online", "free nmap scan", "port scanner online",
    "DNS lookup tool", "WHOIS lookup", "reverse DNS", "DNS records",
    "SSL certificate checker", "certificate transparency", "cert lookup",
    "BGP routing lookup", "ASN lookup", "IP geolocation",
    "threat intelligence", "threat intel lookup", "IP reputation check",
    "network reconnaissance", "recon tools", "penetration testing tools",
    "cybersecurity tools", "infosec tools", "security scanner",
    "linux OSINT tools", "kali linux tools online", "OSINT browser tools",
    
    // Intelligence Platform
    "OSINT", "open source intelligence", "intelligence platform", "global intelligence",
    "geospatial intelligence", "GEOINT", "SIGINT", "real-time tracking",
    "palantir alternative", "open source palantir", "intelligence dashboard",
    
    // Tracking & Data
    "flight tracker", "aircraft tracking", "ADS-B tracker", "live flight radar",
    "satellite tracking", "ISS tracker", "space station tracker",
    "CCTV cameras live", "security cameras worldwide", "live cameras",
    "earthquake monitor", "seismic activity", "USGS earthquake",
    "wildfire tracker", "NASA FIRMS", "active fires",
    "nuclear facilities map", "nuclear power plants",
    "severe weather alerts", "weather radar",
    "cyber threats dashboard", "CVE tracker",
    "space weather", "solar storm", "GPS jamming",
    "defense stocks", "commodities tracker",
    
    // Brand
    "axiss", "axissai", "axissai.live",
  ],
  authors: [{ name: "Axiss Project", url: SITE_URL }],
  creator: "Axiss Project",
  publisher: "Axiss Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: FAVICON_SVG, type: "image/svg+xml" }
    ],
    shortcut: FAVICON_SVG,
    apple: [
      { url: FAVICON_SVG, sizes: "180x180" }
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: FAVICON_SVG,
      },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "AXISS — The Open-Source Palantir Alternative | Live Flights, CCTV, Satellites & OSINT Tools",
    description: "Track 10K+ aircraft, 2K satellites & worldwide CCTV on a 3D globe. Run Nmap, DNS, WHOIS & threat intel scans from your browser. 20+ live intelligence feeds. Free. Open source.",
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-image.png`, // Standardized for social media crawlers
        width: 1200,
        height: 630,
        alt: "AXISS — Open Source Intelligence Platform with Live Tracking & OSINT Tools",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🛰️ AXISS — Open Source Palantir Alternative | Live Tracking + OSINT Tools",
    description: "Track 10K+ flights, satellites & CCTV worldwide. Run Nmap, DNS, WHOIS scans from your browser. 20+ live intel feeds. Free & open source.",
    creator: "@simplifaisoul",
    site: "@simplifaisoul",
    images: [`${SITE_URL}/og-image.png`],
  },
  category: "technology",
  classification: "Intelligence & Security",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "AXISS",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#080A0C",
    "msapplication-config": "none",
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AXISS — OSINT Toolkit & Intelligence Platform",
  alternateName: ["AXISS", "AxissAI", "Axiss OSINT"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern web browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Nmap port scanning from the browser — no install required",
    "DNS record lookup (A, AAAA, MX, NS, TXT, CNAME)",
    "WHOIS domain registration lookup",
    "SSL/TLS certificate transparency search",
    "BGP routing & ASN lookup",
    "IP geolocation & threat intelligence",
    "Real-time flight tracking via ADS-B",
    "Satellite tracking (including ISS)",
    "Worldwide CCTV camera monitoring",
    "Earthquake monitoring (USGS live feed)",
    "Wildfire detection (NASA FIRMS satellite data)",
    "Nuclear facility mapping (curated reference list, not a live feed)",
    "Severe weather alerts & tracking",
    "Cyber threat & CVE intelligence",
    "Space weather & solar storm monitoring",
    "GPS jamming detection",
    "Defense & commodity market tracking",
    "SIGINT news aggregation feed",
    "Interactive 3D globe with day/night cycle",
    "Region intelligence dossier reports",
  ],
  screenshot: `${SITE_URL}/og-image.png`,
  author: {
    "@type": "Organization",
    name: "Axiss Project",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Inject AXISS SVG Favicon directly */}
        <link rel="icon" type="image/svg+xml" href={FAVICON_SVG} />
        <link rel="apple-touch-icon" href={FAVICON_SVG} />
        <link rel="canonical" href={SITE_URL} />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className="antialiased">
        <ErrorBoundary name="AXISS Core">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}