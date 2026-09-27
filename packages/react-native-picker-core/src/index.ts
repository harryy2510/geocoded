import {
	createElement,
	useEffect,
	useMemo,
	useState,
	type ComponentType,
	type ReactNode
} from 'react'
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

export type StyleProp<T> = T | T[] | false | null | undefined
export type ViewStyle = Record<string, unknown>
export type TextStyle = Record<string, unknown>

type NativePrimitive = ComponentType<Record<string, unknown>>

type NativePrimitives = {
	ActivityIndicator: NativePrimitive
	FlatList: NativePrimitive
	Modal: NativePrimitive
	Pressable: NativePrimitive
	SafeAreaView: NativePrimitive
	Text: NativePrimitive
	TextInput: NativePrimitive
	View: NativePrimitive
}

export type NativePickerState<TOption, TValue extends string = string> = {
	value: TValue | null
	query: string
	options: TOption[]
	selectedOption: TOption | null
	selectedLabel: string
	highlightedIndex: number
	loading: boolean
	error: Error | null
	meta: PageMeta | null
	open: boolean
	setOpen: (open: boolean) => void
	setQuery: (query: string) => void
	select: (option: TOption) => void
	clear: () => void
	loadMore: () => void
}

export type NativePickerProps<TOption, TValue extends string = string> = {
	value?: TValue | null
	defaultValue?: TValue | null
	selectedOption?: TOption | null
	onValueChange?: (value: TValue | null, option: TOption | null) => void
	options?: TOption[]
	dataSource?: DataSource<TOption>
	getOptionLabel?: (option: TOption) => string
	getOptionValue?: (option: TOption) => TValue
	getOptionKeywords?: (option: TOption) => string[]
	limit?: number
	searchDebounceMs?: number
}

export type NativePickerPresentation = 'auto' | 'bottom-sheet' | 'full-screen'

export type NativePickerLabels = {
	label?: string
	placeholder?: string
	searchPlaceholder?: string
	empty?: string
	loading?: string
	clear?: string
	close?: string
}

export type NativePickerStyles = {
	root?: StyleProp<ViewStyle>
	label?: StyleProp<TextStyle>
	trigger?: StyleProp<ViewStyle>
	triggerText?: StyleProp<TextStyle>
	clearButton?: StyleProp<ViewStyle>
	clearText?: StyleProp<TextStyle>
	backdrop?: StyleProp<ViewStyle>
	sheet?: StyleProp<ViewStyle>
	fullScreen?: StyleProp<ViewStyle>
	header?: StyleProp<ViewStyle>
	title?: StyleProp<TextStyle>
	closeButton?: StyleProp<ViewStyle>
	closeText?: StyleProp<TextStyle>
	searchInput?: StyleProp<TextStyle>
	list?: StyleProp<ViewStyle>
	option?: StyleProp<ViewStyle>
	selectedOption?: StyleProp<ViewStyle>
	optionText?: StyleProp<TextStyle>
	selectedOptionText?: StyleProp<TextStyle>
	status?: StyleProp<ViewStyle>
	statusText?: StyleProp<TextStyle>
}

export type NativePickerRenderOptionProps<
	TOption,
	TValue extends string = string
> = {
	option: TOption
	label: string
	value: TValue
	selected: boolean
	onSelect: () => void
}

export type NativePickerComponentProps<
	TOption,
	TValue extends string = string
> = NativePickerProps<TOption, TValue> & {
	disabled?: boolean
	presentation?: NativePickerPresentation
	fullScreenThreshold?: number
	labels?: NativePickerLabels
	styles?: NativePickerStyles
	keyExtractor?: (option: TOption, index: number) => string
	renderOption?: (
		props: NativePickerRenderOptionProps<TOption, TValue>
	) => ReactNode
	renderValue?: (props: {
		option: TOption | null
		label: string
		value: TValue | null
	}) => ReactNode
	renderEmpty?: (props: { query: string }) => ReactNode
	renderLoading?: () => ReactNode
}

export type NativePickerA11y = {
	accessibilityLabel: string
	accessibilityHint?: string
	accessibilityState: {
		disabled?: boolean
		expanded?: boolean
		selected?: boolean
	}
}

