<script lang="ts">
	import Stage from '$lib/Stage.svelte';
	import { getGrove } from '$lib/store.svelte';
	import { SESSION_MS } from '$lib/types';
	import { onMount } from 'svelte';

	const grove = getGrove();

	const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

	function fmtTime(ms: number) {
		const total = Math.ceil(ms / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	let progress = $derived(grove.current ? (grove.elapsed / SESSION_MS) * 100 : 0);
	let stageLabels = ['Seed sleeps', 'A first sprout', 'A young sapling', 'Branches reach', 'In full bloom'];

	let bloomedCount = $derived(grove.garden.filter((p) => p.status === 'mature').length);
	let witheredCount = $derived(grove.garden.filter((p) => p.status === 'withered').length);

	// reactive "now" that ticks once a minute so regression updates without reload
	let nowTick = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => (nowTick = Date.now()), 60_000);
		return () => clearInterval(id);
	});

	const HOURS_PER_DENSITY_STEP = 3;
	let autoDensity = $derived(Math.floor(bloomedCount / HOURS_PER_DENSITY_STEP));

	// regression: permanent damage. Each full week of inactivity (between sessions, or pending since last log)
	// adds 1 to regression — and it stays. You can't recover by logging; you can only out-grow it via
	// the normal 3-hours-per-density-step cadence.
	let autoRegression = $derived.by(() => {
		if (grove.garden.length === 0) return 0;
		const sorted = [...grove.garden]
			.map((p) => p.completedAt ?? p.plantedAt)
			.sort((a, b) => a - b);
		let accrued = 0;
		for (let i = 1; i < sorted.length; i++) {
			accrued += Math.floor((sorted[i] - sorted[i - 1]) / WEEK_MS);
		}
		// pending weeks since the most recent activity
		const pendingWeeks = Math.max(0, Math.floor((nowTick - sorted[sorted.length - 1]) / WEEK_MS));
		return accrued + pendingWeeks;
	});
	let regression = $derived(autoRegression);

	// effective density: -1 means dead land
	let effectiveDensity = $derived(Math.max(-1, autoDensity - regression));

	let displayStage = $derived(
		grove.awaitingResult ? 4 : grove.current ? grove.currentStage : 0
	);
	let displayStatus = $derived(grove.current?.status ?? 'growing');
</script>

<svelte:head>
	<title>Enchanted Grove</title>
</svelte:head>

<Stage
	stage={displayStage}
	status={displayStatus}
	hasSession={!!grove.current}
	density={effectiveDensity}
/>

