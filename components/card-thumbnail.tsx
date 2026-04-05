import Link from "next/link";

interface CardThumbnailProps {
  href: string;
  title: string;
  image: string | null;
  aspectRatio?: string; // CSS aspect-ratio value, e.g. "2/3", "3/4", "1/1"
}

export function CardThumbnail({ href, title, image, aspectRatio = "2/3" }: CardThumbnailProps) {
  return (
    <Link href={href} className="group flex flex-col gap-2">
      <div
        className="max-h-96 relative overflow-hidden rounded-md"
        style={{ aspectRatio }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="object-contain w-full h-full opacity-80 transition-transform group-hover:opacity-100"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-center leading-tight group-hover:underline">
        {title}
      </span>
    </Link>
  );
}
