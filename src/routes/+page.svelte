<script lang="ts">
	import './page.css';
	import type { PageProps } from './$types';
	import { seasonPath } from '../lib/season-slug';
	import trophyLogo from '#lib/assets/trophy-logo.svg';

	let { data }: PageProps = $props();
	let upcomingSeason = $derived(data.seasons.find((season) => season.status === 'upcoming'));
	let currentSeason = $derived(data.seasons.find((season) => season.status === 'current'));
	let previousSeasons = $derived(data.seasons.filter((season) => season.status === 'previous'));
</script>

<svelte:head>
	<title>SINNO CUP — Giải đấu của chúng ta</title>
	<meta
		name="description"
		content="SINNO CUP — nơi những đội bóng cùng nhau tạo nên một mùa giải, những khoảnh khắc và kỷ niệm đáng nhớ."
	/>
	<meta name="theme-color" content="#10120f" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="site-shell">
	<header class="topbar">
		<a class="brand" href="/" aria-label="SINNO CUP — trang chủ">
			<img class="brand-mark" src={trophyLogo} alt="" />
			<span class="brand-name">SINNO <span>CUP</span></span>
		</a>
		<nav class="home-season-nav" aria-label="Các mùa giải">
			{#if upcomingSeason}
				<a href={seasonPath(upcomingSeason, data.seasons)}>{upcomingSeason.title}</a>
			{/if}
			{#if currentSeason}
				<a href={seasonPath(currentSeason, data.seasons)}>{currentSeason.title}</a>
			{/if}
			{#if previousSeasons.length > 0}
				<details class="season-nav-group">
					<summary>Các mùa trước</summary>
					<div class="season-nav-options">
						{#each previousSeasons as season (season.title)}
							<a class="edition-nav-button" href={seasonPath(season, data.seasons)}>{season.title}</a>
						{/each}
					</div>
				</details>
			{/if}
		</nav>
	</header>

	<main class="home-intro">
		<div class="hero-image" aria-hidden="true"></div>
		<div class="hero-shade" aria-hidden="true"></div>
		<div class="hero-noise" aria-hidden="true"></div>
		<div class="home-intro-content">
			<div class="eyebrow"><span class="live-dot"></span> GIẢI ĐẤU CỦA CHÚNG TA</div>
			<h1>SINNO CUP<br /><em>Hơn cả một trận đấu.</em></h1>
			<p>
				Nơi những đội bóng cùng viết nên hành trình, tinh thần đồng đội và những khoảnh khắc đáng
				nhớ qua từng mùa giải.
			</p>
			<div class="home-intro-links">
				{#if currentSeason}
					<a class="button button-gold" href={seasonPath(currentSeason, data.seasons)}>
						Khám phá {currentSeason.title} <span>↗</span>
					</a>
				{:else if upcomingSeason}
					<a class="button button-gold" href={seasonPath(upcomingSeason, data.seasons)}>
						Khám phá {upcomingSeason.title} <span>↗</span>
					</a>
				{/if}
				{#if upcomingSeason && currentSeason}
					<a class="text-link" href={seasonPath(upcomingSeason, data.seasons)}>
						{upcomingSeason.title} <span>↗</span>
					</a>
				{/if}
			</div>
		</div>
		<div class="hero-edition">
			<span class="edition-line"></span>
			<span>MỘT GIẢI ĐẤU. MỘT ĐẠI GIA ĐÌNH.</span>
			<strong>SINNO CUP</strong>
		</div>
	</main>
</div>
