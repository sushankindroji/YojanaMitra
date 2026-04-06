import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'

export default function Select({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select',
  searchable = false,
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) {
      return options
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(query.trim().toLowerCase())
    )
  }, [options, query, searchable])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectOption = (nextValue) => {
    onChange?.(nextValue)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={clsx('w-full', className)} ref={wrapperRef}>
      {label ? <p className="mb-1.5 text-label font-medium text-stone-700">{label}</p> : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        className={clsx(
          'flex h-10 w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 text-body text-stone-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
          'disabled:cursor-not-allowed disabled:opacity-60'
        )}
      >
        <span className={clsx(!selectedOption && 'text-stone-400')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={clsx('h-4 w-4 text-stone-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          {searchable ? (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mb-2 h-9 w-full rounded-lg border border-stone-300 px-2 text-body focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Search"
            />
          ) : null}

          <div className="max-h-56 overflow-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-body-sm text-stone-500">No options</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={clsx(
                    'flex w-full items-center rounded-lg px-2 py-2 text-left text-body transition-colors',
                    option.value === value ? 'bg-orange-100 text-orange-700' : 'text-stone-700 hover:bg-stone-100'
                  )}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
