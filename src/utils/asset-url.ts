/**
 * Build a URL for a file in `public/` that works both at the site root and
 * under a sub-path such as GitHub Pages' `/cathlab-trainer/`.
 *
 * @param path File path relative to `public/` (a leading slash is ignored).
 * @param base Site base path; defaults to Vite's configured `BASE_URL`.
 */
export function assetUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  const cleanPath = path.replace(/^\/+/, '')
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  return `${cleanBase}${cleanPath}`
}
