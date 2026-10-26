<script lang="ts">
	let { value = $bindable('') } = $props();
	let editor: HTMLDivElement;
	let imageInput: HTMLInputElement;
	let savedRange: Range | undefined;
	let selectedImage = $state<HTMLImageElement>();
	let uploadError = $state('');

	function saveSelection() {
		const selection = window.getSelection();
		if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
			savedRange = selection.getRangeAt(0).cloneRange();
		}
	}

	function updateValue() {
		value = editor.innerHTML;
	}

	function format(command: string, argument?: string) {
		editor.focus();
		if (savedRange) {
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(savedRange);
		}
		document.execCommand(command, false, argument);
		saveSelection();
		updateValue();
	}

	function createLink() {
		const href = window.prompt('Nhập đường dẫn liên kết');
		if (!href) return;
		format('createLink', href);
	}

	function openImagePicker() {
		saveSelection();
		imageInput.click();
	}

	async function insertImage(event: Event) {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			uploadError = 'Ảnh phải có định dạng JPEG, PNG hoặc WebP.';
			return;
		}
		if (file.size > 512 * 1024) {
			uploadError = 'Ảnh không được vượt quá 512 KB.';
			return;
		}

		try {
			const imageData = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === 'string') resolve(reader.result);
					else reject(new Error('Không thể đọc tệp ảnh.'));
				};
				reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
				reader.readAsDataURL(file);
			});

			if (selectedImage?.isConnected) {
				selectedImage.src = imageData;
			} else {
				const selection = window.getSelection();
				if (savedRange && editor.contains(savedRange.startContainer)) {
					selection?.removeAllRanges();
					selection?.addRange(savedRange);
				}
				const image = document.createElement('img');
				image.src = imageData;
				image.alt = file.name.replace(/\.[^.]+$/, '');
				const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
				if (range && editor.contains(range.startContainer)) {
					range.deleteContents();
					range.insertNode(image);
					range.setStartAfter(image);
					range.collapse(true);
					selection?.removeAllRanges();
					selection?.addRange(range);
				} else {
					editor.append(image);
				}
			}
			uploadError = '';
			updateValue();
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Không thể đọc tệp ảnh.';
		}
	}

	function selectImage(event: MouseEvent) {
		const target = event.target;
		if (target instanceof HTMLImageElement && editor.contains(target)) {
			selectedImage?.classList.remove('selected-image');
			selectedImage = target;
			target.classList.add('selected-image');
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNode(target);
			selection?.removeAllRanges();
			selection?.addRange(range);
			savedRange = range.cloneRange();
		} else if (selectedImage) {
			selectedImage.classList.remove('selected-image');
			selectedImage = undefined;
		}
	}

	function updateImageAlt(event: Event) {
		if (selectedImage) {
			selectedImage.alt = (event.currentTarget as HTMLInputElement).value;
			updateValue();
		}
	}

	function removeSelectedImage() {
		selectedImage?.remove();
		selectedImage = undefined;
		updateValue();
	}
</script>

