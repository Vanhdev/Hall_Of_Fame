<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import './admin.css';
	import HighlightRichTextEditor from '../../lib/components/HighlightRichTextEditor.svelte';
	import {
		createSeason,
		defaultCupData,
		type CupData,
		type SeasonStatus,
		type Team
	} from '../../lib/sinno-cup';
	import trophyLogo from '#lib/assets/trophy-logo.svg';

	let authenticated = $state(false);
	let checkingSession = $state(true);
	let cup = $state<CupData>(structuredClone(defaultCupData));
	let selectedSeason = $state('');
	let activeSeason = $derived(cup.seasons[selectedSeason]);
	let defaultSeason = $derived(
		Object.values(cup.seasons).find((season) => season.status === 'current') ??
			Object.values(cup.seasons).find((season) => season.status === 'upcoming')
	);
	let seasonsNewestFirst = $derived(
		Object.entries(cup.seasons).sort(([, first], [, second]) => second.createdAt - first.createdAt)
	);
	let loading = $state(false);
	let cupLoaded = $state(false);
	let saving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	onMount(() => {
		void checkSession();
	});

	async function checkSession() {
		checkingSession = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/admin/session');
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Không thể kiểm tra phiên đăng nhập.');
			authenticated = result.authenticated === true;
			if (authenticated) {
				await loadCup();
			} else {
				await goto('/login?next=%2Fadmin', { replaceState: true });
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';
		} finally {
			checkingSession = false;
		}
	}

	async function loadCup() {
		loading = true;
		cupLoaded = false;
		try {
			const response = await fetch('/api/cup', { cache: 'no-store' });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Không thể tải dữ liệu mùa giải.');
			cup = result as CupData;
			selectedSeason = selectedSeason in cup.seasons ? selectedSeason : defaultSeason?.title ?? '';
			cupLoaded = true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu mùa giải.';
		} finally {
			loading = false;
		}
	}

	async function logout() {
		try {
			const response = await fetch('/api/admin/session', { method: 'DELETE' });
			if (!response.ok) {
				errorMessage = 'Không thể kết thúc phiên đăng nhập. Vui lòng thử lại.';
				return;
			}
			authenticated = false;
			successMessage = '';
			await goto('/login', { replaceState: true });
		} catch {
			errorMessage = 'Không thể kết nối máy chủ để kết thúc phiên đăng nhập.';
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const response = await fetch('/api/cup', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(cup)
			});
			const result = await response.json();
			if (response.status === 401) {
				authenticated = false;
				await goto('/login?next=%2Fadmin', { replaceState: true });
				return;
			}
			if (!response.ok) throw new Error(result.message ?? 'Không thể lưu dữ liệu.');
			cup = result as CupData;
			selectedSeason = selectedSeason in cup.seasons ? selectedSeason : defaultSeason?.title ?? '';
			successMessage = 'Đã lưu và cập nhật dữ liệu trên trang công khai.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể lưu dữ liệu.';
		} finally {
			saving = false;
		}
	}

	function createNewSeason() {
		let number = Object.keys(cup.seasons).length + 1;
		let title = `SINNO CUP · MÙA ${number}`;
		while (Object.hasOwn(cup.seasons, title)) title = `SINNO CUP · MÙA ${++number}`;
		const newestCreatedAt = Math.max(...Object.values(cup.seasons).map((season) => season.createdAt));
		const season = createSeason(title, Math.max(Date.now(), newestCreatedAt + 1));
		for (const existing of Object.values(cup.seasons)) {
			if (existing.status === 'upcoming') existing.status = 'previous';
		}
		cup.seasons[title] = season;
		selectedSeason = title;
		successMessage = '';
		errorMessage = '';
	}

	function renameSeason(event: Event) {
		const title = (event.currentTarget as HTMLInputElement).value;
		const oldKey = selectedSeason;
		const season = cup.seasons[oldKey];
		if (!season) {
			errorMessage = 'Không tìm thấy mùa giải cần đổi tên. Hãy tải lại dữ liệu.';
			return;
		}
		if (['__proto__', 'constructor', 'prototype'].includes(title)) {
			errorMessage = 'Tên mùa này không thể dùng làm khóa lưu trữ.';
			return;
		}
		if (title !== oldKey && Object.hasOwn(cup.seasons, title)) {
			errorMessage = 'Tên mùa này đã được sử dụng. Hãy chọn tên khác.';
			return;
		}
		errorMessage = '';
		season.title = title;
		if (title === oldKey) return;
		delete cup.seasons[oldKey];
		cup.seasons[title] = season;
		selectedSeason = title;
	}

	function setSeasonStatus(status: SeasonStatus) {
		activeSeason.status = status;
		if (status !== 'previous') {
			for (const season of Object.values(cup.seasons)) {
				if (season !== activeSeason && season.status === status) season.status = 'previous';
			}
		}
	}

	function addTeam() {
		activeSeason.teams.push({
			rank: String(activeSeason.teams.length + 1).padStart(2, '0'),
			name: '',
			result: '',
			position: '',
			icon: '',
			image: '',
			tone: 'regular',
			members: []
		});
	}

	function addTeamMember(team: Team) {
		team.members.push('');
	}

	async function uploadTeamImage(team: Team, event: Event) {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			errorMessage = 'Ảnh đội phải có định dạng JPEG, PNG hoặc WebP.';
			return;
		}
		if (file.size > 512 * 1024) {
			errorMessage = 'Ảnh đội không được vượt quá 512 KB.';
			return;
		}

		try {
			team.image = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === 'string') resolve(reader.result);
					else reject(new Error('Không thể đọc tệp ảnh.'));
				};
				reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
				reader.readAsDataURL(file);
			});
			errorMessage = '';
			successMessage = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể đọc tệp ảnh.';
		}
	}

	function addTopScorer() {
		activeSeason.topScorers.push({ name: '', team: '', goals: 0 });
	}

	function addRound() {
		activeSeason.rounds.push({ name: `Vòng ${activeSeason.rounds.length + 1}`, matches: [] });
	}

	function addMatch(roundIndex: number) {
		activeSeason.rounds[roundIndex].matches.push({
			home: '',
			homeScore: 0,
			awayScore: 0,
			away: ''
		});
	}

	function addHighlight() {
		activeSeason.highlights.push({
			number: String(activeSeason.highlights.length + 1).padStart(2, '0'),
			title: '',
			summary: '',
			tag: 'KHOẢNH KHẮC',
			content: ''
		});
	}

