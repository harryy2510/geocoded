export const DEFAULT_API_URL = 'https://api.geocoded.me'

export const SITE_API_URL =
	import.meta.env.DEV && import.meta.env.PUBLIC_API_URL
		? import.meta.env.PUBLIC_API_URL
		: DEFAULT_API_URL
