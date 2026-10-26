<script lang="ts">
	import '../../page.css';
	import type { PageProps } from './$types';
	import trophyLogo from '#lib/assets/trophy-logo.svg';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.highlight.title} · {data.season.title} · SINNO CUP</title>
	<meta name="description" content={data.highlight.summary} />
</svelte:head>

<main class="highlight-page">
	<header class="highlight-page-header">
		<a class="highlight-page-brand" href="/" aria-label="Trang chủ SINNO CUP">
			<img src={trophyLogo} alt="" />
			<span>SINNO <em>CUP</em></span>
		</a>
		<a class="highlight-page-back" href={data.backPath}>← Trở về mùa giải</a>
	</header>

	<article class="highlight-story">
		<div class="highlight-story-eyebrow">{data.season.title} <span>·</span> {data.highlight.tag}</div>
		<div class="highlight-story-number">{data.highlight.number}</div>
		<h1>{data.highlight.title}</h1>
		{#if data.highlight.summary}
			<p class="highlight-story-summary">{data.highlight.summary}</p>
		{/if}
		<div class="highlight-story-rule"></div>

		<div class="highlight-story-content">
			{#if data.highlight.content.replace(/<[^>]*>/g, '').trim()}
				<div class="highlight-story-richtext">{@html data.highlight.content}</div>
			{/if}
		</div>

		<a class="highlight-story-footer-link" href={data.backPath}>← Tất cả khoảnh khắc mùa giải</a>
	</article>
</main>

<style>
	.highlight-page {
		min-height: 100vh;
		padding: 0 6% 90px;
		background:
			radial-gradient(ellipse at 50% 0, rgba(170, 132, 63, 0.1), transparent 33%),
			#10120f;
		color: #f4f0e7;
		font-family: 'DM Sans', sans-serif;
	}

	.highlight-page-header {
		min-height: 82px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid rgba(255, 255, 255, 0.09);
	}

	.highlight-page-brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: #f4f0e7;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-decoration: none;
	}

	.highlight-page-brand img {
		width: 34px;
		height: 40px;
		object-fit: contain;
	}

	.highlight-page-brand em {
		color: #daba76;
		font-style: normal;
	}

	.highlight-page-back,
	.highlight-story-footer-link {
		color: #c8aa6d;
		font-size: 12px;
		text-decoration: none;
	}

	.highlight-page-back:hover,
	.highlight-story-footer-link:hover {
		color: #ecd08b;
	}

	.highlight-story {
		position: relative;
		width: min(820px, 100%);
		margin: 0 auto;
		padding-top: 86px;
	}

	.highlight-story-eyebrow {
		color: #c8aa6d;
		font-size: 12px;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.highlight-story-eyebrow span {
		padding: 0 6px;
		color: #68675f;
	}

	.highlight-story-number {
		position: absolute;
		top: 68px;
		right: 0;
		color: rgba(217, 181, 107, 0.08);
		font-family: 'Playfair Display', Georgia, serif;
		font-size: clamp(90px, 17vw, 170px);
		line-height: 1;
		pointer-events: none;
	}

	.highlight-story h1 {
		position: relative;
		max-width: 680px;
		margin: 20px 0 15px;
		color: #f4f0e7;
		font-family: 'Playfair Display', Georgia, serif;
		font-size: clamp(38px, 6vw, 64px);
		font-weight: 500;
		letter-spacing: -0.035em;
		line-height: 1.1;
	}

	.highlight-story-summary {
		max-width: 660px;
		margin: 0;
		color: #aaa79c;
		font-size: 16px;
		line-height: 1.8;
	}

	.highlight-story-rule {
		height: 1px;
		margin: 38px 0;
		background: linear-gradient(90deg, rgba(217, 181, 107, 0.35), transparent);
	}

	.highlight-story-content {
		display: grid;
		gap: 26px;
	}

	.highlight-story-richtext {
		color: #d4d0c6;
		font-size: 16px;
		line-height: 1.9;
		overflow-wrap: anywhere;
	}

	.highlight-story-richtext :global(p) {
		margin: 0 0 1.2em;
	}

	.highlight-story-richtext :global(div) {
		margin: 0 0 1.2em;
	}

	.highlight-story-richtext :global(h2),
	.highlight-story-richtext :global(h3) {
		margin: 1.4em 0 0.6em;
		color: #f4f0e7;
		font-family: 'Playfair Display', Georgia, serif;
		font-weight: 500;
		line-height: 1.3;
	}

	.highlight-story-richtext :global(blockquote) {
		margin: 1.2em 0;
		padding: 4px 0 4px 18px;
		border-left: 2px solid #c8aa6d;
		color: #c8aa6d;
	}

	.highlight-story-richtext :global(ul),
	.highlight-story-richtext :global(ol) {
		padding-left: 1.5em;
	}

	.highlight-story-richtext :global(a) {
		color: #d9b56b;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.highlight-story-richtext :global(img) {
		display: block;
		width: 100%;
		max-height: 760px;
		margin: 24px auto;
		border: 1px solid rgba(217, 181, 107, 0.17);
		object-fit: contain;
		background: #090a08;
	}

	.highlight-story-footer-link {
		display: inline-flex;
		margin-top: 48px;
	}

	@media (max-width: 640px) {
		.highlight-page {
			padding: 0 6% 60px;
		}

		.highlight-page-header {
			min-height: 70px;
		}

		.highlight-page-back {
			max-width: 135px;
			text-align: right;
		}

		.highlight-story {
			padding-top: 58px;
		}

		.highlight-story-number {
			top: 40px;
		}

		.highlight-story-summary,
		.highlight-story-richtext {
			font-size: 14px;
		}
	}
</style>
