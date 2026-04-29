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
			className="gradient-border-hover glow-hover group flex w-full flex-col items-start gap-3 rounded-xl bg-bg-card/60 p-4 text-left backdrop-blur-sm transition-all hover:bg-bg-card/80 hover:-translate-y-0.5 active:scale-[0.97]"
		>
			<div className="flex w-full items-start justify-between">
				<span className="text-4xl leading-none transition-transform group-hover:scale-110">{country.emoji}</span>
				<span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
					{country.region || country.continent}
				</span>
			</div>
			<div>
				<h3 className="text-sm font-semibold text-text group-hover:text-accent transition-colors">{country.name}</h3>
				<p className="mt-0.5 text-xs text-text-muted">{country.capital}</p>
			</div>
			<div className="flex w-full items-center justify-between text-xs text-text-dim">
				<span>Pop. {formatCompact(country.population)}</span>
				<span className="font-mono">{country.iso2}</span>
			</div>
		</button>
	)
}
