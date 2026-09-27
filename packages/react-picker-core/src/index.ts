import {
	createElement,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import {
	autoUpdate,
	flip,
	offset,
	shift,
	size,
	useFloating
} from '@floating-ui/react-dom'
import { useCombobox } from 'downshift'
import {
	DEFAULT_PAGE_LIMIT,
	filterOptions,
	resolveOptionLabel,
	resolveOptionValue,
	type DataSource,
	type PageMeta,
	type PageRequest
} from 'picker-core'

export type PickerLabels = {
	label?: string
	placeholder?: string
	searchPlaceholder?: string
	loading?: string
	empty?: string
	clear?: string
}

export type PickerSlots<TOption, TValue extends string> = {
	renderInput?: (props: {
		value: string
		placeholder: string
		disabled: boolean
		required: boolean
		open: boolean
		inputProps: PickerInputAttributes
	}) => ReactNode
	renderOption?: (props: {
		option: TOption
		label: string
		value: TValue
		selected: boolean
		onSelect: () => void
	}) => ReactNode
	renderValue?: (props: { option: TOption | null; label: string }) => ReactNode
	renderEmpty?: (props: { query: string }) => ReactNode
	renderLoading?: () => ReactNode
}

type PickerInputAttributes = Record<string, unknown>

type FloatingStyleTarget = {
	style: {
		maxHeight: string
		width: string
	}
}

type PortalTarget = Parameters<typeof createPortal>[1]

export type PickerFieldProps<
	TOption,
	TValue extends string = string
> = PickerSlots<TOption, TValue> & {
	value?: TValue | null
	defaultValue?: TValue | null
	selectedOption?: TOption | null
	onValueChange?: (value: TValue | null, option: TOption | null) => void
	options?: TOption[]
	dataSource?: DataSource<TOption>
	getOptionLabel?: (option: TOption) => string
	getOptionValue?: (option: TOption) => TValue
	getOptionKeywords?: (option: TOption) => string[]
	name?: string
	disabled?: boolean
	required?: boolean
	limit?: number
	searchDebounceMs?: number
	labels?: PickerLabels
}

export function useControllableState<T>(
	value: T | undefined,
	defaultValue: T,
	onChange?: (value: T) => void
): [T, (value: T) => void] {
	const [internal, setInternal] = useState(defaultValue)
	const controlled = value !== undefined
	return [
		controlled ? value : internal,
		(next) => {
			if (!controlled) setInternal(next)
			onChange?.(next)
		}
	]
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs)
		return () => clearTimeout(timer)
	}, [value, delayMs])
	return debounced
}

export function useAsyncOptions<TOption>(
	source: DataSource<TOption> | undefined,
	request: PageRequest
): {
	options: TOption[]
	meta: PageMeta | null
	loading: boolean
	error: Error | null
	loadMore: () => void
} {
	const [options, setOptions] = useState<TOption[]>([])
	const [meta, setMeta] = useState<PageMeta | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const offsetRef = useRef(0)

	useEffect(() => {
		if (!source) return
		const controller = new AbortController()
		offsetRef.current = 0
		setLoading(true)
		setError(null)
		source({ ...request, offset: 0, signal: controller.signal })
			.then((page) => {
				if (controller.signal.aborted) return
				setOptions(page.data)
				setMeta(page.meta)
			})
			.catch((cause: unknown) => {
				if (!controller.signal.aborted) {
					setError(cause instanceof Error ? cause : new Error(String(cause)))
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false)
			})
		return () => controller.abort()
	}, [source, request.limit, request.query])

	return {
		options,
		meta,
		loading,
		error,
		loadMore: () => {
			if (!source || !meta?.hasMore || loading) return
			offsetRef.current = meta.offset + meta.limit
			setLoading(true)
			source({ ...request, offset: offsetRef.current })
				.then((page) => {
					setOptions((current) => [...current, ...page.data])
					setMeta(page.meta)
				})
				.catch((cause: unknown) =>
					setError(cause instanceof Error ? cause : new Error(String(cause)))
				)
				.finally(() => setLoading(false))
		}
	}
}

export function createHiddenInputValue(
	value: string | null | undefined
): string {
	return value ?? ''
}

function createInitialInputValue<TOption, TValue extends string>(
	props: PickerFieldProps<TOption, TValue>
): string {
	const value = props.value ?? props.defaultValue ?? null
	if (value === null) return ''
	const option =
		props.options?.find(
			(row) => resolveOptionValue(row, props.getOptionValue) === value
		) ?? null
	return option ? resolveOptionLabel(option, props.getOptionLabel) : ''
}

