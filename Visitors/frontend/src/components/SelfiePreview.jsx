import { useState } from 'react'

export function SelfiePreview({ src, name, size = 'admin' }) {
  const [expanded, setExpanded] = useState(false)

  if (!src) {
    return (
      <div className={`selfie-preview ${size} empty-selfie`}>
        <span>No selfie</span>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className={`selfie-preview ${size}`}
        onClick={() => setExpanded(true)}
        aria-label={`View ${name} selfie`}
      >
        <img src={src} alt={`${name} selfie`} />
        <span className="selfie-preview-label">Click to enlarge</span>
      </button>

      {expanded && (
        <div className="selfie-modal" onClick={() => setExpanded(false)} role="dialog">
          <div className="selfie-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={src} alt={`${name} selfie`} />
            <button type="button" className="btn-secondary btn-sm" onClick={() => setExpanded(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
