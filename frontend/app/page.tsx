import { getEventInfo } from "@/lib/guests";
import Hero from "@/components/Hero";
import RsvpSection from "@/components/RsvpSection";
import SeatingChart from "@/components/SeatingChart";
import PhotoGallery from "@/components/PhotoGallery";
import Schedule from "@/components/Schedule";
import MapSection from "@/components/MapSection";
import NavBar from "@/components/NavBar";

// force-dynamic: skip static pre-rendering at build time.
// The page is rendered on the server at request time, when the backend is reachable.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const info = await getEventInfo();

  return (
    <>
      <NavBar />
      <main>
        <Hero info={info} />
        <RsvpSection />
        <SeatingChart />
        <PhotoGallery />
        <Schedule />
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
