import type { Metadata, Viewport } from "next";
import { sql } from "drizzle-orm";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { db } from "@/lib/db";
import { projectStats } from "@/lib/db/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NewsletterModal } from "@/components/newsletter-modal";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-big-shoulders",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets fixed elements extend into the notch/home-indicator areas, which
  // the safe-area insets in globals.css then account for.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F0" },
    { media: "(prefers-color-scheme: dark)", color: "#161110" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TaxOSS · Open Source Tax Software",
    template: "%s · TaxOSS",
  },
  description:
    "A community index of open-source tax software. Live source stats, member reviews, maintainer-claimed pages.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    title: "TaxOSS · Open Source Tax Software",
    description:
      "A community index of open-source tax software. Live source stats, member reviews, maintainer-claimed pages.",
  },
  twitter: {
    card: "summary",
    title: "TaxOSS · Open Source Tax Software",
    description:
      "A community index of open-source tax software. Live source stats, member reviews, maintainer-claimed pages.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let trackedStars = 0;
  try {
    const agg = await db
      .select({ total: sql<number>`coalesce(sum(${projectStats.stars}), 0)` })
      .from(projectStats);
    trackedStars = Number(agg[0]?.total ?? 0);
  } catch {
    // Unmigrated database (static prerender during `next build`): render the
    // shell without the stat instead of failing the build.
  }

  let isAdmin = false;
  try {
    const { userId } = await auth();
    isAdmin = isAdminUser(userId);
  } catch {
    // Prerender without a request scope: render the public header.
  }
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html
        lang="en"
        className={`${bigShoulders.variable} ${jetbrains.variable} ${inter.variable}`}
        // data-theme is set pre-paint by the inline script below; React must
        // not try to reconcile that attribute during hydration.
        suppressHydrationWarning
      >
        <body>
          {/* Runs before first paint: applies the stored theme (or the OS
              preference) so there is never a light flash in dark mode. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                '(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()',
            }}
          />
          {/* One-release cleanup for the removed analytics integration. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                '(function(){try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k==="loss-consent"||k==="loss-internal"||k&&(/^(ph_|__ph_)/).test(k)){localStorage.removeItem(k)}}for(var j=sessionStorage.length-1;j>=0;j--){var s=sessionStorage.key(j);if(s&&(/^(ph_|__ph_)/).test(s)){sessionStorage.removeItem(s)}}var d=location.hostname.replace(/^www\\./,"");document.cookie.split(";").forEach(function(c){var n=c.split("=")[0].trim();if((/^(ph_|__ph_)/).test(n)){document.cookie=n+"=;Max-Age=0;path=/;SameSite=Lax";document.cookie=n+"=;Max-Age=0;path=/;domain=."+d+";SameSite=Lax"}})}catch(e){}})()',
            }}
          />
          <SiteHeader trackedStars={trackedStars} isAdmin={isAdmin} />
          <main>{children}</main>
          <SiteFooter />
          <NewsletterModal />
        </body>
      </html>
    </ClerkProvider>
  );
}
