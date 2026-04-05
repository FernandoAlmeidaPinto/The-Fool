import sanitize from "sanitize-html";

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: ["p", "strong", "em", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  transformTags: {
    a: sanitize.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, SANITIZE_OPTIONS);
}
