const palette = [
  { hex: "#D4B97A", name: "Золото", ru: "Золотой" },
  { hex: "#C4A8A8", name: "Пудра", ru: "Пудровый" },
  { hex: "#8FAE9A", name: "Шалфей", ru: "Шалфей" },
  { hex: "#B8CAD0", name: "Лазурь", ru: "Лазурный" },
];

export default function DressCode() {
  return (
    <section
      id="dresscode"
      className="py-24 px-6"
      style={{ background: "linear-gradient(180deg, #F2EBE0 0%, #FAF7F2 100%)" }}
    >
      <div className="max-w-xl mx-auto text-center">
        {/* Heading */}
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
          Дресс-код
        </p>
        <h2
          className="font-serif italic mb-3"
          style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
        >
          Палитра цветов
        </h2>
        <p className="font-sans text-sm text-[#7A6E60] mb-8 max-w-xs mx-auto leading-relaxed">
          Мы будем рады, если ваш образ отразит нашу цветовую гамму 💛
        </p>
        <div className="ornament w-40 mx-auto mb-10 text-[#C4A35A] text-sm" aria-hidden="true">
          ✦
        </div>

        {/* Swatches */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {palette.map((c) => (
            <div key={c.hex} className="flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-md border-4 border-white ring-1 ring-[#E0D8CC]"
                style={{ backgroundColor: c.hex }}
                aria-label={c.ru}
              />
              <p className="font-serif italic text-lg text-[#2C2418]">{c.ru}</p>
              <p className="font-sans text-xs tracking-widest text-[#7A6E60] uppercase">
                {c.hex}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
