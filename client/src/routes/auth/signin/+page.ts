import { authenticate } from '#lib/util.ts';
import { browser } from '$app/env';
import type { PageLoad } from './$types';
import { AUTH_PUBLIC_KEY } from '$app/env/public';

export const load: PageLoad = async ({ fetch, url }) => {
	await authenticate(browser, AUTH_PUBLIC_KEY, fetch, url.pathname);
};
