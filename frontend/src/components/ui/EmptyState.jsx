import Button from './Button'

export default function EmptyState({
  title = 'Nothing here yet',
  message,
  illustration,
  ctaLabel,
  onCta,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-stone-100 text-h1 leading-[4rem]">
        {illustration || '📭'}
      </div>
      <h3 className="text-h3 font-medium text-stone-900">{title}</h3>
      {message ? <p className="mx-auto mt-2 max-w-md text-body-sm text-stone-600">{message}</p> : null}
      {ctaLabel && onCta ? (
        <Button className="mt-5" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  )
}
