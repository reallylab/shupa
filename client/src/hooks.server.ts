import { AUTH_COOKIE, authenticate } from '#lib/util.ts';
import type { Handle } from '@sveltejs/kit/hooks';
import { AUTH_PUBLIC_KEY } from '$app/env/public';

export const handle: Handle = async ({ event, resolve }) => {
	const accessToken = event.cookies.get(AUTH_COOKIE) || '';
	await authenticate(false, AUTH_PUBLIC_KEY, event.fetch, event.url.pathname, accessToken);
	const res = await resolve(event);
	return res;
};
