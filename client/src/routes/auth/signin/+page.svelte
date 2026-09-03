<script lang="ts">
	import { API_BASE_URL } from '$app/env/public';

	const googleAuth = () => {
		window.location.replace(`${API_BASE_URL}/auth/oauth/google/redirect`);
	};
</script>

Signin page

<button onclick={googleAuth}>Sign in with Google</button>
