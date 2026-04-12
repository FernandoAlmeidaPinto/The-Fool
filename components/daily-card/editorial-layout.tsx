import Link from "next/link";

interface EditorialLayoutProps {
  name: string;
  imageUrl: string;
  aspectRatio: string; // CSS aspect-ratio value, e.g. "2/3"
  dateWeekday: string;
  dateDayMonth: string;
  dateYear: string;
  pullQuote: string | null;
  firstLetter: string | null;
  bodyWithoutFirstLetter: string | null;
}

/**
 * Editorial composition of the daily card for the dedicated
 * `/carta-do-dia` page. Pure presentation: receives already-processed
 * strings and renders the grid, typography, decorative block, and
 * footer link. No IO, no authorization, no data fetching.
 */
export function EditorialLayout({
  name,
  imageUrl,
  aspectRatio,
  dateWeekday,
  dateDayMonth,
  dateYear,
  pullQuote,
  firstLetter,
  bodyWithoutFirstLetter,
}: EditorialLayoutProps) {
  const hasReflection = pullQuote !== null;
  const hasBody =
    firstLetter !== null &&
    bodyWithoutFirstLetter !== null &&
    bodyWithoutFirstLetter.length > 0;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {/* Date block */}
      <header className="mb-10 text-center font-display">
        <p className="text-sm italic text-muted-foreground">{dateWeekday}</p>
        <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-foreground sm:text-[32px]">
          {dateDayMonth}
        </p>
        <p className="mt-1 text-sm tracking-[0.3em] text-muted-foreground">
          {dateYear}
        </p>
      </header>

      {/* Two-column grid (stacks on mobile) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Card column */}
        <div className="lg:col-span-5 lg:self-start">
          <div className="relative mx-auto w-full max-w-[192px]">
            {/* Decorative block — absolute, insets handle the offset */}
            <div
              aria-hidden
              className="absolute"
            />
            <div
              className="relative z-10 overflow-hidden rounded-lg border border-border shadow-sm"
              style={{ aspectRatio }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Text column */}
        <div className="lg:col-span-6 lg:self-start">
          <h1 className="font-display text-4xl font-normal text-foreground sm:text-5xl">
            {name}
          </h1>
          <div className="mt-3 h-px w-[60px] bg-border/60" />

          {hasReflection ? (
            <>
              <p className="mt-6 font-display text-xl italic leading-relaxed text-foreground">
                {pullQuote}
              </p>

              {hasBody && (
                <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-foreground/90">
                  <span
                    className="daily-card-dropcap float-left mr-2 mt-1.5 font-display text-[60px] leading-[0.85] text-foreground"
                    aria-hidden
                  >
                    {firstLetter}
                  </span>
                  <span className="sr-only">{firstLetter}</span>
                  {bodyWithoutFirstLetter}
                </p>
              )}
            </>
          ) : (
            <p className="mt-6 text-sm italic text-muted-foreground">
              Reflexão em preparação, volte daqui a pouco.
            </p>
          )}
        </div>
      </div>

      {/* Footer link */}
      <footer className="mt-16 text-center">
        <Link
          href="/carta-do-dia/historico"
          className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          — Ver histórico —
        </Link>
      </footer>
    </article>
  );
}
