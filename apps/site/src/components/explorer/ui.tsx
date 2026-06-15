import { type ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="mt-6">
			<h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/35">
				{title}
			</h4>
			{children}
		</div>
	)
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="min-w-0 bg-black px-5 py-4">
			<div className="text-[10px] font-bold uppercase tracking-widest text-white/35">
				{label}
			</div>
			<div className="mt-2 break-words text-base font-semibold text-white">{value}</div>
		</div>
	)
}

export function FactGrid({ children }: { children: ReactNode }) {
	return (
		<div className="grid grid-cols-1 gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
			{children}
		</div>
	)
}

export function Badge({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
	if (onClick) {
		return (
			<button
				onClick={onClick}
				className="inline-flex max-w-full cursor-pointer items-center border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white/70 transition-colors hover:border-white hover:bg-white/10 hover:text-white"
			>
				{children}
			</button>
		)
	}
	return (
		<span className="inline-flex max-w-full items-center border border-white/10 bg-white/[0.02] px-2.5 py-1 text-xs font-semibold text-white/60">
			{children}
		</span>
	)
}

// Shared overlay drawer shell. Matches CountryDetail's structure (sticky header,
// scroll body, backdrop close) but with the explicit white-opacity tokens.
export function DetailDrawer({
	icon,
	title,
	subtitle,
	onClose,
	children,
}: {
	icon?: ReactNode
	title: string
	subtitle?: ReactNode
	onClose: () => void
	children: ReactNode
}) {
	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
			<div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
			<div className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-y-auto border border-white/15 bg-black/90 shadow-2xl backdrop-blur-3xl">
				<div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-black/80 px-6 py-6 backdrop-blur-xl sm:px-8">
					<div className="flex min-w-0 items-center gap-4">
						{icon ? <span className="shrink-0 text-4xl drop-shadow-md">{icon}</span> : null}
						<div className="min-w-0">
							<h2 className="truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
								{title}
							</h2>
							{subtitle ? (
								<p className="mt-1 truncate text-sm font-medium text-white/55">{subtitle}</p>
							) : null}
						</div>
					</div>
					<button
						onClick={onClose}
						aria-label="Close details"
						className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60 transition-all hover:bg-white/10 hover:text-white"
					>
						<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div className="p-6 sm:p-8">{children}</div>
			</div>
		</div>
	)
}