export function useNativePickerField<TOption, TValue extends string = string>(
	props: NativePickerProps<TOption, TValue>
): NativePickerState<TOption, TValue> {
	const [internalValue, setInternalValue] = useState<TValue | null>(
		props.defaultValue ?? null
	)
	const [query, setQueryState] = useState('')
	const [remoteOptions, setRemoteOptions] = useState<TOption[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const [meta, setMeta] = useState<PageMeta | null>(null)
	const value = props.value === undefined ? internalValue : props.value
	const debouncedQuery = useDebouncedValue(query, props.searchDebounceMs ?? 250)
	const sourceOptions = props.dataSource ? remoteOptions : (props.options ?? [])

	const options = useMemo(() => {
		return filterOptions(sourceOptions, debouncedQuery, {
			getOptionLabel: props.getOptionLabel,
			getOptionKeywords: props.getOptionKeywords
		})
	}, [
		sourceOptions,
		props.getOptionLabel,
		props.getOptionKeywords,
		debouncedQuery
	])
	const selectedItem =
		value === null
			? null
			: (sourceOptions.find(
					(option) => resolveOptionValue(option, props.getOptionValue) === value
				) ??
				props.selectedOption ??
				null)
	const combobox = useCombobox({
		items: options,
		itemToString: (option) =>
			option ? resolveOptionLabel(option, props.getOptionLabel) : '',
		itemToKey: (option) =>
			option ? resolveOptionValue(option, props.getOptionValue) : '',
		selectedItem,
		inputValue: query,
		onInputValueChange: (changes) => {
			setQueryState(changes.inputValue ?? '')
		},
		onSelectedItemChange: (changes) => {
			const option = changes.selectedItem ?? null
			const next = option
				? resolveOptionValue(option, props.getOptionValue)
				: null
			commitValue(next, option)
		}
	})

	useEffect(() => {
		if (!props.dataSource) return
		const controller = new AbortController()
		let cancelled = false
		setLoading(true)
		setError(null)
		props
			.dataSource({
				limit: props.limit ?? DEFAULT_PAGE_LIMIT,
				offset: 0,
				query: debouncedQuery,
				signal: controller.signal
			} satisfies PageRequest)
			.then((page) => {
				if (cancelled) return
				setRemoteOptions(page.data)
				setMeta(page.meta)
			})
			.catch((cause: unknown) => {
				if (!cancelled && !controller.signal.aborted) {
					setError(cause instanceof Error ? cause : new Error(String(cause)))
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
			controller.abort()
		}
	}, [props.dataSource, props.limit, debouncedQuery])

	function loadMore() {
		if (!props.dataSource || !meta?.hasMore || loading) return
		setLoading(true)
		props
			.dataSource({
				limit: meta.limit,
				offset: meta.offset + meta.limit,
				cursor: meta.cursor,
				query: debouncedQuery
			})
			.then((page) => {
				setRemoteOptions((current) => [...current, ...page.data])
				setMeta(page.meta)
			})
			.catch((cause: unknown) =>
				setError(cause instanceof Error ? cause : new Error(String(cause)))
			)
			.finally(() => setLoading(false))
	}

	function commitValue(next: TValue | null, option: TOption | null) {
		if (props.value === undefined) setInternalValue(next)
		props.onValueChange?.(next, option)
	}

	function setOpen(next: boolean) {
		if (next) {
			setQueryState('')
			combobox.setInputValue('')
			combobox.openMenu()
		} else {
			combobox.closeMenu()
		}
	}

	function setQuery(next: string) {
		combobox.setInputValue(next)
		combobox.openMenu()
	}

	function select(option: TOption) {
		combobox.selectItem(option)
		combobox.closeMenu()
	}

	function clear() {
		commitValue(null, null)
		setQueryState('')
		combobox.setInputValue('')
		combobox.closeMenu()
	}

	const selectedLabel = selectedItem
		? resolveOptionLabel(selectedItem, props.getOptionLabel)
		: ''

	return {
		value,
		query,
		options,
		selectedOption: selectedItem,
		selectedLabel,
		highlightedIndex: combobox.highlightedIndex,
		loading,
		error,
		meta,
		open: combobox.isOpen,
		setOpen,
		setQuery,
		select,
		clear,
		loadMore
	}
}

/** Modal picker field used by the React Native picker packages. */
export function NativePickerField<TOption, TValue extends string = string>(
	props: NativePickerComponentProps<TOption, TValue>
): ReactNode {
	const {
		ActivityIndicator,
		FlatList,
		Modal,
		Pressable,
		SafeAreaView,
		Text,
		TextInput,
		View
	} = loadReactNativePrimitives()
	const labels = props.labels ?? {}
	const picker = useNativePickerField<TOption, TValue>(props)
	const hasValue = picker.value !== null
	const selectedLabel = picker.selectedLabel
	const placeholder = labels.placeholder ?? 'Select'
	const fullScreenThreshold = props.fullScreenThreshold ?? 50
	const fullScreen =
		props.presentation === 'full-screen' ||
		(props.presentation !== 'bottom-sheet' &&
			(Boolean(picker.meta?.hasMore) ||
				picker.options.length > fullScreenThreshold))
	const containerStyle = fullScreen
		? [nativePickerStyles.fullScreen, props.styles?.fullScreen]
		: [nativePickerStyles.sheet, props.styles?.sheet]

	function optionKey(option: TOption, index: number): string {
		return (
			props.keyExtractor?.(option, index) ??
			resolveOptionValue(option, props.getOptionValue)
		)
	}

	function renderOption({ item, index }: { item: TOption; index: number }) {
		const optionValue = resolveOptionValue(item, props.getOptionValue)
		const optionLabel = resolveOptionLabel(item, props.getOptionLabel)
		const selected = optionValue === picker.value
		const onSelect = () => picker.select(item)
		return (
			props.renderOption?.({
				option: item,
				label: optionLabel,
				value: optionValue,
				selected,
				onSelect
			}) ??
			createElement(
				Pressable,
				{
					accessibilityRole: 'button',
					accessibilityState: { selected },
					onPress: onSelect,
					style: [
						nativePickerStyles.option,
						selected && nativePickerStyles.selectedOption,
						props.styles?.option,
						selected && props.styles?.selectedOption
					]
				},
				createElement(
					Text,
					{
						style: [
							nativePickerStyles.optionText,
							selected && nativePickerStyles.selectedOptionText,
							props.styles?.optionText,
							selected && props.styles?.selectedOptionText
						]
					},
					optionLabel
				)
			)
		)
	}

	function renderStatus(text: ReactNode) {
		return createElement(
			View,
			{ style: [nativePickerStyles.status, props.styles?.status] },
			typeof text === 'string'
				? createElement(
						Text,
						{
							style: [nativePickerStyles.statusText, props.styles?.statusText]
						},
						text
					)
				: text
		)
	}

	const valueContent =
		props.renderValue?.({
			option: picker.selectedOption,
			label: selectedLabel,
			value: picker.value
		}) ??
		createElement(
			Text,
			{
				numberOfLines: 1,
				style: [nativePickerStyles.triggerText, props.styles?.triggerText]
			},
			selectedLabel || placeholder
		)
	const emptyContent =
		props.renderEmpty?.({ query: picker.query }) ??
		renderStatus(labels.empty ?? 'No results')
	const loadingContent =
		props.renderLoading?.() ??
		createElement(
			View,
			{ style: [nativePickerStyles.status, props.styles?.status] },
			createElement(ActivityIndicator),
			createElement(
				Text,
				{ style: [nativePickerStyles.statusText, props.styles?.statusText] },
				labels.loading ?? 'Loading...'
			)
		)

	return createElement(
		View,
		{ style: [nativePickerStyles.root, props.styles?.root] },
		labels.label
			? createElement(
					Text,
					{ style: [nativePickerStyles.label, props.styles?.label] },
					labels.label
				)
			: null,
		createElement(
			Pressable,
			{
				accessibilityRole: 'button',
				accessibilityState: {
					disabled: props.disabled,
					expanded: picker.open
				},
				disabled: props.disabled,
				onPress: () => picker.setOpen(true),
				style: [nativePickerStyles.trigger, props.styles?.trigger]
			},
			valueContent,
			hasValue && !props.disabled
				? createElement(
						Pressable,
						{
							accessibilityLabel: labels.clear ?? 'Clear',
							accessibilityRole: 'button',
							onPress: picker.clear,
							style: [nativePickerStyles.clearButton, props.styles?.clearButton]
						},
						createElement(
							Text,
							{
								style: [nativePickerStyles.clearText, props.styles?.clearText]
							},
							'×'
						)
					)
				: null
		),
		createElement(
			Modal,
			{
				animationType: 'slide',
				onRequestClose: () => picker.setOpen(false),
				transparent: !fullScreen,
				visible: picker.open
			},
			createElement(
				View,
				{ style: nativePickerStyles.modalRoot },
				fullScreen
					? null
					: createElement(Pressable, {
							accessibilityLabel: labels.close ?? 'Close',
							onPress: () => picker.setOpen(false),
							style: [nativePickerStyles.backdrop, props.styles?.backdrop]
						}),
				createElement(
					SafeAreaView,
					{ style: containerStyle },
					createElement(
						View,
						{ style: [nativePickerStyles.header, props.styles?.header] },
						createElement(
							Text,
							{ style: [nativePickerStyles.title, props.styles?.title] },
							labels.label ?? placeholder
						),
						createElement(
							Pressable,
							{
								accessibilityLabel: labels.close ?? 'Close',
								accessibilityRole: 'button',
								onPress: () => picker.setOpen(false),
								style: [
									nativePickerStyles.closeButton,
									props.styles?.closeButton
								]
							},
							createElement(
								Text,
								{
									style: [nativePickerStyles.closeText, props.styles?.closeText]
								},
								'×'
							)
						)
					),
					createElement(TextInput, {
						autoFocus: true,
						onChangeText: picker.setQuery,
						placeholder: labels.searchPlaceholder ?? 'Search',
						style: [nativePickerStyles.searchInput, props.styles?.searchInput],
						value: picker.query
					}),
					picker.loading && picker.options.length === 0
						? loadingContent
						: picker.options.length === 0
							? emptyContent
							: createElement(FlatList, {
									data: picker.options,
									keyExtractor: optionKey,
									keyboardShouldPersistTaps: 'handled',
									ListFooterComponent:
										picker.loading && picker.options.length > 0
											? loadingContent
											: null,
									onEndReached: picker.loadMore,
									onEndReachedThreshold: 0.6,
									renderItem: renderOption,
									style: [nativePickerStyles.list, props.styles?.list]
								})
				)
			)
		)
	)
}

export function loadReactNativePrimitives(): NativePrimitives {
	const runtimeRequire = (globalThis as { require?: (id: string) => unknown })
		.require
	if (!runtimeRequire) {
		throw new Error(
			'react-native-picker-core components require the react-native peer dependency at runtime.'
		)
	}
	return runtimeRequire('react-native') as NativePrimitives
}

export function NativePickerStack(props: {
	children?: ReactNode
	style?: StyleProp<ViewStyle>
}): ReactNode {
	const { View } = loadReactNativePrimitives()
	return createElement(
		View,
		{ style: [{ gap: 12 }, props.style] },
		props.children
	)
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs)
		return () => clearTimeout(timer)
	}, [value, delayMs])
	return debounced
}

