// Lightweight client-side compression/resize before profile photo upload.
// Keeps aspect ratio, caps the longest edge, and re-encodes as JPEG at a
// reasonable quality — avoids unnecessarily large uploads without adding a
// new dependency (uses the built-in Canvas API).

const MAX_EDGE = 1280   // longest side, px — plenty for a profile photo
const JPEG_QUALITY = 0.82

export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file // fallback: upload original if canvas unsupported

    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file

    const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    console.log('PHOTO COMPRESS:', file.size, '->', compressed.size, 'bytes', `(${targetW}x${targetH})`)
    return compressed.size < file.size ? compressed : file
  } catch (e) {
    console.error('PHOTO COMPRESS ERROR:', (e as any)?.message)
    return file // never block upload if compression fails
  }
}
