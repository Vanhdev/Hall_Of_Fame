<script lang="ts">
	import '../page.css';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import type { SeasonData, SeasonSummary } from '../../lib/sinno-cup';
	import { highlightPath, seasonPath } from '../../lib/season-slug';
	import trophyLogo from '#lib/assets/trophy-logo.svg';

	let { data }: PageProps = $props();
	let menuOpen = $state(false);
	let isCelebrating = $state(false);
	let seasonsNewestFirst: SeasonSummary[] = $derived(data.seasons);
	let upcomingSeasons = $derived(
		seasonsNewestFirst.filter((season) => season.status === 'upcoming')
	);
	let currentSeasons = $derived(
		seasonsNewestFirst.filter((season) => season.status === 'current')
	);
	let previousSeasons = $derived(
		seasonsNewestFirst.filter((season) => season.status === 'previous')
	);
	let currentSeason: SeasonData = $derived(data.season);
	let selectedSeasonKey = $derived(currentSeason.title);
	let hasTeamMembers = $derived(currentSeason?.teams.some((team) => team.members.length > 0) ?? false);
	let topScorersRanked = $derived.by(() => {
		let rank = 0;
		let previousGoals: number | undefined;
		return [...(currentSeason?.topScorers ?? [])]
			.sort((first, second) => second.goals - first.goals || first.name.localeCompare(second.name))
			.map((scorer, index) => {
				if (scorer.goals !== previousGoals) rank = index + 1;
				previousGoals = scorer.goals;
				return { ...scorer, rank };
			});
	});
	let previousSeason = $derived(previousSeasons[0]);
	let selectedEdition = $derived(
		currentSeason ? (currentSeason.status === 'upcoming' ? 'upcoming' : 'previous') : null
	);
	let celebrationTimer: ReturnType<typeof setTimeout>;
	const edition = $derived(
		currentSeason
			? selectedEdition === 'upcoming'
				? {
						label: 'Kỳ tiếp theo',
						season: currentSeason.title,
						status: 'ĐANG CHUẨN BỊ',
						date: currentSeason.date,
						venue: currentSeason.venue,
						format: currentSeason.format,
						description: currentSeason.description
					}
				: {
						label: 'Kỳ trước',
						season: currentSeason.title,
						status: 'ĐÃ KHÉP LẠI',
						date: currentSeason.date,
						venue: currentSeason.venue,
						format: currentSeason.format,
						description: 'Cùng nhìn lại những kết quả và khoảnh khắc của mùa giải.'
					}
			: {
					label: '',
					season: 'SINNO CUP',
					status: '',
					date: '',
					venue: '',
					format: '',
					description: ''
				}
	);

	const confetti = Array.from({ length: 34 }, (_, index) => ({
		id: index,
		left: `${(index * 37 + 11) % 100}%`,
		delay: `${(index % 12) * 0.045}s`,
		duration: `${1.5 + (index % 7) * 0.16}s`,
		color: ['#e7bd68', '#fff0bd', '#b98938', '#f7f0df'][index % 4],
		rotation: `${(index * 43) % 360}deg`
	}));

	async function selectSeason(key: string) {
		closeSeasonMenu();
		const season = seasonsNewestFirst.find((item) => item.title === key);
		if (!season) return;
		await goto(seasonPath(season, seasonsNewestFirst));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function closeSeasonMenu() {
		menuOpen = false;
		document.querySelectorAll<HTMLDetailsElement>('.season-nav-group[open]').forEach((group) => {
			group.open = false;
		});
	}

	function celebrate() {
		isCelebrating = true;
		clearTimeout(celebrationTimer);
		celebrationTimer = setTimeout(() => (isCelebrating = false), 2600);
	}
</script>

<svelte:head>
	<title>{edition.season}</title>
	{#if currentSeason}
		<meta
		name="description"
		content={selectedEdition === 'upcoming'
			? currentSeason.description
			: `Cùng nhìn lại ${currentSeason.title} — nơi ${currentSeason.champion} lên ngôi vô địch.`}
		/>
	{/if}
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
		<a class="brand" href="/" aria-label="SINNO CUP — trang giới thiệu">
			<img class="brand-mark" src={trophyLogo} alt="" />
			<span class="brand-name">SINNO <span>CUP</span></span>
		</a>

		<button
			class="menu-toggle"
			type="button"
			aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span><span></span>
		</button>

		<nav class:open={menuOpen} aria-label="Điều hướng chính">
			{#if upcomingSeasons[0]}
				<a class:active={selectedSeasonKey === upcomingSeasons[0].title} class="edition-nav-button" href={seasonPath(upcomingSeasons[0], seasonsNewestFirst)} onclick={closeSeasonMenu}>{upcomingSeasons[0].title}</a>
			{/if}
			{#if currentSeasons[0]}
				<a class:active={selectedSeasonKey === currentSeasons[0].title} class="edition-nav-button" href={seasonPath(currentSeasons[0], seasonsNewestFirst)} onclick={closeSeasonMenu}>{currentSeasons[0].title}</a>
			{/if}
			{#if previousSeasons.length > 0}
				<details class="season-nav-group">
					<summary>Các mùa trước</summary>
					<div class="season-nav-options">
						{#each previousSeasons as season (season.title)}
							<a class:active={selectedSeasonKey === season.title} class="edition-nav-button" href={seasonPath(season, seasonsNewestFirst)} onclick={closeSeasonMenu}>{season.title}</a>
						{/each}
					</div>
				</details>
			{/if}
			{#if currentSeason && selectedEdition === 'previous'}
				<a href="#vinh-quang" onclick={() => (menuOpen = false)}>Nhà vô địch</a>
				{#if hasTeamMembers}<a href="#thanh-vien" onclick={() => (menuOpen = false)}>Thành viên</a>{/if}
				{#if topScorersRanked.length > 0}<a href="#vua-pha-luoi" onclick={() => (menuOpen = false)}>Vua phá lưới</a>{/if}
				<a href="#ket-qua" onclick={() => (menuOpen = false)}>Kết quả 3 vòng</a>
				<a href="#khoanh-khac" onclick={() => (menuOpen = false)}>Khoảnh khắc</a>
				<a class="nav-cta" href="#loi-ket" onclick={() => (menuOpen = false)}>Mừng chiến thắng <span>↗</span></a>
			{:else if currentSeason}
				<a href="#ky-tiep-theo" onclick={() => (menuOpen = false)}>Thông tin giải</a>
			{/if}
		</nav>
	</header>

	<main id="top">
		<section class="hero" aria-labelledby="hero-title">
			<div class="hero-image" aria-hidden="true"></div>
			<div class="hero-shade" aria-hidden="true"></div>
			<div class="hero-noise" aria-hidden="true"></div>
			<div class="hero-content">
				{#if selectedEdition === 'upcoming'}
					<div class="eyebrow"><span class="live-dot"></span> MỘT CHẶNG ĐƯỜNG MỚI ĐANG CHỜ</div>
					<h1 id="hero-title">SINNO CUP tiếp theo<br />sẽ được viết <em>cùng nhau.</em></h1>
					<p class="hero-copy">{currentSeason.description}</p>
					<div class="hero-actions">
						<a class="button button-gold" href="#ky-tiep-theo">Khám phá kỳ tiếp theo <span>↓</span></a>
						{#if previousSeason}
							<button class="text-link" type="button" onclick={() => selectSeason(previousSeason.title)}>Nhìn lại kỳ trước <span>↗</span></button>
						{/if}
					</div>
				{:else}
					<div class="eyebrow"><span class="live-dot"></span> MỘT MÙA GIẢI ĐÁNG NHỚ</div>
					<h1 id="hero-title">{currentSeason.title}<br />vinh quang <em>thuộc về.</em></h1>
					<p class="hero-copy">
						{currentSeason.teams.length} đội bóng. Một chiếc cúp. Và những kỷ niệm sẽ còn được nhắc mãi.
					</p>
					<div class="hero-actions">
						<a class="button button-gold" href="#vinh-quang">Chúc mừng nhà vô địch <span>↗</span></a>
						<a class="text-link" href="#ket-qua">Xem kết quả <span>↓</span></a>
					</div>
				{/if}
			</div>
			<div class="hero-edition">
				<span class="edition-line"></span>
				<span>GIẢI ĐẤU CỦA CHÚNG TA</span>
				<strong>{edition.season}</strong>
			</div>
			<div class="scroll-hint"><span></span> CUỘN ĐỂ KHÁM PHÁ</div>
			<div class="hero-index" aria-hidden="true">01 <span>/</span> 02</div>
		</section>

		{#if selectedEdition === 'upcoming'}
			<section class="upcoming-section section-wrap" id="ky-tiep-theo">
				<div class="section-heading">
					<div>
						<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> {edition.status}</div>
						<h2>Mùa giải mới.<br /><em>Một trang sử mới.</em></h2>
					</div>
					<p>Thông tin chính thức sẽ được bổ sung<br />khi ban tổ chức chốt kế hoạch.</p>
				</div>

				<div class="upcoming-card">
					<div class="upcoming-card-heading">
						<span class="upcoming-kicker">{edition.season}</span>
						<span class="upcoming-status"><span></span>{edition.status}</span>
					</div>
					<div class="edition-details">
						<div class="edition-detail">
							<span>THỜI GIAN</span>
							<strong>{edition.date}</strong>
						</div>
						<div class="edition-detail">
							<span>ĐỊA ĐIỂM</span>
							<strong>{edition.venue}</strong>
						</div>
						<div class="edition-detail">
							<span>THỂ THỨC</span>
							<strong>{edition.format}</strong>
						</div>
					</div>
					<p class="upcoming-note">{edition.description}</p>
					{#if previousSeason}
						<button class="text-link upcoming-archive-link" type="button" onclick={() => selectSeason(previousSeason.title)}>
							Xem thành tích kỳ trước <span>↗</span>
						</button>
					{/if}
				</div>
			</section>
		{:else}
		<section class="champion-section section-wrap" id="vinh-quang">
			<div class="section-heading">
				<div>
					<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> KHOẢNH KHẮC LỊCH SỬ</div>
					<h2>Người viết nên <em>huyền thoại.</em></h2>
				</div>
				<p>{currentSeason.date}<br />{currentSeason.venue} · {currentSeason.format}</p>
			</div>

			<div class="champion-card">
				<div class="champion-photo" aria-hidden="true">
					<div class="photo-overlay"></div>
					<div class="champion-photo-caption"><span>THE WINNERS</span><span>SINNO CUP</span></div>
				</div>
				<div class="champion-info">
					<div class="champion-kicker"><span class="laurel">✳</span> {currentSeason.title.toUpperCase()} <span class="laurel">✳</span></div>
					<img class="champion-emblem" src={trophyLogo} alt="" />
					<h3>{currentSeason.champion}</h3>
					<p class="champion-subtitle">NHÀ VÔ ĐỊCH <span>·</span> {currentSeason.title}</p>
					<div class="champion-divider"><span>✦</span></div>
					<p class="champion-quote">“{currentSeason.quote}”</p>
					<a class="champion-link" href="#loi-ket">Gửi lời chúc mừng <span>↗</span></a>
				</div>
				<div class="champion-ribbon"><span>01</span> / CHAMPION</div>
			</div>

			<div class="award-card">
				<div class="award-icon" aria-hidden="true">
					<svg viewBox="0 0 64 64" fill="none">
						<path d="M22 11h20v8c0 10-4.7 16-10 16s-10-6-10-16v-8Z" stroke="currentColor" stroke-width="1.5" />
						<path d="M22 16h-8v4c0 7 4 11 11 12m17-16h8v4c0 7-4 11-11 12M32 35v9m-10 7h20m-15-7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
						<path d="m32 14 1.5 3.2 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.5-.5L32 14Z" fill="currentColor" />
					</svg>
				</div>
				<div class="award-copy">
					<span class="award-label">GIẢI THƯỞNG CÁ NHÂN</span>
					<h3>Cầu thủ xuất sắc nhất giải</h3>
					<p>{currentSeason.mvp ? `Danh hiệu thuộc về ${currentSeason.mvp}.` : 'Chủ nhân danh hiệu sẽ sớm được xướng tên.'}</p>
				</div>
				<div class="award-placeholder"><span>{currentSeason.mvp ? '✦' : '?'}</span><small>{currentSeason.mvp ? 'CẦU THỦ XUẤT SẮC' : 'ĐANG CHỜ CẬP NHẬT'}</small></div>
			</div>
		</section>

		<section class="standings-section" id="bang-xep-hang">
			<div class="section-wrap standings-inner">
				<div class="standings-heading">
					<div>
						<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> KẾT QUẢ CHUNG CUỘC</div>
						<h2>Bảng vàng <em>vinh danh.</em></h2>
					</div>
					<div class="team-count"><strong>{String(currentSeason.teams.length).padStart(2, '0')}</strong><span>ĐỘI BÓNG<br />THAM DỰ</span></div>
				</div>
				<div class="standings-table">
					<div class="table-head"><span>HẠNG</span><span>ĐỘI BÓNG</span><span>THÀNH TÍCH</span><span>VỊ TRÍ</span></div>
					{#each currentSeason.teams as team}
						<div class="team-row {team.tone}">
							<span class="team-rank">{team.rank}</span>
							<div class="team-name-cell">
								<span class:has-image={Boolean(team.image)} class="team-monogram">{#if team.image}<img src={team.image} alt="" />{:else}{team.icon}{/if}</span>
								<strong>{team.name}</strong>
							</div>
							<span class="team-result">{team.result}</span>
							<span class="team-position">
								{#if team.tone === 'champion'}
									<svg class="position-cup" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path d="M7 3h10v4c0 4-2 6.5-5 7.5C9 13.5 7 11 7 7V3Z" fill="currentColor" />
										<path d="M7 5H4v2c0 2.5 1.5 4 4.2 4.5M17 5h3v2c0 2.5-1.5 4-4.2 4.5M12 14.5V19m-4 2h8m-6-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
										<path d="m12 5 .7 1.4 1.5.2-1.1 1.1.3 1.5L12 8.5l-1.4.7.3-1.5-1.1-1.1 1.5-.2L12 5Z" fill="#302513" />
									</svg>
								{/if}
								{team.position.toUpperCase()}
							</span>
						</div>
					{/each}
				</div>
				<p class="standings-note"><span>✳</span> Thành tích chung cuộc của {currentSeason.title}.</p>
			</div>
		</section>

		{#if hasTeamMembers}
			<section class="members-section" id="thanh-vien">
				<div class="section-wrap">
					<div class="section-heading members-heading">
						<div>
							<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> NHỮNG NGƯỜI LÀM NÊN ĐỘI BÓNG</div>
							<h2>Thành viên <em>các đội.</em></h2>
						</div>
						<p>Danh sách thành viên của<br />{currentSeason.title}.</p>
					</div>
					<div class="members-grid">
						{#each currentSeason.teams as team}
							<article class="members-card {team.tone}">
								<div class="members-card-heading">
									<span class:has-image={Boolean(team.image)} class="team-monogram">{#if team.image}<img src={team.image} alt="" />{:else}{team.icon}{/if}</span>
									<div><h3>{team.name}</h3><span>{team.members.length} thành viên</span></div>
								</div>
								{#if team.members.length > 0}
									<ol class="member-list">
										{#each team.members as member, index}
											<li><span>{String(index + 1).padStart(2, '0')}</span>{member}</li>
										{/each}
									</ol>
								{:else}
									<p class="members-empty">Chưa cập nhật thành viên.</p>
								{/if}
							</article>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		{#if topScorersRanked.length > 0}
			<section class="top-scorers-section" id="vua-pha-luoi">
				<div class="section-wrap">
					<div class="section-heading top-scorers-heading">
						<div>
							<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> NHỮNG CHÂN SÚT XUẤT SẮC</div>
							<h2>Vua phá <em>lưới.</em></h2>
						</div>
						<p>Những cầu thủ ghi nhiều bàn thắng nhất<br />{currentSeason.title}.</p>
					</div>
					<div class="top-scorers-table">
						<div class="top-scorers-table-head"><span>HẠNG</span><span>CẦU THỦ</span><span>ĐỘI BÓNG</span><span>BÀN THẮNG</span></div>
						{#each topScorersRanked as scorer}
							<div class:top-scorer-leader={scorer.rank === 1} class="top-scorer-row">
								<span class="top-scorer-rank">{String(scorer.rank).padStart(2, '0')}</span>
								<strong class="top-scorer-name">{scorer.name}</strong>
								<span class="top-scorer-team">{scorer.team}</span>
								<strong class="top-scorer-goals">{scorer.goals}<span> bàn</span></strong>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<section class="results-section section-wrap" id="ket-qua">
			<div class="section-heading results-heading">
				<div>
					<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> HÀNH TRÌNH SINNO CUP</div>
					<h2>{currentSeason.rounds.length} vòng đấu.<br /><em>Một mùa đáng nhớ.</em></h2>
				</div>
				<p>Cùng nhìn lại kết quả của<br />từng vòng đấu.</p>
			</div>
			<div class="round-grid">
				{#each currentSeason.rounds as round, index}
					<article class="round-card">
						<div class="round-card-top">
							<span class="round-index">0{index + 1}</span>
							<span class="round-label">{currentSeason.title} <span>·</span> {round.name.toUpperCase()}</span>
						</div>
						<div class="round-matches">
							{#each round.matches as match}
								<div class="match-row">
									<span class="match-team">{match.home}</span>
									<strong class="match-score">{match.homeScore}<span>–</span>{match.awayScore}</strong>
									<span class="match-team away-team">{match.away}</span>
								</div>
							{/each}
						</div>
						<div class="round-card-bottom">
							<div>
								<h3>{round.name}</h3>
								<p>Kết quả chung cuộc</p>
							</div>
							<span class="round-finished">ĐÃ KẾT THÚC</span>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section class="highlights-section section-wrap" id="khoanh-khac">
			<div class="section-heading highlights-heading">
				<div>
					<div class="eyebrow muted-eyebrow"><span class="tiny-star">✳</span> NHỮNG ĐIỀU CÒN ĐỌNG LẠI</div>
					<h2>Trận đấu qua đi.<br /><em>Kỷ niệm ở lại.</em></h2>
				</div>
				<p>Mỗi trận bóng là một câu chuyện.<br />Đây là nơi câu chuyện ấy bắt đầu.</p>
			</div>
			<div class="highlight-grid">
				{#each currentSeason.highlights as highlight, index}
					<a
						class="highlight-card"
						href={highlightPath(currentSeason, highlight, index, currentSeason.highlights, seasonsNewestFirst)}
						aria-label={`Đọc ${highlight.title}`}
					>
						<div class="highlight-topline"><span>{highlight.tag}</span><span>✳</span></div>
						<div class="highlight-number">{highlight.number}</div>
						<div class="highlight-bottom">
							<h3>{highlight.title}</h3>
							<p>{highlight.summary}</p>
						</div>
						<div class="highlight-corner" aria-hidden="true">↗</div>
					</a>
				{/each}
			</div>
			<p class="highlights-note">Bạn có ảnh hoặc video đáng nhớ? Hãy bổ sung để lưu giữ trọn vẹn mùa giải.</p>
		</section>

		<section class="closing-section" id="loi-ket">
			<div class="closing-glow"></div>
			<div class="closing-content">
				<div class="eyebrow closing-eyebrow"><span class="closing-star">✳</span> MỘT GIẢI ĐẤU. MỘT ĐẠI GIA ĐÌNH.</div>
				<h2>Chức vô địch là của <em>{currentSeason.champion}.</em><br />Kỷ niệm là của <em>chúng ta.</em></h2>
				<p>Cảm ơn {currentSeason.teams.length} đội bóng đã làm nên một mùa SINNO CUP thật đáng nhớ.</p>
				<button class="button button-gold celebrate-button" type="button" onclick={celebrate}>
					{isCelebrating ? 'Mãi tự hào, nhà vô địch!' : 'Gửi lời chúc mừng'} <span>✦</span>
				</button>
				<div class="closing-signature">SINNO CUP <span>·</span> MỘT MÙA GIẢI KHÔNG QUÊN</div>
			</div>
			{#if isCelebrating}
				<div class="confetti-layer" aria-hidden="true">
					{#each confetti as piece (piece.id)}
						<span
							class="confetti-piece"
							style:left={piece.left}
							style:animation-delay={piece.delay}
							style:animation-duration={piece.duration}
							style:--piece-color={piece.color}
							style:--piece-rotation={piece.rotation}
						></span>
					{/each}
				</div>
			{/if}
		</section>
		{/if}
	</main>

	<footer class="footer">
		<a class="footer-brand" href="#top">SINNO <span>CUP</span></a>
		<p>Được tạo nên từ tình yêu với trái bóng tròn.</p>
		<div class="footer-links">
			<!-- <a class="back-top" href="/admin">QUẢN TRỊ ↗</a>
			<a class="back-top" href="#top">LÊN ĐẦU TRANG ↑</a> -->
		</div>
	</footer>
</div>
