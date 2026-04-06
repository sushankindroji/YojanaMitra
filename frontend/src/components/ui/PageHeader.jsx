import { Link } from 'react-router-dom'

export default function PageHeader({ title, subtitle, description, breadcrumb = [], actions }) {
  const helperText = subtitle || description

  return (
    <header className="mb-5">
      {breadcrumb.length ? (
        <nav aria-label="Breadcrumb" className="mb-2 text-body-sm text-stone-500">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {item.to ? <Link to={item.to} className="hover:text-stone-700">{item.label}</Link> : item.label}
              {index < breadcrumb.length - 1 ? <span className="px-1.5">/</span> : null}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 font-medium text-stone-900 md:text-h1">{title}</h1>
          {helperText ? <p className="mt-1 text-body text-stone-600">{helperText}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
