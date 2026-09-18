import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Searchable single-select dropdown.
 * props:
 *   options: [{ id, label, description }]
 *   value: currently selected option id (or '')
 *   onChange(option | null) - called when a selection is made or cleared
 *   placeholder, disabled, required
 */
export default function TypeaheadSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  loading = false,
  id,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((opt) => opt.id === value) || null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => opt.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(opt) {
    onChange(opt)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) choose(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const displayValue = open ? query : selected ? selected.label : ''

  return (
    <div className="typeahead" ref={rootRef}>
      <div className="typeahead-control">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder={loading ? 'Loading…' : selected ? selected.description : placeholder}
          disabled={disabled || loading}
          onFocus={() => {
            setOpen(true)
            setHighlighted(0)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlighted(0)
          }}
          onKeyDown={handleKeyDown}
        />
        {selected && !open && (
          <button type="button" className="typeahead-clear" onClick={clear} aria-label="Clear selection">
            ×
          </button>
        )}
        <span className="typeahead-caret" aria-hidden="true">▾</span>
      </div>
      {open && !loading && (
        <ul className="typeahead-menu" role="listbox">
          {filtered.length === 0 && <li className="typeahead-empty">No matches found</li>}
          {filtered.map((opt, i) => (
            <li
              key={opt.id}
              role="option"
              aria-selected={opt.id === value}
              className={`typeahead-option${i === highlighted ? ' highlighted' : ''}${opt.id === value ? ' selected' : ''}`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(opt)}
            >
              <span className="typeahead-option-label">{opt.label}</span>
              {opt.description && <span className="typeahead-option-desc">{opt.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
