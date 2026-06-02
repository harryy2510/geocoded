import { formatCompact } from '../lib/format'
import { type Country } from '@geocoded/client'

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
			className="gradient-border-hover glow-hover group flex w-full flex-col items-start gap-3 overflow-hidden rounded-xl bg-bg-card/60 p-3.5 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-bg-card/80 active:scale-[0.97] sm:p-4"
		>
			<div className="flex w-full items-start justify-between gap-2">
				<span className="shrink-0 text-3xl leading-none transition-transform group-hover:scale-110 sm:text-4xl">{country.emoji}</span>
				<span className="max-w-[8rem] truncate rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
					{country.region || country.continent}
				</span>
			</div>
			<div className="w-full min-w-0">
				<h3 className="truncate text-sm font-semibold text-text transition-colors group-hover:text-accent">{country.name}</h3>
				<p className="mt-0.5 truncate text-xs text-text-muted">{country.capital}</p>
			</div>
			<div className="flex w-full items-center justify-between gap-2 text-xs text-text-dim">
				<span>Pop. {formatCompact(country.population)}</span>
				<span className="shrink-0 font-mono">{country.iso2}</span>
			</div>
		</button>
	)
}
