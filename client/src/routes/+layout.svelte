<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import '@fontsource/zen-maru-gothic/300.css';
	import '@fontsource/zen-maru-gothic/400.css';
	import '@fontsource/zen-maru-gothic/500.css';
	import '@fontsource/zen-maru-gothic/700.css';
	import '@fontsource/zen-maru-gothic/900.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="flex min-h-screen w-full flex-col">
	{@render children()}
</main>
