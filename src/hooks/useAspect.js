import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Dev-only aspect-ratio override via `?ar=W:H` in the URL.
 *
 * Reads the query param, validates it as two positive integers, and returns
 * the ratio as a CSS `aspect-ratio` value (e.g. "1080 / 520"), or null when
 * absent/invalid so production falls back to natural image sizing.
 *
 * Usage in dev: append ?ar=4:5, ?ar=1080:1920 or ?ar=1080:520 to any page
 * that renders event media to preview how the layout arranges around that
 * image shape. No production UI — the param simply isn't there in real use.
 */
export function useAspectParam() {
  const [params] = useSearchParams()
  return useMemo(() => {
    const raw = params.get('ar')
    if (!raw) return null
    const m = raw.match(/^(\d{1,5})\s*[:/x]\s*(\d{1,5})$/)
    if (!m) return null
    const w = parseInt(m[1], 10)
    const h = parseInt(m[2], 10)
    if (!w || !h) return null
    return `${w} / ${h}`
  }, [params])
}
