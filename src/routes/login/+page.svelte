<script lang="ts">
	import trophyLogo from '#lib/assets/trophy-logo.svg';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import './login.css';

	let password = $state('');
	let nextPath = $state('/admin');
	let checkingSession = $state(true);
	let submitting = $state(false);
	let errorMessage = $state('');

	onMount(() => {
		const requestedPath = new URLSearchParams(window.location.search).get('next');
		nextPath = requestedPath === '/admin' ? requestedPath : '/admin';
		void checkSession();
	});

	async function checkSession() {
		try {
			const response = await fetch('/api/admin/session', { cache: 'no-store' });
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Không thể kiểm tra phiên đăng nhập.');
			if (result.authenticated) await goto(nextPath, { replaceState: true });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';
		} finally {
			checkingSession = false;
		}
	}

	async function login(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/admin/session', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ password })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message ?? 'Đăng nhập thất bại.');
			await goto(nextPath, { replaceState: true });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Không thể đăng nhập.';
			password = '';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Đăng nhập quản trị — SINNO CUP</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="login-shell">
	<header class="login-topbar">
		<a class="admin-brand" href="/" aria-label="Trở về SINNO CUP">
			<img class="admin-brand-mark" src={trophyLogo} alt="" />
			<span>SINNO <em>CUP</em><small>QUẢN TRỊ GIẢI ĐẤU</small></span>
		</a>
		<a class="admin-public-link" href="/">Về trang chủ <span>↗</span></a>
	</header>

	<main class="login-main">
		<section class="admin-login-card">
			<div class="admin-eyebrow">KHÔNG GIAN BAN TỔ CHỨC</div>
			<h1>Chào mừng <em>trở lại.</em></h1>
			<p>Đăng nhập để quản lý thông tin các mùa giải SINNO CUP.</p>

			{#if checkingSession}
				<div class="admin-state-card login-checking"><span class="admin-spinner"></span> Đang kiểm tra phiên làm việc…</div>
			{:else}
				{#if errorMessage}
					<div class="admin-alert error" role="alert">{errorMessage}</div>
				{/if}
				<form class="admin-login-form" onsubmit={login}>
					<label for="admin-password">Mật khẩu quản trị</label>
					<input
						id="admin-password"
						type="password"
						autocomplete="current-password"
						bind:value={password}
						required
					/>
					<button class="admin-primary-button" type="submit" disabled={submitting}>
						{submitting ? 'Đang đăng nhập…' : 'Đăng nhập'} <span>↗</span>
					</button>
				</form>
				<div class="admin-login-foot"><span>✳</span> Chỉ ban tổ chức mới có quyền chỉnh sửa thông tin giải đấu.</div>
			{/if}
		</section>
	</main>
</div>
