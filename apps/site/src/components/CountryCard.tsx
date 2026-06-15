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
			className="glass-card group flex w-full flex-col items-start gap-4 overflow-hidden rounded-2xl p-4 text-left transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-accent/40 active:scale-[0.98] sm:p-5 relative"
		>
			<div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

			<div className="flex w-full items-center justify-between gap-3 relative z-10">
				<span className="shrink-0 text-3xl leading-none transition-transform duration-300 group-hover:scale-110 sm:text-4xl drop-shadow-md">
					{country.emoji}
				</span>
				<span className="max-w-[8rem] truncate rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent backdrop-blur-sm">
					{country.region || country.continent}
				</span>
			</div>

			<div className="w-full min-w-0 relative z-10">
				<h3 className="truncate text-base font-extrabold text-white transition-colors group-hover:text-accent">
					{country.name}
				</h3>
				<p className="mt-1 truncate text-xs font-medium text-text-muted">
					{country.capital}
				</p>
			</div>

			<div className="flex w-full items-center justify-between gap-2 border-t border-white/5 pt-3 relative z-10">
				<div className="flex flex-col">
					<span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Population</span>
					<span className="text-xs font-semibold text-white mt-0.5">{formatCompact(country.population)}</span>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Code</span>
					<span className="shrink-0 font-mono text-xs font-semibold text-accent mt-0.5">{country.iso2}</span>
				</div>
			</div>
		</button>
	)
}
