<script lang="ts">
	import type { PlantStage, PlantStatus } from './types';

	interface Props {
		stage: PlantStage; // 0..4 (current session growth stage)
		status?: PlantStatus;
		hasSession: boolean;
		density: number; // -1 = dead land, 0..LANDSCAPE_COUNT-1 = landscape index
	}
	let { stage, status = 'growing', hasSession, density }: Props = $props();

	// landscapes from sparse → dense; clamp density into range
	const LANDSCAPE_COUNT = 13;
	const landscapes = Array.from({ length: LANDSCAPE_COUNT }, (_, i) => ({
		src: `/assets/landscape-${String(i + 1).padStart(2, '0')}.jpg`
	}));
	const DEAD_LAND_SRC = '/assets/dead-land.jpg';
	const growthImgs = [
		'/assets/growth-0.jpg',
		'/assets/growth-1.png',
		'/assets/growth-2.jpg',
		'/assets/growth-3.jpg',
		'/assets/growth-4.jpg'
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
	{#each landscapes as l, i}
		<img
			src={l.src}
			alt="landscape"
			class="layer landscape"
			class:active={i === landscapeIdx}
		/>
	{/each}
	{#each growthImgs as src, i}
		<img
			{src}
			alt="growth-{i}"
			class="layer growth"
			class:active={i === growthIdx}
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
