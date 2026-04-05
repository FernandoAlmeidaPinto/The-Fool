import Link from "next/link";

interface CardThumbnailProps {
  href: string;
  title: string;
  image: string | null;
}

export function CardThumbnail({ href, title, image }: CardThumbnailProps) {
  return (
    <Link href={href} className="group flex flex-col gap-2">
      <div className="aspect-2/3 max-h-96 relative overflow-hidden rounded-md border border-border bg-muted">
        {image ? (
          <img
            src={image}
            alt={title}
            className="object-contain w-full h-full transition-transform group-hover:scale-105"
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
