<script lang="ts">
	import type { PlantStage, PlantStatus } from './types';

	interface Props {
		stage: PlantStage; // 0..4 (current session growth stage)
		status?: PlantStatus;
		hasSession: boolean;
		density: number; // -1 = dead land, 0..LANDSCAPE_COUNT-1 = landscape index
	}
	let { stage, status = 'growing', hasSession, density }: Props = $props();

	// cache-busting query string: stable per page load, refreshes on reload so
	// replaced asset files show up immediately without needing a hard refresh.
	const CACHE_BUST = `?v=${Date.now()}`;

	// landscapes from sparse → dense; clamp density into range
	const LANDSCAPE_COUNT = 13;
	const landscapes = Array.from({ length: LANDSCAPE_COUNT }, (_, i) => ({
		src: `/assets/landscape-${String(i + 1).padStart(2, '0')}.jpg${CACHE_BUST}`
	}));
	const DEAD_LAND_SRC = `/assets/dead-land.jpg${CACHE_BUST}`;
	const growthImgs = [
		`/assets/growth-0.jpg${CACHE_BUST}`,
		`/assets/growth-1.png${CACHE_BUST}`,
		`/assets/growth-2.jpg${CACHE_BUST}`,
		`/assets/growth-3.jpg${CACHE_BUST}`,
		`/assets/growth-4.jpg${CACHE_BUST}`
	];

	let isDead = $derived(density < 0);
	let landscapeIdx = $derived(isDead ? -1 : Math.min(LANDSCAPE_COUNT - 1, Math.max(0, density)));
	// during a session, growth image for current stage (0..4) overlays the landscape
	let growthIdx = $derived(hasSession ? stage : -1);

	let withered = $derived(status === 'withered');
</script>

<div class="stage" class:withered class:dead={isDead}>
	<img
		src={DEAD_LAND_SRC}
		alt="dead land"
		class="layer landscape dead-land"
		class:active={isDead}
	/>
	<!--
		Only attach a src to the currently-active layer; inactive layers stay
		mounted (preserving the opacity cross-fade) but don't trigger a network
		request. Using `undefined` omits the attribute entirely; an empty string
		would cause the browser to refetch the current page URL.
	-->
	{#each landscapes as l, i}
		<img
			src={i === landscapeIdx ? l.src : undefined}
			alt=""
			role="presentation"
			class="layer landscape"
			class:active={i === landscapeIdx}
			loading="lazy"
			decoding="async"
		/>
	{/each}
	{#each growthImgs as gSrc, i}
		<img
			src={i === growthIdx ? gSrc : undefined}
			alt=""
			role="presentation"
			class="layer growth"
			class:active={i === growthIdx}
			loading="lazy"
			decoding="async"
		/>
	{/each}
	<div class="vignette"></div>
</div>

<style>
	.stage {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		z-index: 0;
		background: #02060e;
	}
	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 1.8s ease-in-out, filter 1.2s ease-in-out;
		will-change: opacity;
	}
	/* growth images: dynamically fill the screen — always covers the viewport edge-to-edge,
	   re-cropping as the window resizes. */
	.layer.growth {
		object-fit: cover;
		object-position: center 55%;
	}
	.layer.active {
		opacity: 1;
	}
	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 35%,
			rgba(0, 0, 0, 0.45) 95%
		);
		pointer-events: none;
		z-index: 10;
	}
	.stage.withered .layer.growth.active {
		filter: saturate(0.3) brightness(0.65) sepia(0.2);
	}
</style>
