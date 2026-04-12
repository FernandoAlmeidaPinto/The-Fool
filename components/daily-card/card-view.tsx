import { parseAspectRatio } from "@/lib/decks/constants";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

interface DailyCardViewProps {
  name: string;
  imageUrl: string;
  reflection: string | null;
  aspectRatio?: string;
  dateLabel?: string;
  size?: "default" | "compact";
}

export function DailyCardView({
  name,
  imageUrl,
  reflection,
  aspectRatio = "2/3",
  dateLabel,
  size = "default",
}: DailyCardViewProps) {
  const ratio = parseAspectRatio(aspectRatio).cssValue;
  const imageClass = size === "compact" ? "w-full max-w-[160px]" : "w-full max-w-xs";
  const nameClass =
    size === "compact"
      ? "text-center text-xl font-semibold text-foreground"
      : "text-center text-2xl font-semibold text-foreground";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      {dateLabel && (
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      )}
      <div
        className={`${imageClass} overflow-hidden rounded-lg border border-border shadow-sm`}
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
      </div>
      <h1 className={nameClass}>{name}</h1>
      {reflection ? (
        <RichTextViewer content={reflection} className="max-w-none text-center" />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Reflexão em preparação, volte daqui a pouco.
        </p>
      )}
    </div>
  );
}
