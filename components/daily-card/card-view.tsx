import { parseAspectRatio } from "@/lib/decks/constants";

interface DailyCardViewProps {
  name: string;
  imageUrl: string;
  reflection: string | null;
  aspectRatio?: string;
  dateLabel?: string;
}

export function DailyCardView({
  name,
  imageUrl,
  reflection,
  aspectRatio = "2/3",
  dateLabel,
}: DailyCardViewProps) {
  const ratio = parseAspectRatio(aspectRatio).cssValue;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      {dateLabel && (
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      )}
      <div
        className="w-full max-w-xs overflow-hidden rounded-lg border border-border shadow-sm"
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
      </div>
      <h1 className="text-center text-2xl font-semibold text-foreground">{name}</h1>
      {reflection ? (
        <div
          className="prose prose-sm max-w-none text-center text-foreground"
          dangerouslySetInnerHTML={{ __html: reflection }}
        />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Reflexão em preparação, volte daqui a pouco.
        </p>
      )}
    </div>
  );
}
