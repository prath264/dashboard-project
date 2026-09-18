export function Alert({ type = 'success', message, onDismiss }) {
  if (!message) return null
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {message}
      {onDismiss && (
        <button type="button" className="btn-secondary btn-sm alert-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  )
}