<div class="rich-text-editor">
	<div class="rich-text-toolbar" role="toolbar" aria-label="Định dạng nội dung">
		<button type="button" aria-label="In đậm" title="In đậm" onpointerdown={(event) => event.preventDefault()} onclick={() => format('bold')}><strong>B</strong></button>
		<button type="button" aria-label="In nghiêng" title="In nghiêng" onpointerdown={(event) => event.preventDefault()} onclick={() => format('italic')}><em>I</em></button>
		<button type="button" aria-label="Gạch chân" title="Gạch chân" onpointerdown={(event) => event.preventDefault()} onclick={() => format('underline')}><u>U</u></button>
		<span class="toolbar-divider"></span>
		<button type="button" aria-label="Tiêu đề" title="Tiêu đề" onpointerdown={(event) => event.preventDefault()} onclick={() => format('formatBlock', 'h2')}>H₂</button>
		<button type="button" aria-label="Trích dẫn" title="Trích dẫn" onpointerdown={(event) => event.preventDefault()} onclick={() => format('formatBlock', 'blockquote')}>❝</button>
		<button type="button" aria-label="Danh sách dấu đầu dòng" title="Danh sách dấu đầu dòng" onpointerdown={(event) => event.preventDefault()} onclick={() => format('insertUnorderedList')}>• ≡</button>
		<button type="button" aria-label="Danh sách đánh số" title="Danh sách đánh số" onpointerdown={(event) => event.preventDefault()} onclick={() => format('insertOrderedList')}>1. ≡</button>
		<span class="toolbar-divider"></span>
		<button type="button" aria-label="Thêm liên kết" title="Thêm liên kết" onpointerdown={(event) => event.preventDefault()} onclick={createLink}>↗</button>
		<button type="button" aria-label="Chèn ảnh" title="Chèn ảnh" onpointerdown={(event) => event.preventDefault()} onclick={openImagePicker}>▧ Ảnh</button>
		<button type="button" aria-label="Xóa định dạng" title="Xóa định dạng" onpointerdown={(event) => event.preventDefault()} onclick={() => format('removeFormat')}>Tx</button>
		<input
			bind:this={imageInput}
			class="image-file-input"
			type="file"
			accept="image/jpeg,image/png,image/webp"
			onchange={insertImage}
		/>
	</div>
	{#if selectedImage?.isConnected}
		<div class="image-edit-toolbar">
			<label>
				Mô tả ảnh
				<input value={selectedImage.alt} maxlength="200" oninput={updateImageAlt} />
			</label>
			<button type="button" onclick={openImagePicker}>Thay ảnh</button>
			<button type="button" onclick={removeSelectedImage}>Xóa ảnh</button>
		</div>
	{/if}
	{#if uploadError}
		<p class="upload-error" role="alert">{uploadError}</p>
	{/if}
	<div
		bind:this={editor}
		class="rich-text-input"
		contenteditable="true"
		tabindex="0"
		role="textbox"
		aria-multiline="true"
		aria-label="Nội dung điểm nhấn"
		bind:innerHTML={value}
		oninput={updateValue}
		onmouseup={saveSelection}
		onkeyup={saveSelection}
		onclick={selectImage}
	></div>
</div>

<style>
	.rich-text-editor {
		min-width: 0;
		border: 1px solid rgba(255, 255, 255, 0.11);
		background: #11130f;
	}

	.rich-text-toolbar,
	.image-edit-toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px;
		padding: 6px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.09);
		background: rgba(255, 255, 255, 0.025);
	}

	.rich-text-toolbar button,
	.image-edit-toolbar button {
		min-width: 30px;
		height: 30px;
		padding: 0 7px;
		border: 1px solid transparent;
		background: transparent;
		color: #c9c3b5;
		font-size: 12px;
		cursor: pointer;
	}

	.rich-text-toolbar button:hover,
	.rich-text-toolbar button:focus-visible,
	.image-edit-toolbar button:hover,
	.image-edit-toolbar button:focus-visible {
		border-color: rgba(217, 181, 107, 0.35);
		color: #ecd08b;
		outline: none;
	}

	.image-edit-toolbar {
		gap: 10px;
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.image-edit-toolbar label {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #aaa79c;
		font-size: 12px;
	}

	.image-edit-toolbar input {
		width: min(280px, 45vw);
		padding: 6px 8px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #11130f;
		color: #eee9de;
		font-size: 12px;
	}

	.toolbar-divider {
		width: 1px;
		height: 20px;
		margin: 0 3px;
		background: rgba(255, 255, 255, 0.12);
	}

	.image-file-input {
		display: none;
	}

	.upload-error {
		margin: 0;
		padding: 8px 12px;
		color: #e2a092;
		font-size: 12px;
	}

	.rich-text-input {
		min-height: 180px;
		padding: 13px;
		color: #eee9de;
		font-size: 13px;
		line-height: 1.75;
		outline: none;
		overflow-wrap: anywhere;
	}

	.rich-text-input:focus {
		box-shadow: inset 0 0 0 1px rgba(217, 181, 107, 0.5);
	}

	.rich-text-input :global(p:first-child) {
		margin-top: 0;
	}

	.rich-text-input :global(p:last-child) {
		margin-bottom: 0;
	}

	.rich-text-input :global(img) {
		max-width: 100%;
		height: auto;
		cursor: pointer;
	}

	.rich-text-input :global(img.selected-image) {
		outline: 2px solid #d9b56b;
		outline-offset: 2px;
	}
</style>
