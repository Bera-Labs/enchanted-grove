<script lang="ts">
	import { getGrove } from '$lib/store.svelte';

	const grove = getGrove();

	function isoWeek(d: Date): { year: number; week: number; key: string } {
		const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		const dayNum = date.getUTCDay() || 7;
		date.setUTCDate(date.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
		const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
		const key = `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
		return { year: date.getUTCFullYear(), week: weekNum, key };
	}

	function weekRange(year: number, week: number): { start: Date; end: Date } {
		const jan4 = new Date(Date.UTC(year, 0, 4));
		const jan4Day = jan4.getUTCDay() || 7;
		const mondayOfWeek1 = new Date(jan4);
		mondayOfWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
		const start = new Date(mondayOfWeek1);
		start.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);
		const end = new Date(start);
		end.setUTCDate(start.getUTCDate() + 6);
		return { start, end };
	}

	function fmtDate(d: Date) {
		// Week boundaries are computed in UTC; format in UTC so users in western
		// timezones don't see the date shift back by a day.
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
	}
	function fmtFullDate(ts: number) {
		return new Date(ts).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	type WeekBucket = {
		year: number;
		week: number;
		key: string;
		bloomed: number;
		withered: number;
		start: Date;
		end: Date;
	};

	let weekly = $derived.by(() => {
		const map = new Map<string, WeekBucket>();
		for (const p of grove.garden) {
			const ts = p.completedAt ?? p.plantedAt;
			const { year, week, key } = isoWeek(new Date(ts));
			let b = map.get(key);
			if (!b) {
				const { start, end } = weekRange(year, week);
				b = { year, week, key, bloomed: 0, withered: 0, start, end };
				map.set(key, b);
			}
			if (p.status === 'mature') b.bloomed++;
			else if (p.status === 'withered') b.withered++;
		}
		return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
	});

	let maxHoursInWeek = $derived(Math.max(1, ...weekly.map((w) => w.bloomed + w.withered)));

	let timeline = $derived(
		[...grove.garden].sort(
			(a, b) => (b.completedAt ?? b.plantedAt) - (a.completedAt ?? a.plantedAt)
		)
	);

	let totalBloomed = $derived(grove.garden.filter((p) => p.status === 'mature').length);
	let totalWithered = $derived(grove.garden.filter((p) => p.status === 'withered').length);
</script>

<svelte:head>
	<title>Stats · Enchanted Grove</title>
</svelte:head>

<main>
	<header>
		<h1>The Grove's Memory</h1>
	</header>

	<section class="totals">
		<div class="stat">
			<div class="num">{totalBloomed}</div>
			<div class="lbl">hours bloomed</div>
		</div>
		<div class="sep"></div>
		<div class="stat">
			<div class="num">{totalWithered}</div>
			<div class="lbl">withered</div>
		</div>
		<div class="sep"></div>
		<div class="stat">
			<div class="num">{weekly.length}</div>
			<div class="lbl">{weekly.length === 1 ? 'week' : 'weeks'} active</div>
		</div>
	</section>

	{#if grove.garden.length === 0}
		<p class="empty">No memories yet. Plant a seed in the grove to begin.</p>
	{:else}
		<section class="block">
			<h2>Hours per week</h2>
			<div class="weekly">
				{#each weekly as w}
					{@const pct = (w.bloomed / maxHoursInWeek) * 100}
					{@const wPct = (w.withered / maxHoursInWeek) * 100}
					<div class="week-row">
						<div class="week-label">
							<div class="week-key">{w.key}</div>
							<div class="week-range">{fmtDate(w.start)} – {fmtDate(w.end)}</div>
						</div>
						<div class="bar-track">
							<div class="bar bloomed" style="width: {pct}%"></div>
							<div class="bar withered" style="width: {wPct}%"></div>
						</div>
						<div class="week-count">
							<span>{w.bloomed}h</span>
							{#if w.withered > 0}
								<span class="withered-count">+{w.withered} ✗</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="block">
			<h2>Timeline</h2>
			<ol class="timeline">
				{#each timeline as p (p.id)}
					<li class:withered={p.status === 'withered'}>
						<div
							class="dot"
							class:dot-bloom={p.status === 'mature'}
							class:dot-wither={p.status === 'withered'}
						></div>
						<div class="entry">
							<div class="entry-top">
								<span class="entry-time">{fmtFullDate(p.completedAt ?? p.plantedAt)}</span>
								<span class="entry-status">
									{p.status === 'mature' ? 'bloomed' : 'withered'}
								</span>
							</div>
							{#if p.note}
								<div class="entry-note">"{p.note}"</div>
							{/if}
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
		min-height: 100vh;
		background: #0a1320;
		color: #d8dee8;
		font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
	}

	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 4rem 1.5rem 6rem;
	}

	header {
		text-align: center;
		margin-bottom: 2.5rem;
	}
	h1 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 400;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: #c8d0dc;
	}

	.totals {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 1.75rem;
		margin-bottom: 3rem;
	}
	.stat {
		text-align: center;
	}
	.num {
		font-size: 1.8rem;
		font-weight: 300;
		font-variant-numeric: tabular-nums;
		color: #d8dee8;
	}
	.lbl {
		font-size: 0.7rem;
		text-transform: lowercase;
		letter-spacing: 0.14em;
		color: #7a8494;
		margin-top: 0.15rem;
	}
	.sep {
		width: 1px;
		background: rgba(255, 255, 255, 0.06);
	}

	.block {
		margin-bottom: 2.5rem;
	}
	h2 {
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 400;
		letter-spacing: 0.18em;
		text-transform: lowercase;
		color: #8a94a4;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.weekly {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}
	.week-row {
		display: grid;
		grid-template-columns: 130px 1fr 80px;
		align-items: center;
		gap: 1rem;
		font-size: 0.85rem;
	}
	.week-label {
		display: flex;
		flex-direction: column;
	}
	.week-key {
		font-variant-numeric: tabular-nums;
		color: #c8d0dc;
		font-size: 0.8rem;
	}
	.week-range {
		font-size: 0.68rem;
		color: #6a7484;
	}
	.bar-track {
		height: 6px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
		overflow: hidden;
		display: flex;
	}
	.bar {
		height: 100%;
	}
	.bar.bloomed {
		background: #6a9a78;
	}
	.bar.withered {
		background: rgba(140, 80, 80, 0.7);
	}
	.week-count {
		font-variant-numeric: tabular-nums;
		font-size: 0.82rem;
		color: #c8d0dc;
		text-align: right;
	}
	.withered-count {
		font-size: 0.7rem;
		color: #a48484;
		margin-left: 0.4rem;
	}

	.timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		position: relative;
	}
	.timeline::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 6px;
		bottom: 6px;
		width: 1px;
		background: rgba(255, 255, 255, 0.08);
	}
	.timeline li {
		position: relative;
		padding-left: 1.6rem;
		padding-bottom: 0.95rem;
	}
	.dot {
		position: absolute;
		left: 0;
		top: 7px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
	}
	.dot.dot-bloom {
		background: #6a9a78;
	}
	.dot.dot-wither {
		background: #6a4a4a;
	}
	.entry-top {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
	}
	.entry-time {
		color: #c8d0dc;
		font-size: 0.85rem;
	}
	.entry-status {
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: lowercase;
		color: #7a8494;
	}
	.entry-note {
		font-size: 0.83rem;
		color: #9aa4b4;
		margin-top: 0.15rem;
	}

	.empty {
		text-align: center;
		color: #6a7484;
		padding: 3rem 0;
		font-size: 0.95rem;
	}
</style>
