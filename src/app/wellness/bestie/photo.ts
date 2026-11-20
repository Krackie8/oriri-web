/**
 * A Completion photo is redrawn on a canvas before it leaves her phone (#72, DEC-003). Redrawing
 * drops every bit of metadata, location included, and turns an iPhone HEIC photo into a JPEG.
 * The edge function strips metadata again as a second lock.
 */
export const MAX_PHOTO_SIDE = 1600
const QUALITY = 0.85

/** The size to redraw at: the longer side at most 1600 px, the shape kept. */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** The chosen photo as a clean JPEG, or null if the browser cannot read it. */
export async function toCleanJpeg(file: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  } catch {
    return null
  }
}