<main>
	<header>
		<h1>Enchanted Grove</h1>
		<p class="tagline">A grove that grows with your focus.</p>
	</header>

	<!-- floating HUD -->
	<div class="hud-overlay">
		{#if !grove.current && !grove.awaitingResult}
			<button class="ethereal" onclick={() => grove.startSession()}>
				<span class="rune">✦</span>
				<span>Plant a Seed · Begin 1 Hour</span>
			</button>
		{:else if grove.current && !grove.awaitingResult}
			<div class="hud">
				<div class="hud-meta">
					<span class="stage-name">{stageLabels[grove.currentStage]}</span>
				</div>
				<div class="timer">{fmtTime(grove.remaining)}</div>
				<div class="progress">
					<div class="progress-fill" style="width: {progress}%"></div>
				</div>
				<button class="whisper" onclick={() => grove.cancelSession()}>let it fade</button>
			</div>
		{:else if grove.awaitingResult && grove.current}
			<div class="result-block">
				<p class="prompt">An hour has passed. Did you keep your promise?</p>
				<textarea
					bind:value={grove.noteDraft}
					placeholder="What did you tend to this hour?"
					rows="2"
				></textarea>
				<div class="actions">
					<button class="ethereal bloom" onclick={() => grove.finishSuccess()}>
						<span class="rune">✦</span> Yes — let it bloom
					</button>
					<button class="ethereal wither" onclick={() => grove.finishFailure()}>
						<span class="rune">✸</span> No — let it wither
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- footer stat strip -->
	{#if grove.garden.length > 0}
		<footer class="grove-stats">
			<span>🌳 {bloomedCount} bloomed</span>
			{#if witheredCount > 0}
				<span class="dot">·</span>
				<span class="withered-stat">🥀 {witheredCount} withered</span>
			{/if}
			{#if regression > 0}
				<span class="dot">·</span>
				<span class="decay-stat">
					{#if effectiveDensity < 0}
						☠ the grove has died
					{:else}
						↓ {regression} {regression === 1 ? 'week' : 'weeks'} of decay
					{/if}
				</span>
			{/if}
		</footer>
	{/if}

</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		min-height: 100vh;
		background: #02060e;
		color: #e8eef8;
		font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
		overflow-x: hidden;
	}

	main {
		position: relative;
		z-index: 1;
		min-height: 100vh;
		padding: 2.5rem 1.5rem 2rem;
		pointer-events: none;
	}

	header {
		text-align: center;
	}
	h1 {
		font-size: 1.6rem;
		font-weight: 300;
		margin: 0;
		letter-spacing: 0.5em;
		text-transform: uppercase;
		color: #f0f4ff;
		text-shadow:
			0 0 24px rgba(180, 220, 255, 0.55),
			0 2px 14px rgba(0, 0, 0, 0.85);
		opacity: 0.92;
	}
	.tagline {
		margin-top: 0.6rem;
		font-style: italic;
		font-size: 0.9rem;
		color: rgba(210, 225, 245, 0.65);
		letter-spacing: 0.08em;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.85);
	}

	/* floating HUD overlay */
	.hud-overlay {
		position: fixed;
		left: 50%;
		bottom: 4rem;
		transform: translateX(-50%);
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		max-width: 90vw;
	}
	.hud {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		min-width: 280px;
	}
	.hud-meta {
		font-size: 0.85rem;
		color: rgba(220, 235, 255, 0.8);
		letter-spacing: 0.18em;
		text-transform: lowercase;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
		font-style: italic;
	}
	.timer {
		font-size: 2.6rem;
		font-weight: 200;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.14em;
		color: #f4f8ff;
		text-shadow:
			0 0 32px rgba(160, 220, 255, 0.7),
			0 2px 14px rgba(0, 0, 0, 0.85);
	}
	.progress {
		width: 280px;
		height: 1px;
		background: rgba(255, 255, 255, 0.14);
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: linear-gradient(
			90deg,
			rgba(180, 230, 255, 0) 0%,
			rgba(180, 230, 255, 0.95) 50%,
			rgba(255, 220, 240, 0.95) 100%
		);
		transition: width 0.5s ease;
		box-shadow: 0 0 18px rgba(180, 230, 255, 0.75);
	}

	/* result prompt */
	.result-block {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 340px;
		max-width: 460px;
		padding: 1.5rem 1.75rem;
		background: rgba(8, 18, 32, 0.55);
		border: 1px solid rgba(180, 220, 255, 0.2);
		border-radius: 16px;
		backdrop-filter: blur(14px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(80, 140, 200, 0.18);
	}
	.prompt {
		margin: 0;
		text-align: center;
		font-style: italic;
		color: #d8e8ff;
		font-size: 1.05rem;
		letter-spacing: 0.04em;
	}
	textarea {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(180, 220, 255, 0.22);
		border-radius: 8px;
		color: #e8eef8;
		padding: 0.7rem 0.9rem;
		font-family: inherit;
		font-size: 0.95rem;
		font-style: italic;
		resize: none;
		pointer-events: auto;
	}
	textarea::placeholder {
		color: rgba(200, 220, 240, 0.4);
	}
	textarea:focus {
		outline: none;
		border-color: rgba(180, 220, 255, 0.55);
		box-shadow: 0 0 0 3px rgba(180, 220, 255, 0.1);
	}
	.actions {
		display: flex;
		gap: 0.6rem;
	}

	button {
		font-family: inherit;
		cursor: pointer;
		pointer-events: auto;
	}
	.ethereal {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.85rem 1.6rem;
		font-size: 0.95rem;
		letter-spacing: 0.16em;
		text-transform: lowercase;
		color: #f0f8ff;
		background:
			radial-gradient(ellipse at center, rgba(140, 200, 255, 0.2), rgba(80, 140, 200, 0.08));
		border: 1px solid rgba(180, 220, 255, 0.4);
		border-radius: 999px;
		backdrop-filter: blur(10px);
		box-shadow:
			0 0 28px rgba(140, 200, 255, 0.3),
			inset 0 0 14px rgba(180, 220, 255, 0.1);
		transition: all 0.3s ease;
		flex: 1;
		justify-content: center;
	}
	.ethereal:hover {
		background:
			radial-gradient(ellipse at center, rgba(160, 220, 255, 0.3), rgba(100, 160, 220, 0.14));
		box-shadow:
			0 0 40px rgba(160, 220, 255, 0.5),
			inset 0 0 18px rgba(180, 220, 255, 0.18);
		transform: translateY(-1px);
	}
	.ethereal.bloom {
		border-color: rgba(180, 255, 200, 0.45);
		box-shadow:
			0 0 28px rgba(140, 230, 180, 0.35),
			inset 0 0 14px rgba(180, 255, 200, 0.12);
	}
	.ethereal.wither {
		border-color: rgba(255, 180, 180, 0.32);
		color: rgba(240, 220, 220, 0.85);
		box-shadow:
			0 0 22px rgba(200, 120, 120, 0.22),
			inset 0 0 12px rgba(255, 180, 180, 0.08);
	}
	.rune {
		font-size: 0.85rem;
		opacity: 0.85;
		filter: drop-shadow(0 0 6px currentColor);
	}
	.whisper {
		background: transparent;
		border: none;
		color: rgba(200, 220, 240, 0.4);
		font-style: italic;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		padding: 0.4rem 0.6rem;
		margin-top: 0.3rem;
		transition: color 0.3s ease;
	}
	.whisper:hover {
		color: rgba(220, 235, 255, 0.75);
	}

	/* grove stats footer */
	.grove-stats {
		position: fixed;
		left: 1.25rem;
		bottom: 1.25rem;
		z-index: 25;
		font-size: 0.8rem;
		color: rgba(220, 235, 255, 0.6);
		font-style: italic;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.85);
	}
	.grove-stats .dot {
		opacity: 0.4;
		margin: 0 0.5rem;
	}
	.withered-stat {
		opacity: 0.7;
	}
	.decay-stat {
		color: rgba(220, 180, 180, 0.85);
		font-style: italic;
		text-shadow: 0 0 8px rgba(180, 80, 80, 0.4);
	}

</style>
