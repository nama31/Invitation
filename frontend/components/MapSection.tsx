const VENUE_NAME = "Ресторан «Vavilon»";
const VENUE_ADDRESS = "Проспект Жибек-Жолу, 402";
const TWOGIS_LINK =
  "https://2gis.kg/bishkek/firm/70000001019362616/74.585289%2C42.883893?m=74.585902%2C42.879728%2F15.7";

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

        {/* Premium info card with direct 2GIS action button */}
        <div className="bg-white rounded-2xl border border-[#E0D8CC] shadow-md p-8 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-[#2C2418]/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#C4A35A]"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p className="font-serif italic text-lg text-[#2C2418] mb-2">
            Ждем вас на нашем празднике!
          </p>
          <p className="font-sans text-xs text-[#7A6E60] mb-6">
            Нажмите кнопку ниже, чтобы построить маршрут до ресторана в приложении или на сайте 2GIS.
          </p>

          <a
            href={TWOGIS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full font-sans text-sm uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl bg-[#C4A35A] text-white hover:bg-[#B39248] transition-all duration-300 shadow-sm"
          >
            Открыть в 2GIS
          </a>
        </div>
      </div>
    </section>
  );
}
