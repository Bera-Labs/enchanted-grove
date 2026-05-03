<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { grove } from '$lib/store.svelte';

	let { children, data } = $props();

	let path = $derived(page.url.pathname);

	onMount(() => {
		grove.hydrate(data.state);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="tabs">
	<a href="/" class:active={path === '/'}>grove</a>
	<a href="/stats" class:active={path === '/stats'}>stats</a>
</nav>

{@render children()}

<style>
	.tabs {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 60;
		display: flex;
		gap: 0.25rem;
		padding: 0.3rem;
		background: rgba(8, 18, 32, 0.5);
		border: 1px solid rgba(180, 220, 255, 0.15);
		border-radius: 999px;
		backdrop-filter: blur(10px);
		font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
	}
	.tabs a {
		padding: 0.4rem 1rem;
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		text-transform: lowercase;
		font-style: italic;
		color: rgba(220, 235, 255, 0.55);
		text-decoration: none;
		border-radius: 999px;
		transition: all 0.25s ease;
	}
	.tabs a:hover {
		color: rgba(240, 248, 255, 0.85);
	}
	.tabs a.active {
		color: #f0f8ff;
		background: rgba(140, 200, 255, 0.18);
		text-shadow: 0 0 12px rgba(180, 220, 255, 0.5);
	}
</style>
