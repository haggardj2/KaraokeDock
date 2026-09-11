import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ProfileImageEditor.css'

export default function ProfileDialog({ title, onClose, children, className = '' }: {
  title: string
  onClose?: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return createPortal(
    <dialog ref={ref} className={`profile-dialog ${className}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose?.() }}>
      <header className="profile-dialog-header">
        <h3 id={titleId}>{title}</h3>
        {onClose && <button type="button" onClick={onClose} aria-label={`Close ${title}`}>Close</button>}
      </header>
      <div className="profile-dialog-body">{children}</div>
    </dialog>,
    document.body,
  )
}
