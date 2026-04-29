export function StatsCard({
	icon,
	label,
	value,
	delay = 0,
}: {
	icon: string
	label: string
	value: string
	delay?: number
}) {
	return (
		<div
			className="animate-fade-in rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-border-hover hover:bg-bg-card-hover"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="mb-2 text-2xl">{icon}</div>
			<div className="text-2xl font-bold tracking-tight text-text">{value}</div>
			<div className="mt-0.5 text-sm text-text-muted">{label}</div>
		</div>
	)
}
