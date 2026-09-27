import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { PickerField } from 'react-picker-core'

describe('react-picker-core', () => {
	test('renders as a closed autocomplete combobox by default', () => {
		const html = renderToString(
			createElement(PickerField<{ label: string; value: string }>, {
				defaultValue: 'USD',
				options: [
					{ label: 'USD - US Dollar', value: 'USD' },
					{ label: 'AED - UAE Dirham', value: 'AED' }
				],
				getOptionLabel: (option) => option.label,
				getOptionValue: (option) => option.value
			})
		)

		expect(html).toContain('role="combobox"')
		expect(html).toContain('aria-expanded="false"')
		expect(html).toContain('type="text"')
		expect(html).toContain('value="USD - US Dollar"')
		expect(html).not.toContain('type="search"')
		expect(html).not.toContain('role="listbox"')
	})
})
