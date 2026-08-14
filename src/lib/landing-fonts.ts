import { Azeret_Mono, Bricolage_Grotesque, Fraunces } from "next/font/google";

export const landingSans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  display: "swap",
});

export const landingSerif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-landing-serif",
  display: "swap",
});

export const landingMono = Azeret_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-landing-mono",
  display: "swap",
});

export const landingFontClassName = [
  landingSans.variable,
  landingSerif.variable,
  landingMono.variable,
].join(" ");
