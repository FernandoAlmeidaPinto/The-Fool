/** Strip HTML tags and return plain text. Works server and client side. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