function getPortalTarget(): PortalTarget | null {
	return (
		(globalThis as unknown as { document?: { body?: PortalTarget } }).document
			?.body ?? null
	)
}

function renderClearIcon(): ReactNode {
	return createElement(
		'svg',
		{
			'aria-hidden': true,
			fill: 'none',
			height: 16,
			stroke: 'currentColor',
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			strokeWidth: 2,
			viewBox: '0 0 16 16',
			width: 16
		},
		createElement('path', { d: 'M4 4l8 8' }),
		createElement('path', { d: 'M12 4l-8 8' })
	)
}

function renderChevronIcon(): ReactNode {
	return createElement(
		'svg',
		{
			'aria-hidden': true,
			fill: 'none',
			height: 16,
			stroke: 'currentColor',
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			strokeWidth: 2,
			viewBox: '0 0 16 16',
			width: 16
		},
		createElement('path', { d: 'M4 6l4 4 4-4' })
	)
}

/** Headless-friendly autocomplete combobox used by the React picker packages. */
export function PickerField<TOption, TValue extends string = string>(
	props: PickerFieldProps<TOption, TValue>
) {
	const labels = props.labels ?? {}
	const [value, setValue] = useControllableState<TValue | null>(
		props.value,
		props.defaultValue ?? null
	)
	const [inputValue, setInputValue] = useState(() =>
		createInitialInputValue(props)
	)
	const debouncedQuery = useDebouncedValue(
		inputValue,
		props.searchDebounceMs ?? 250
	)
	const asyncState = useAsyncOptions(props.dataSource, {
		limit: props.limit ?? DEFAULT_PAGE_LIMIT,
		query: debouncedQuery
	})
	const sourceOptions = props.dataSource
		? asyncState.options
		: (props.options ?? [])
	const filteredOptions = useMemo(
		() =>
			props.dataSource
				? sourceOptions
				: filterOptions(sourceOptions, debouncedQuery, {
						getOptionLabel: props.getOptionLabel,
						getOptionKeywords: props.getOptionKeywords
					}),
		[
			sourceOptions,
			debouncedQuery,
			props.dataSource,
			props.getOptionLabel,
			props.getOptionKeywords
		]
	)
	const selected = findSelected(value)
	const selectedLabel = selected
		? resolveOptionLabel(selected, props.getOptionLabel)
		: ''
	const floating = useFloating({
		placement: 'bottom-start',
		strategy: 'fixed',
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(6),
			flip({ padding: 8 }),
			shift({ padding: 8 }),
			size({
				padding: 8,
				apply({ availableHeight, elements, rects }) {
					const floatingElement =
						elements.floating as unknown as FloatingStyleTarget
					floatingElement.style.maxHeight = `${Math.max(
						120,
						Math.min(260, availableHeight)
					)}px`
					floatingElement.style.width = `${rects.reference.width}px`
				}
			})
		]
	})
	const combobox = useCombobox({
		items: filteredOptions,
		itemToString: (option) =>
			option ? resolveOptionLabel(option, props.getOptionLabel) : '',
		itemToKey: (option) =>
			option ? resolveOptionValue(option, props.getOptionValue) : '',
		selectedItem: selected,
		inputValue,
		onInputValueChange: (changes) => {
			setInputValue(changes.inputValue ?? '')
		},
		onSelectedItemChange: (changes) => {
			const next = changes.selectedItem ?? null
			const nextValue = next
				? resolveOptionValue(next, props.getOptionValue)
				: null
			commitValue(nextValue, next)
			setInputValue(next ? resolveOptionLabel(next, props.getOptionLabel) : '')
		}
	})
	const {
		closeMenu,
		getInputProps,
		getItemProps,
		getLabelProps,
		getMenuProps,
		getToggleButtonProps,
		highlightedIndex,
		isOpen,
		selectItem
	} = combobox
	const inputProps = getInputProps({
		disabled: props.disabled,
		required: props.required,
		placeholder: labels.searchPlaceholder ?? labels.placeholder ?? 'Search',
		ref: floating.refs.setReference
	})
	const menuProps = getMenuProps(
		{
			ref: floating.refs.setFloating,
			style: floating.floatingStyles
		},
		{ suppressRefError: true }
	)
	const toggleButtonProps = getToggleButtonProps({
		disabled: props.disabled,
		type: 'button'
	})

	function findSelected(next: TValue | null): TOption | null {
		if (next === null) return null
		const selectedFromOptions =
			sourceOptions.find(
				(option) => resolveOptionValue(option, props.getOptionValue) === next
			) ?? null
		if (selectedFromOptions) return selectedFromOptions
		const selectedOption = props.selectedOption ?? null
		if (
			selectedOption &&
			resolveOptionValue(selectedOption, props.getOptionValue) === next
		) {
			return selectedOption
		}
		return null
	}

	function commitValue(next: TValue | null, option: TOption | null) {
		setValue(next)
		props.onValueChange?.(next, option)
	}

	function getCurrentMenuQuery(): string {
		return inputValue
	}

	function createStatusRow(
		text: ReactNode,
		kind: 'empty' | 'loading'
	): ReactNode {
		return createElement(
			'li',
			{
				role: 'status',
				'data-picker-option': true,
				'data-picker-status': kind
			},
			text
		)
	}

	function clear() {
		commitValue(null, null)
		setInputValue('')
		closeMenu()
	}

	function loadMoreOnScroll(event: {
		currentTarget: {
			scrollTop: number
			clientHeight: number
			scrollHeight: number
		}
	}) {
		const target = event.currentTarget
		const remaining =
			target.scrollHeight - target.scrollTop - target.clientHeight
		if (remaining < 24) asyncState.loadMore()
	}

	const loadingRow =
		props.renderLoading?.() ??
		createStatusRow(labels.loading ?? 'Loading...', 'loading')
	const emptyRow =
		props.renderEmpty?.({ query: getCurrentMenuQuery() }) ??
		createStatusRow(labels.empty ?? 'No results', 'empty')
	const hasOptions = filteredOptions.length > 0
	const showInitialLoading = asyncState.loading && !hasOptions
	const showEmpty = !asyncState.loading && !hasOptions

	const menu = isOpen
		? createElement(
				'ul',
				{
					...menuProps,
					'data-picker-menu': true,
					onScroll: loadMoreOnScroll
				},
				showInitialLoading ? loadingRow : null,
				hasOptions
					? filteredOptions.map((option, index) => {
							const optionValue = resolveOptionValue(
								option,
								props.getOptionValue
							)
							const optionLabel = resolveOptionLabel(
								option,
								props.getOptionLabel
							)
							const selectedOption = optionValue === value
							return createElement(
								'li',
								{
									...getItemProps({
										item: option,
										index
									}),
									key: optionValue,
									'data-picker-option': true,
									'data-picker-highlighted':
										index === highlightedIndex || undefined,
									'aria-selected': selectedOption
								},
								props.renderOption?.({
									option,
									label: optionLabel,
									value: optionValue,
									selected: selectedOption,
									onSelect: () => selectItem(option)
								}) ?? optionLabel
							)
						})
					: null,
				asyncState.loading && hasOptions ? loadingRow : null,
				showEmpty ? emptyRow : null,
				asyncState.meta?.hasMore && !asyncState.loading
					? createElement(
							'li',
							{ role: 'none' },
							createElement(
								'button',
								{ type: 'button', onClick: asyncState.loadMore },
								'Load more'
							)
						)
					: null
			)
		: null
	const portalTarget = getPortalTarget()

	return createElement(
		'div',
		{
			'data-picker-root': true,
			'data-picker-open': isOpen || undefined
		},
		props.name
			? createElement('input', {
					type: 'hidden',
					name: props.name,
					value: createHiddenInputValue(value)
				})
			: null,
		labels.label ? createElement('label', getLabelProps(), labels.label) : null,
		createElement(
			'div',
			{ 'data-picker-combobox': true },
			props.renderInput?.({
				value: inputValue,
				placeholder: labels.searchPlaceholder ?? labels.placeholder ?? 'Search',
				disabled: props.disabled ?? false,
				required: props.required ?? false,
				open: isOpen,
				inputProps: inputProps as PickerInputAttributes
			}) ??
				createElement('input', {
					...inputProps,
					'data-picker-input': true,
					type: 'text'
				}),
			value && !props.disabled
				? createElement(
						'button',
						{
							type: 'button',
							'data-picker-clear': true,
							'aria-label': labels.clear ?? 'Clear',
							onClick: clear
						},
						renderClearIcon()
					)
				: null,
			createElement(
				'button',
				{
					...toggleButtonProps,
					'data-picker-trigger': true,
					'aria-label': isOpen ? 'Close options' : 'Open options'
				},
				renderChevronIcon()
			)
		),
		props.renderValue?.({ option: selected, label: selectedLabel }) ?? null,
		menu && portalTarget ? createPortal(menu, portalTarget) : menu
	)
}
