import { redirect } from "next/navigation";

/**
 * /api-docs — redirects to the static Swagger UI HTML page.
 * The static page uses the Swagger UI CDN (no React class components),
 * which avoids React 19 StrictMode lifecycle warnings.
 */
export default function ApiDocsPage() {
  redirect("/api-docs.html");
}
