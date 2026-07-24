export default function PlacementStats() {
  const stats = [
    {
      value: "75%",
      description: (
        <>
          Offers landed{" "}
          <span className="font-medium text-[#37FF00]">off-campus</span>,
          <br />
          on merit alone
        </>
      ),
    },
    {
      value: "21.19 LPA",
      description: (
        <>
          Our members secured an average CTC of{" "}
          <span className="font-medium text-[#37FF00]">21.19 LPA</span>, with a{" "}
          <span className="font-medium text-[#37FF00]">16 LPA median</span>{" "}
          package.
        </>
      ),
    },
    {
      value: "25+",
      description: (
        <>
          Companies including{" "}
          <span className="font-medium text-[#37FF00]">
            Microsoft, Oracle, Visa, CRED, Nasdaq
          </span>
          , Atlan, New Relic, Check Point Software, and many fast-growing
          startups.
        </>
      ),
    },
  ];

  return (
    <section className="relative w-full px-4 py-20 sm:px-6 sm:py-24 md:px-8 md:py-28 lg:px-12 lg:py-32">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="mx-auto max-w-4xl text-center text-4xl font-bold leading-tight tracking-tight text-white sm:text-2xl md:text-3xl lg:text-5xl">
          Developers{" "}
          <span className="text-[#37FF00]">
            hired by 25+
          </span>{" "}
          companies
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:mt-20 sm:gap-8 md:mt-24 md:grid-cols-3">
          {stats.map((stat, index) => (
            <article
              key={stat.value}
              className="
                group relative flex min-h-[240px] overflow-hidden
                rounded-3xl border border-white/15
                bg-white/[0.07] p-6
                shadow-[0_20px_60px_rgba(0,0,0,0.35)]
                backdrop-blur-2xl
                transition-all duration-300
                hover:-translate-y-1
                hover:border-[#37FF00]/40
                hover:bg-white/[0.1]
                sm:min-h-[260px] sm:p-8
                md:min-h-[300px]
              "
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

              <div
                className={`
                  pointer-events-none absolute h-40 w-40 rounded-full
                  bg-[#37FF00]/15 blur-3xl
                  transition-transform duration-500
                  group-hover:scale-125
                  ${
                    index === 0
                      ? "-left-16 -top-16"
                      : index === 1
                        ? "-right-16 top-1/3"
                        : "-bottom-16 left-1/3"
                  }
                `}
              />

              <div className="relative z-10 flex w-full flex-col items-center justify-center text-center">
                <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {stat.value}
                </h3>

                <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70 sm:text-base">
                  {stat.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}