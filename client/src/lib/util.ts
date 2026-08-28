import { ResultAsync } from 'neverthrow';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { importSPKI, jwtVerify } from 'jose';
import { API_BASE_URL } from '$app/env/public';
import { redirect } from '@sveltejs/kit';

const AUTH_COOKIE = 'setsubi_a';
const NON_RETRYABLE_ERROR_CODE = ['1001', '1002'];

export const noThrow = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
	return ResultAsync.fromThrowable(fn, (e) => {
		if (e instanceof Error) {
			return e;
		}
		return new Error('unknown error');
	});
};

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// This will run on the server and client
const authenticateBase = noThrow(
	async (isBrowser: boolean, publicKey: string, f: typeof fetch, accessToken?: string) => {
		let accessTok = accessToken || '';
		if (!isBrowser && accessTok) {
			return accessTok;
		}
		if (isBrowser && !accessTok) {
			accessTok = getCookie(AUTH_COOKIE) || '';
		}
		const verifyResult = await verifyJWT(publicKey, accessTok);
		if (verifyResult.isErr()) {
			let res = await refreshAccessToken(f);
			let retryCount = 0;
			while (retryCount < 3 && res.isErr() && res.error.message !== 'not-retry') {
				console.log('RETRYING - ', retryCount);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				res = await refreshAccessToken(f);
				retryCount += 1;
			}
			if (res.isErr()) {
				throw new Error('failed to refresh token');
			}
		}
		return accessTok;
	}
);

export const authenticate = async (
	isBrowser: boolean,
	publicKey: string,
	f: typeof fetch,
	accessToken?: string
) => {
	const res = await authenticateBase(isBrowser, publicKey, f, accessToken);
	if (res.isErr()) {
		return redirect(307, '/auth/signin');
	}
	return res.value;
};

export const getCookie = (name: string) => {
	for (const cookie of document.cookie.split(';')) {
		const [key, ...rest] = cookie.trim().split('=');
		if (key === name) {
			return rest.join('=');
		}
	}
	return undefined;
};

export const verifyJWT = noThrow(async (publicKeyRaw: string, jwt: string) => {
	const publicKey = await importSPKI(publicKeyRaw, 'Ed25519');
	await jwtVerify(jwt, publicKey);
});

export const refreshAccessToken = noThrow(async (f: typeof fetch) => {
	const res = await f(`${API_BASE_URL}/auth/refresh`, {
		method: 'PATCH',
		credentials: 'include'
	});
	if (!res.ok) {
		const err = await res.json();
		if (!NON_RETRYABLE_ERROR_CODE.includes(err?.code)) {
			throw new Error('retry');
		}
		throw new Error('not-retry');
	}
});
