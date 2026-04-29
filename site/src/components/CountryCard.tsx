import { formatCompact } from '../lib/format'
import { type Country } from '../lib/api'

export function CountryCard({
	country,
	onClick,
}: {
	country: Country
	onClick?: () => void
}) {
	return (
		<button
			onClick={onClick}
			className="flex w-full flex-col items-start gap-3 rounded-xl border border-border bg-bg-card p-4 text-left transition-all hover:border-border-hover hover:bg-bg-card-hover active:scale-[0.98]"
		>
			<div className="flex w-full items-start justify-between">
				<span className="text-4xl leading-none">{country.emoji}</span>
				<span className="rounded-md bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
					{country.region || country.continent}
				</span>
			</div>
			<div>
				<h3 className="text-sm font-semibold text-text">{country.name}</h3>
				<p className="mt-0.5 text-xs text-text-muted">{country.capital}</p>
			</div>
			<div className="flex w-full items-center justify-between text-xs text-text-dim">
				<span>Pop. {formatCompact(country.population)}</span>
				<span>{country.iso2}</span>
			</div>
		</button>
	)
}
