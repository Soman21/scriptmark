// Loads an image, applies rotation (0/90/180/270) then crop (a rectangle
// expressed as fractions 0..1 of the ROTATED image, matching what the
// lecturer actually saw and dragged over in the viewer), and returns the
// result as a PNG Blob ready to upload.
export function bakePageEdits(imageUrl, rotation = 0, crop = null) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const rotated = document.createElement('canvas')
        const swap = rotation === 90 || rotation === 270
        rotated.width = swap ? img.naturalHeight : img.naturalWidth
        rotated.height = swap ? img.naturalWidth : img.naturalHeight

        const rctx = rotated.getContext('2d')
        rctx.translate(rotated.width / 2, rotated.height / 2)
        rctx.rotate((rotation * Math.PI) / 180)
        rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

        let source = rotated
        if (crop) {
          const cropped = document.createElement('canvas')
          const sx = crop.x * rotated.width
          const sy = crop.y * rotated.height
          const sw = crop.w * rotated.width
          const sh = crop.h * rotated.height
          cropped.width = Math.max(1, Math.round(sw))
          cropped.height = Math.max(1, Math.round(sh))
          cropped.getContext('2d').drawImage(rotated, sx, sy, sw, sh, 0, 0, cropped.width, cropped.height)
          source = cropped
        }

        source.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not render the edited page.'))
        }, 'image/png')
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Could not load the page image to apply edits.'))
    img.src = imageUrl
  })
}