const VENUE_NAME = "Ресторан «Vavilon»";
const VENUE_ADDRESS = "Проспект Жибек-Жолу, 402";
const MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2244.905!2d37.6173!3d55.7558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTXCsDQ1JzIwLjkiTiAzN8KwMzcnMDIuMyJF!5e0!3m2!1sru!2sru!4v1680000000000!5m2!1sru!2sru";
const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE_ADDRESS)}`;

export default function MapSection() {
  return (
    <section
      id="map"
      className="py-24 px-6 bg-[#FAF7F2]"
    >
      <div className="max-w-2xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
            Место проведения
          </p>
          <h2
            className="font-serif italic"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
          >
            Как нас найти
          </h2>
          <div className="ornament w-40 mx-auto mt-4 mb-6 text-[#C4A35A] text-sm" aria-hidden="true">
            ✦
          </div>
          <p className="font-serif italic text-xl sm:text-2xl text-[#2C2418] mb-1">
            {VENUE_NAME}
          </p>
          <p className="font-sans text-sm text-[#7A6E60]">{VENUE_ADDRESS}</p>
        </div>

        {/* Map iframe */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E0D8CC] aspect-video w-full">
          <iframe
            src={MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Карта проведения мероприятия"
          />
        </div>

        {/* Open in maps button */}
        <div className="text-center mt-6">
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-sans text-sm uppercase tracking-[0.2em] px-8 py-3 rounded-full border border-[#C4A35A] text-[#C4A35A] hover:bg-[#C4A35A] hover:text-white transition-all duration-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Открыть в картах
          </a>
        </div>
      </div>
    </section>
  );
}
