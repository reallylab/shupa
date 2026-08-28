<script lang="ts">
	let { children } = $props();
</script>

<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
	{@render children()}
</div>