export function getNativeOptionA11y<TOption>(
	option: TOption,
	selected: boolean,
	getOptionLabel?: (option: TOption) => string
): NativePickerA11y {
	return {
		accessibilityLabel: resolveOptionLabel(option, getOptionLabel),
		accessibilityState: { selected }
	}
}

const nativePickerStyles = {
	root: {
		gap: 6
	},
	label: {
		color: '#111827',
		fontSize: 14,
		fontWeight: '600'
	},
	trigger: {
		alignItems: 'center',
		borderColor: '#d1d5db',
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: 'row',
		gap: 8,
		minHeight: 48,
		paddingHorizontal: 14
	},
	triggerText: {
		color: '#111827',
		flex: 1,
		fontSize: 16
	},
	clearButton: {
		alignItems: 'center',
		height: 32,
		justifyContent: 'center',
		width: 32
	},
	clearText: {
		color: '#6b7280',
		fontSize: 24,
		lineHeight: 28
	},
	modalRoot: {
		backgroundColor: 'rgba(17, 24, 39, 0.45)',
		flex: 1,
		justifyContent: 'flex-end'
	},
	backdrop: {
		flex: 1
	},
	sheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '82%',
		minHeight: 360,
		padding: 16
	},
	fullScreen: {
		backgroundColor: '#ffffff',
		flex: 1,
		padding: 16
	},
	header: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'space-between',
		marginBottom: 12
	},
	title: {
		color: '#111827',
		flex: 1,
		fontSize: 18,
		fontWeight: '700'
	},
	closeButton: {
		alignItems: 'center',
		height: 36,
		justifyContent: 'center',
		width: 36
	},
	closeText: {
		color: '#6b7280',
		fontSize: 26,
		lineHeight: 30
	},
	searchInput: {
		borderColor: '#d1d5db',
		borderRadius: 12,
		borderWidth: 1,
		color: '#111827',
		fontSize: 16,
		marginBottom: 12,
		minHeight: 48,
		paddingHorizontal: 14
	},
	list: {
		flexGrow: 0
	},
	option: {
		borderBottomColor: '#f3f4f6',
		borderBottomWidth: 1,
		paddingVertical: 14
	},
	selectedOption: {
		backgroundColor: '#ecfdf5'
	},
	optionText: {
		color: '#111827',
		fontSize: 16
	},
	selectedOptionText: {
		color: '#047857',
		fontWeight: '700'
	},
	status: {
		alignItems: 'center',
		gap: 10,
		paddingVertical: 28
	},
	statusText: {
		color: '#6b7280',
		fontSize: 15
	}
}
