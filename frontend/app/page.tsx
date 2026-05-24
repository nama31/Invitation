import { getEventInfo } from "@/lib/guests";
import Hero from "@/components/Hero";
import RsvpSection from "@/components/RsvpSection";
import Schedule from "@/components/Schedule";
import DressCode from "@/components/DressCode";
import MapSection from "@/components/MapSection";
import NavBar from "@/components/NavBar";

export const revalidate = 3600; // Re-fetch event info at most every hour

export default async function HomePage() {
  const info = await getEventInfo();

  return (
    <>
      <NavBar />
      <main>
        <Hero info={info} />
        <RsvpSection />
        <Schedule />
        <DressCode />
        <MapSection />
      </main>

      {/* Footer */}
      <footer className="py-10 text-center bg-[#2C2418]">
        <p className="font-serif italic text-[#C4A35A] text-lg mb-1">{info.name}</p>
        <p className="font-sans text-xs text-[#7A6E60] uppercase tracking-widest">
          {info.venue} · {new Date(info.date).getFullYear()}
        </p>
      </footer>
    </>
  );
}
