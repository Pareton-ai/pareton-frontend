import { Brief } from "@/components/landing/brief";
import { Buyers } from "@/components/landing/buyers";
import { Close } from "@/components/landing/close";
import { Colophon } from "@/components/landing/colophon";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Laws } from "@/components/landing/laws";
import { Method } from "@/components/landing/method";
import { landingFontClassName } from "@/lib/landing-fonts";
import "@/components/landing/landing.css";

export default function Home() {
  return (
    <div className={`landing ${landingFontClassName}`}>
      <div className="fiber" aria-hidden="true" />
      <Header />
      <main id="top">
        <Hero />
        <Colophon />
        <Brief />
        <Method />
        <Laws />
        <Buyers />
        <Close />
      </main>
      <Footer />
    </div>
  );
}
