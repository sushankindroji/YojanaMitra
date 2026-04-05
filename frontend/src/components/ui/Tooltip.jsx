export default function Tooltip({ content, children, position = 'top' }) {
  const positionClasses = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  }

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-40 hidden whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block ${positionClasses[position]}`}
      >
        {content}
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-stone-900" aria-hidden="true" />
      </span>
    </span>
  )
}
