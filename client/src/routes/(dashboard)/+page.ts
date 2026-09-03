import { authenticate, getFecthHeaders } from '#lib/util.ts';
import { browser } from '$app/env';
import type { PageLoad } from './$types';
import { AUTH_PUBLIC_KEY, API_BASE_URL } from '$app/env/public';

export const load: PageLoad = async ({ fetch, url }) => {
	const accessToken = await authenticate(browser, AUTH_PUBLIC_KEY, fetch, url.pathname);

	const decksRes = await fetch(`${API_BASE_URL}/decks`, {
		method: 'GET',
		headers: getFecthHeaders(accessToken)
	});

	if (!decksRes.ok) {
		return {};
	}
	return await decksRes.json();
};
