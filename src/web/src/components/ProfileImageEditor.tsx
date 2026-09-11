import { useEffect, useRef, useState } from 'react'
import Croppie from 'croppie'
import 'croppie/croppie.css'
import SingerAvatar, { profileAssetUrl, type ProfileCrop, type SingerProfile } from './SingerAvatar'
import './ProfileImageEditor.css'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load this profile image. Choose another image or try again.'))
    image.src = url
  })
}

async function prepareUpload(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.')
  if (file.size > 30 * 1024 * 1024) throw new Error('Choose an image smaller than 30 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image editing is unavailable in this browser.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not prepare the image.')), 'image/jpeg', 0.88)
    })
    if (blob.size > 2 * 1024 * 1024) throw new Error('This image is too detailed. Choose a smaller image.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

function cropFromEditor(editor: Croppie, width: number, height: number): ProfileCrop {
  const points = editor.get().points?.map(Number)
  if (!points || points.length !== 4 || points.some((point) => !Number.isFinite(point))) {
    throw new Error('Position the image inside the circle before saving.')
  }
  const x = Math.max(0, Math.min(width - 1, points[0]))
  const y = Math.max(0, Math.min(height - 1, points[1]))
  return {
    x: x / width * 100, y: y / height * 100,
    width: Math.max(1, Math.min(width, points[2]) - x) / width * 100,
    height: Math.max(1, Math.min(height, points[3]) - y) / height * 100,
  }
}

export default function ProfileImageEditor({ name, profile, canUpload = true, onSave, onRemove, onCancel }: {
  name: string
  profile: SingerProfile | null
  canUpload?: boolean
  onSave: (crop: ProfileCrop, image?: Blob) => Promise<void>
  onRemove: () => Promise<void>
  onCancel: () => void
}) {
  const mount = useRef<HTMLDivElement>(null)
  const editor = useRef<Croppie | null>(null)
  const dimensions = useRef({ width: 0, height: 0 })
  const draft = useRef<ProfileCrop | null>(profile?.crop ?? null)
  const selection = useRef(0)
  const [upload, setUpload] = useState<Blob>()
  const [url, setUrl] = useState(profileAssetUrl(profile?.imageUrl))
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [boundary, setBoundary] = useState(240)

  useEffect(() => {
    const element = mount.current!
    function resize() {
      setBoundary(Math.floor(Math.max(100, Math.min(300, element.clientWidth, window.innerHeight - 250))))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('resize', resize)
    resize()
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    if (!upload) return
    const objectUrl = URL.createObjectURL(upload)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [upload])

  useEffect(() => {
    let cancelled = false
    let bound = false
    let instance: Croppie | undefined
    const element = mount.current!
    function updateDraft() {
      if (bound && instance) draft.current = cropFromEditor(instance, dimensions.current.width, dimensions.current.height)
    }
    setReady(false)
    if (!url) return
    element.addEventListener('update', updateDraft)
    loadImage(url).then(async (image) => {
      if (cancelled) return
      const width = image.naturalWidth
      const height = image.naturalHeight
      dimensions.current = { width, height }
      const cropSize = Math.min(width, height)
      const crop = draft.current
      const left = crop ? width * crop.x / 100 : (width - cropSize) * (profile?.focusX ?? 50) / 100
      const top = crop ? height * crop.y / 100 : (height - cropSize) * (profile?.focusY ?? 50) / 100
      const viewport = Math.floor(boundary * 0.8)
      instance = new Croppie(element, {
        viewport: { width: viewport, height: viewport, type: 'circle' },
        boundary: { width: boundary, height: boundary },
        enforceBoundary: true, enableZoom: true, mouseWheelZoom: 'ctrl',
        maxZoom: Math.max(3, viewport / cropSize * 8),
      })
      editor.current = instance
      await instance.bind({
        url,
        points: [left, top, left + (crop ? width * crop.width / 100 : cropSize), top + (crop ? height * crop.height / 100 : cropSize)],
      })
      if (!cancelled) {
        bound = true
        element.querySelector('input')?.setAttribute('aria-label', 'Image zoom')
        setReady(true)
      }
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not open the image editor.')
    })
    return () => {
      cancelled = true
      element.removeEventListener('update', updateDraft)
      instance?.destroy()
      editor.current = null
    }
  }, [url, boundary, profile?.focusX, profile?.focusY])

  useEffect(() => () => { selection.current++ }, [])

  async function chooseImage(file?: File) {
    if (!file) return
    const request = ++selection.current
    setBusy(true)
    setError('')
    try {
      const image = await prepareUpload(file)
      if (request === selection.current) {
        setReady(false)
        draft.current = null
        setUpload(image)
      }
    } catch (reason) {
      if (request === selection.current) setError(reason instanceof Error ? reason.message : 'Could not open image.')
    } finally {
      if (request === selection.current) setBusy(false)
    }
  }

  async function save() {
    if (!editor.current || !ready) return
    setBusy(true)
    setError('')
    const request = selection.current
    try {
      const { width, height } = dimensions.current
      await onSave(cropFromEditor(editor.current, width, height), upload)
      if (request === selection.current) onCancel()
    } catch (reason) {
      if (request === selection.current) {
        setError(reason instanceof Error ? reason.message : 'Could not save profile picture.')
        setBusy(false)
      }
    }
  }

  async function remove() {
    if (!window.confirm('Remove this profile picture?')) return
    setBusy(true)
    setError('')
    const request = selection.current
    try {
      await onRemove()
      if (request === selection.current) onCancel()
    } catch (reason) {
      if (request === selection.current) {
        setError(reason instanceof Error ? reason.message : 'Could not remove profile picture.')
        setBusy(false)
      }
    }
  }

  return (
    <div className="profile-image-editor">
      {canUpload ? (
        <label className="profile-file-picker">Choose image
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy}
            onChange={(event) => { void chooseImage(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
        </label>
      ) : <p className="profile-help">Your sign-in provider supplies this image. Drag and zoom to frame your face.</p>}
      {!url && <SingerAvatar name={name} size={80} />}
      <div ref={mount} className={`profile-crop-mount${url ? '' : ' profile-crop-empty'}`} />
      {url && <p className="profile-help">Drag the image and adjust zoom to fit your face in the circle.</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="profile-editor-actions">
        <button type="button" disabled={busy || !ready} onClick={() => void save()}>{busy ? 'Saving...' : 'Save Crop'}</button>
        <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
        {canUpload && profile?.imageUrl && <button type="button" disabled={busy} onClick={() => void remove()}>Remove Image</button>}
      </div>
    </div>
  )
}
