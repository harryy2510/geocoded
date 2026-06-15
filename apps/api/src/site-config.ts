export type SiteConfig = {
	siteName: string
	siteUrl: string
	apiUrl: string
	githubUrl: string
}

const DEFAULT_SITE_URL = 'https://geocoded.me'
const DEFAULT_API_URL = 'https://api.geocoded.me'
const DEFAULT_GITHUB_URL = 'https://github.com/harryy2510/geocoded'

export function getSiteConfig(env: Env, requestUrl?: string): SiteConfig {
	void requestUrl
	return {
		siteName: env.SITE_NAME || 'Geocoded',
		siteUrl: env.SITE_URL || DEFAULT_SITE_URL,
		apiUrl: env.API_URL || DEFAULT_API_URL,
		githubUrl: env.GITHUB_URL || DEFAULT_GITHUB_URL
	}
}
