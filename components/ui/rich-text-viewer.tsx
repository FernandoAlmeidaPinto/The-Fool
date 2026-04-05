import { sanitizeHtml } from "@/lib/html/sanitize";
import { cn } from "@/lib/utils";

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  if (!content) return null;

  // Plain text detection: Tiptap always wraps in <p>
  if (!content.startsWith("<p>") && !content.startsWith("<p ")) {
    return (
      <p className={cn("whitespace-pre-wrap", className)}>{content}</p>
    );
  }

  const clean = sanitizeHtml(content);

  return (
    <div
      className={cn(
        "[&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_p:last-child]:mb-0",
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
