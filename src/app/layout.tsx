import type { Metadata } from "next"
import { Montserrat, Poppins, Antonio } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { BUSINESS } from "@/lib/constants"

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
})

const poppins = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const antonio = Antonio({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} | Concesionaria Multimarca en ${BUSINESS.city}`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.description,
  keywords: [
    "motos",
    "concesionaria",
    "Bahia Blanca",
    "motocicletas",
    "cuatriciclos",
    "UTV",
    "motos de agua",
    "financiacion motos",
    "servicio tecnico motos",
    "Motos Fernandez",
    "Honda",
    "Yamaha",
    "Suzuki",
    "Kawasaki",
  ],
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: process.env.NEXT_PUBLIC_URL || "https://motosfernandez.com.ar",
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} | Concesionaria Multimarca en ${BUSINESS.city}`,
    description: BUSINESS.description,
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${BUSINESS.name} - Concesionaria Multimarca en ${BUSINESS.city}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} | Concesionaria Multimarca en ${BUSINESS.city}`,
    description: BUSINESS.description,
    images: ["/images/og-image.jpg"],
  },
  icons: {
    icon: "/images/favicon.svg",
    shortcut: "/images/favicon.svg",
    apple: "/images/favicon.svg",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL || "https://motosfernandez.com.ar"
  ),
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MotorcycleDealer",
  name: BUSINESS.name,
  description: BUSINESS.description,
  url: process.env.NEXT_PUBLIC_URL || "https://motosfernandez.com.ar",
  logo: `${process.env.NEXT_PUBLIC_URL || "https://motosfernandez.com.ar"}/images/logo-negro.svg`,
  image: `${process.env.NEXT_PUBLIC_URL || "https://motosfernandez.com.ar"}/images/logo-negro.svg`,
  telephone: BUSINESS.phone,
  email: BUSINESS.email,
  foundingDate: String(BUSINESS.yearFounded),
  address: {
    "@type": "PostalAddress",
    streetAddress: "Brown 1052",
    addressLocality: BUSINESS.city,
    addressRegion: BUSINESS.province,
    postalCode: BUSINESS.postalCode,
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS.coordinates.lat,
    longitude: BUSINESS.coordinates.lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:30",
      closes: "12:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "15:30",
      closes: "19:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
  sameAs: [BUSINESS.instagramUrl],
  priceRange: "$$",
  areaServed: {
    "@type": "City",
    name: BUSINESS.city,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es-AR"
      className={`${montserrat.variable} ${poppins.variable} ${antonio.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body">
        {children}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  )
}