</script>

<svelte:head>
	<title>Quản trị SINNO CUP</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="admin-shell">
	<header class="admin-topbar">
		<a class="admin-brand" href="/" aria-label="Trở về SINNO CUP">
			<img class="admin-brand-mark" src={trophyLogo} alt="" />
			<span>SINNO <em>CUP</em><small>QUẢN TRỊ GIẢI ĐẤU</small></span>
		</a>
		<div class="admin-top-actions">
			<a class="admin-public-link" href="/">Xem trang công khai <span>↗</span></a>
			{#if authenticated}
				<button class="admin-logout" type="button" onclick={logout}>Đăng xuất</button>
			{/if}
		</div>
	</header>

	<main class="admin-main">
		{#if checkingSession}
			<div class="admin-state-card"><span class="admin-spinner"></span> Đang kiểm tra phiên làm việc…</div>
		{:else if authenticated}
			<div class="admin-heading">
				<div>
					<div class="admin-eyebrow"><span></span> BẢNG ĐIỀU KHIỂN</div>
					<h1>Không gian <em>mùa giải.</em></h1>
					<p>Quản lý nội dung hiển thị trên trang SINNO CUP.</p>
				</div>
				<a class="admin-back-link" href="/">← Trở về website</a>
			</div>

			{#if errorMessage}
				<div class="admin-alert error" role="alert">{errorMessage}</div>
			{/if}
			{#if successMessage}
				<div class="admin-alert success" role="status"><span>✓</span>{successMessage}</div>
			{/if}

			<div class="admin-workspace">
				<aside class="admin-sidebar">
					<div class="admin-sidebar-label">CÁC MÙA GIẢI</div>
					{#each seasonsNewestFirst as [title, season], index (title)}
						<button
							class:active={selectedSeason === title}
							class="admin-section-button"
							type="button"
							onclick={() => (selectedSeason = title)}
						>
							<span class="section-symbol">{String(index + 1).padStart(2, '0')}</span>
							<span><strong>{title}</strong><small>{season.status === 'current' ? 'Mùa hiện tại' : season.status === 'upcoming' ? 'Kỳ tiếp theo' : 'Kỳ trước'}</small></span>
							{#if season.status === 'current'}<span class="section-arrow">✦</span>{/if}
						</button>
					{/each}
					<button class="add-item-button season-create-button" type="button" disabled={!cupLoaded || saving} onclick={createNewSeason}>
						<span class="action-icon" aria-hidden="true">＋</span> Tạo mùa giải mới
					</button>
					<div class="admin-sidebar-note">
						<span class="note-star">✳</span>
						<strong>Quản lý trạng thái các kỳ</strong>
						<p>Đánh dấu một kỳ là hiện tại hoặc tiếp theo; các kỳ đã qua được lưu thành kỳ trước.</p>
					</div>
				</aside>

				<form class="admin-editor" onsubmit={save}>
					{#if loading}
						<div class="admin-state-card"><span class="admin-spinner"></span> Đang tải dữ liệu…</div>
					{:else if !cupLoaded}
						<div class="admin-state-card load-error">
							<div><strong>Chưa tải được dữ liệu mùa giải.</strong><p>Hãy thử tải lại trước khi chỉnh sửa.</p></div>
							<button class="add-item-button" type="button" onclick={loadCup}>Tải lại dữ liệu ↻</button>
						</div>
					{:else}
						<div class="editor-heading">
							<div>
								<div class="admin-eyebrow">{activeSeason.status === 'current' ? 'KỲ HIỆN TẠI' : activeSeason.status === 'upcoming' ? 'KỲ TIẾP THEO' : 'KỲ TRƯỚC'}</div>
								<h2>{activeSeason.title || 'Đặt tên mùa giải.'}</h2>
								<p>Cập nhật thông tin, kết quả và những dấu ấn của mùa giải này.</p>
							</div>
							<span class:ended={activeSeason.status === 'previous'} class="editor-status">
								<i></i>{activeSeason.status === 'current' ? 'HIỆN TẠI' : activeSeason.status === 'upcoming' ? 'SẮP DIỄN RA' : 'ĐÃ KẾT THÚC'}
							</span>
						</div>

						<section class="editor-card">
							<div class="editor-card-heading"><span>01</span><div><h3>Tổng quan mùa giải</h3><p>Tên mùa giải được dùng làm khóa lưu trữ duy nhất.</p></div></div>
							<div class="admin-fields two-columns">
								<label class="admin-field full-field"><span>Tên mùa giải (Key)</span><input value={activeSeason.title} oninput={renameSeason} maxlength="100" required /></label>
								<label class="admin-field"><span>Trạng thái kỳ</span>
									<select value={activeSeason.status} onchange={(event) => setSeasonStatus(event.currentTarget.value as SeasonStatus)}>
										<option value="current">Kỳ hiện tại</option>
										<option value="upcoming">Đang chuẩn bị</option>
										<option value="previous">Kỳ trước (đã kết thúc)</option>
									</select>
								</label>
								<label class="admin-field"><span>Thời gian tổ chức</span><input bind:value={activeSeason.date} maxlength="100" /></label>
								<label class="admin-field"><span>Địa điểm</span><input bind:value={activeSeason.venue} maxlength="100" /></label>
								<label class="admin-field"><span>Thể thức</span><input bind:value={activeSeason.format} maxlength="100" /></label>
								<label class="admin-field"><span>Nhà vô địch</span><input bind:value={activeSeason.champion} maxlength="100" required={activeSeason.status === 'previous'} placeholder="Có thể để trống khi chưa kết thúc" /></label>
								<label class="admin-field"><span>Cầu thủ xuất sắc nhất (MVP)</span><input bind:value={activeSeason.mvp} maxlength="100" placeholder="Có thể để trống" /></label>
								<label class="admin-field full-field"><span>Lời giới thiệu mùa giải</span><textarea bind:value={activeSeason.description} maxlength="300" rows="3"></textarea></label>
								<label class="admin-field full-field"><span>Lời chúc / câu trích dẫn</span><textarea bind:value={activeSeason.quote} maxlength="300" rows="3"></textarea></label>
							</div>
						</section>

						<section class="editor-card">
							<div class="editor-card-heading"><span>02</span><div><h3>Bảng xếp hạng</h3><p>Thêm đội bóng và ghi nhận thành tích cuối mùa.</p></div></div>
							<div class="admin-list">
								{#each activeSeason.teams as team, index}
									<div class="admin-list-item team-editor">
										<div class="list-item-index">{String(index + 1).padStart(2, '0')}</div>
										<div class="team-editor-fields">
											<div class="admin-fields team-fields">
												<label class="admin-field"><span>Hạng</span><input bind:value={team.rank} maxlength="20" required /></label>
												<label class="admin-field"><span>Tên đội</span><input bind:value={team.name} maxlength="80" required /></label>
												<label class="admin-field"><span>Thành tích</span><input bind:value={team.result} maxlength="80" required /></label>
												<label class="admin-field"><span>Vị trí</span><input bind:value={team.position} maxlength="80" required /></label>
												<label class="admin-field"><span>Chữ viết tắt</span><input bind:value={team.icon} maxlength="8" /></label>
												<label class="admin-field"><span>Kiểu hiển thị</span>
													<select bind:value={team.tone}>
														<option value="champion">Vô địch</option>
														<option value="silver">Á quân</option>
														<option value="bronze">Hạng ba</option>
														<option value="regular">Thông thường</option>
													</select>
												</label>
											</div>
											<div class="team-image-editor">
												{#if team.image}
													<img class="team-image-preview" src={team.image} alt={`Ảnh đại diện ${team.name || 'đội bóng'}`} />
												{:else}
													<div class="team-image-placeholder" aria-hidden="true">{team.icon || 'Ảnh đội'}</div>
												{/if}
												<label class="team-image-upload">
													<span>{team.image ? 'Thay ảnh đội' : 'Tải ảnh đội lên'}</span>
													<input
														type="file"
														accept="image/jpeg,image/png,image/webp"
														aria-label={`Tải ảnh cho ${team.name || `đội ${index + 1}`}`}
														onchange={(event) => uploadTeamImage(team, event)}
													/>
												</label>
												<small>JPEG, PNG hoặc WebP · tối đa 512 KB</small>
												{#if team.image}
													<button class="remove-team-image" type="button" onclick={() => (team.image = '')}>Xóa ảnh</button>
												{/if}
											</div>
											<div class="team-members-editor">
												<div class="team-members-heading">
													<div><strong>Thành viên đội</strong><span>{team.members.length} thành viên</span></div>
													<button class="add-member-button" type="button" onclick={() => addTeamMember(team)}><span class="action-icon" aria-hidden="true">＋</span> Thêm thành viên</button>
												</div>
												{#if team.members.length > 0}
													<div class="team-member-list">
														{#each team.members as member, memberIndex}
															<label class="admin-field">
																<span>Thành viên {memberIndex + 1}</span>
																<div class="team-member-input">
																	<input bind:value={team.members[memberIndex]} maxlength="100" required />
																	<button class="remove-button" type="button" aria-label={`Xóa thành viên ${memberIndex + 1}`} onclick={() => team.members.splice(memberIndex, 1)}>×</button>
																</div>
															</label>
														{/each}
													</div>
												{/if}
											</div>
										</div>
										<button class="remove-button" type="button" aria-label="Xóa đội" onclick={() => activeSeason.teams.splice(index, 1)}>×</button>
									</div>
								{/each}
							</div>
							<button class="add-item-button" type="button" onclick={addTeam}><span class="action-icon" aria-hidden="true">＋</span> Thêm đội bóng</button>
						</section>

						<section class="editor-card">
							<div class="editor-card-heading"><span>03</span><div><h3>Bảng xếp hạng vua phá lưới</h3><p>Nhập cầu thủ, đội bóng và số bàn thắng của mùa giải.</p></div></div>
							<div class="admin-list">
								{#each activeSeason.topScorers as scorer, index}
									<div class="admin-list-item scorer-editor">
										<div class="list-item-index">{String(index + 1).padStart(2, '0')}</div>
										<div class="admin-fields scorer-fields">
											<label class="admin-field"><span>Tên cầu thủ</span><input bind:value={scorer.name} maxlength="100" required /></label>
											<label class="admin-field"><span>Đội bóng</span><input bind:value={scorer.team} maxlength="80" required /></label>
											<label class="admin-field"><span>Số bàn thắng</span><input type="number" min="0" max="999" step="1" bind:value={scorer.goals} required /></label>
										</div>
										<button class="remove-button" type="button" aria-label="Xóa cầu thủ khỏi bảng vua phá lưới" onclick={() => activeSeason.topScorers.splice(index, 1)}>×</button>
									</div>
								{/each}
							</div>
							<button class="add-item-button" type="button" onclick={addTopScorer}><span class="action-icon" aria-hidden="true">＋</span> Thêm cầu thủ</button>
						</section>

						<section class="editor-card">
							<div class="editor-card-heading"><span>04</span><div><h3>Kết quả thi đấu</h3><p>Tạo vòng đấu, thêm trận và nhập tỉ số.</p></div></div>
							<div class="round-editor-list">
								{#each activeSeason.rounds as round, roundIndex}
									<div class="round-editor">
										<div class="round-editor-heading">
											<label class="admin-field"><span>Tên vòng đấu</span><input bind:value={round.name} maxlength="80" required /></label>
											<button class="remove-button" type="button" aria-label="Xóa vòng đấu" onclick={() => activeSeason.rounds.splice(roundIndex, 1)}>×</button>
										</div>
										{#each round.matches as match, matchIndex}
											<div class="match-editor">
												<label class="admin-field"><span>Đội nhà</span><input bind:value={match.home} maxlength="80" required /></label>
												<label class="admin-field score-field"><span>Tỉ số</span><div><input type="number" min="0" max="99" bind:value={match.homeScore} /><b>–</b><input type="number" min="0" max="99" bind:value={match.awayScore} /></div></label>
												<label class="admin-field"><span>Đội khách</span><input bind:value={match.away} maxlength="80" required /></label>
												<button class="remove-button" type="button" aria-label="Xóa trận" onclick={() => round.matches.splice(matchIndex, 1)}>×</button>
											</div>
										{/each}
										<button class="add-match-button" type="button" onclick={() => addMatch(roundIndex)}><span class="action-icon" aria-hidden="true">＋</span> Thêm trận đấu</button>
									</div>
								{/each}
							</div>
							<button class="add-item-button" type="button" onclick={addRound}><span class="action-icon" aria-hidden="true">＋</span> Thêm vòng đấu</button>
						</section>

						<section class="editor-card">
							<div class="editor-card-heading"><span>05</span><div><h3>Điểm nhấn mùa giải</h3><p>Những câu chuyện đáng nhớ được hiển thị thành các thẻ nổi bật.</p></div></div>
							<div class="admin-list">
								{#each activeSeason.highlights as highlight, index}
									<div class="admin-list-item highlight-editor">
										<div class="list-item-index">{String(index + 1).padStart(2, '0')}</div>
										<div class="admin-fields two-columns">
											<label class="admin-field"><span>Nhãn</span><input bind:value={highlight.tag} maxlength="40" /></label>
											<label class="admin-field"><span>Tiêu đề</span><input bind:value={highlight.title} maxlength="120" required /></label>
											<label class="admin-field full-field"><span>Tóm tắt</span><textarea bind:value={highlight.summary} maxlength="500" rows="3"></textarea></label>
											<div class="admin-field full-field highlight-content-editor">
												<span>Nội dung (văn bản và ảnh)</span>
												<HighlightRichTextEditor bind:value={highlight.content} />
												<small>Chọn ảnh trong khung để chỉnh mô tả, thay ảnh hoặc xóa ảnh.</small>
											</div>
										</div>
										<button class="remove-button" type="button" aria-label="Xóa điểm nhấn" onclick={() => activeSeason.highlights.splice(index, 1)}>×</button>
									</div>
								{/each}
							</div>
							<button class="add-item-button" type="button" onclick={addHighlight}><span class="action-icon" aria-hidden="true">＋</span> Thêm điểm nhấn</button>
						</section>
					{/if}
					<div class="admin-savebar">
						<span>Dữ liệu hiển thị công khai sau khi lưu thành công.</span>
						<button class="admin-primary-button" type="submit" disabled={saving || loading || !cupLoaded}>
							{saving ? 'Đang lưu…' : 'Lưu thay đổi'} <span>↗</span>
						</button>
					</div>
				</form>
			</div>
		{:else}
			<div class="admin-state-card load-error" role="alert">{errorMessage}</div>
		{/if}
	</main>
</div>
