import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pareton: The Intelligence Layer for AI Inference",
    template: "%s | Pareton",
  },
  description:
    "Pareton continuously searches, validates, and deploys the optimal inference configuration for AI workloads — across models, hardware, and serving stacks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider
          theme={{
            defaultTheme: "dark",
            enableSystem: false,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
