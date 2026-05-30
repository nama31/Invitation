export default function Schedule() {
  const events = [
    { time: "16:00", title: "Сбор гостей", icon: "✨" },
    { time: "16:30", title: "Начало Тоя", icon: "🪩" },
    { time: "23:00", title: "Окончание вечера", icon: "🍾" },
  ];

  return (
    <section
      id="schedule"
      className="py-24 px-6 bg-[#FAF7F2]"
    >
      <div className="max-w-xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <p className="font-sans text-xs uppercase tracking-[0.3em] text-[#C4A35A] mb-3">
            Программа вечера
          </p>
          <h2
            className="font-serif italic"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#2C2418" }}
          >
            Расписание
          </h2>
          <div className="ornament w-40 mx-auto mt-4 text-[#C4A35A] text-sm" aria-hidden="true">
            ✦
          </div>
        </div>

        {/* Timeline */}
        <ol className="relative">
          {events.map((ev, i) => (
            <li key={ev.time} className="flex gap-5 sm:gap-8 mb-0">
              {/* Left: time + stem */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border border-[#C4A35A] flex items-center justify-center bg-white text-[#C4A35A] text-lg shadow-sm flex-shrink-0">
                  {ev.icon}
                </div>
                {i < events.length - 1 && (
                  <div className="w-px flex-1 bg-gradient-to-b from-[#C4A35A]/40 to-transparent my-1" />
                )}
              </div>

              {/* Right: content */}
              <div className="pb-10">
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#C4A35A] mb-0.5">
                  {ev.time}
                </p>
                <p className="font-serif text-xl sm:text-2xl italic text-[#2C2418]">
                  {ev.title}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
