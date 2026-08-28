import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	AUTH_PUBLIC_KEY: {
		public: true
	},
	API_BASE_URL: {
		public: true
	}
});
