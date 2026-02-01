/**
 * app.js - メインエントリーポイント
 * アプリケーションの初期化とイベント管理
 */

const App = (() => {
    /**
     * アプリケーションを初期化
     */
    function init() {
        // カレンダーを初期化
        Calendar.init();

        // 検索を初期化
        Search.init();

        // モーダルイベントを設定
        setupModalEvents();

        // 日記モーダルイベントを設定
        setupDiaryModalEvents();

        // 設定モーダルイベントを設定
        setupSettingsModalEvents();

        // キーボードショートカットを設定
        setupKeyboardShortcuts();

        // ストレージ情報を更新
        updateStorageInfo();

        console.log('Calendar Diary App initialized');
    }

    /**
     * モーダル共通イベントを設定
     */
    function setupModalEvents() {
        // 閉じるボタンとオーバーレイ
        document.querySelectorAll('[data-close-modal]').forEach(el => {
            el.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    closeModal(modal);
                }
            });
        });
    }

    /**
     * モーダルを閉じる
     */
    function closeModal(modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * 犬種セレクトボックスを初期化
     */
    async function initDogBreedSelector() {
        const select = document.getElementById('dog-breed-select');
        if (!select) return;

        try {
            const breeds = await Diary.fetchDogBreeds();

            breeds.forEach(breed => {
                const option = document.createElement('option');
                option.value = breed.value;
                option.textContent = breed.label;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load dog breeds:', error);
        }
    }

    /**
     * 日記モーダルイベントを設定
     */
    function setupDiaryModalEvents() {
        const modal = document.getElementById('diary-modal');

        // 保存ボタン
        document.getElementById('diary-save')?.addEventListener('click', () => {
            saveDiary();
        });

        // 削除ボタン
        document.getElementById('diary-delete')?.addEventListener('click', () => {
            const date = document.getElementById('diary-date').value;
            showConfirmDialog(
                '日記を削除',
                'この日記を削除しますか？この操作は取り消せません。',
                () => {
                    Diary.remove(date);
                    Diary.closeModal();
                    Calendar.refresh();
                    Diary.showPreview(date);
                }
            );
        });

        // 画像アップロードボタン
        document.getElementById('image-upload-btn')?.addEventListener('click', () => {
            document.getElementById('image-input').click();
        });

        // 画像ファイル選択
        document.getElementById('image-input')?.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                const images = await Diary.processImages(files);
                Diary.addImages(images);
                Diary.updateImagePreview('image-preview');
            }
            e.target.value = ''; // リセット
        });

        // 犬種セレクトボックスを初期化
        initDogBreedSelector();

        // ランダム犬画像ボタン
        document.getElementById('random-dog-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('random-dog-btn');
            const breedSelect = document.getElementById('dog-breed-select');
            const selectedBreed = breedSelect?.value || '';
            const originalHtml = btn.innerHTML;

            // ローディング状態
            btn.classList.add('loading');
            btn.innerHTML = '<span class="spinner"></span>';

            try {
                if (Diary.getCurrentImages().length >= Diary.MAX_IMAGES) {
                    showToast(`画像は最大${Diary.MAX_IMAGES}枚までです`);
                    return;
                }

                const image = await Diary.fetchRandomDogImage(selectedBreed);

                Diary.addImages([image]);
                Diary.updateImagePreview('image-preview');

                const breedName = breedSelect?.options[breedSelect.selectedIndex]?.text || '犬';
                showToast(`${breedName}の画像を追加しました`);
            } catch (error) {
                showToast('画像の取得に失敗しました');
                console.error(error);
            } finally {
                btn.classList.remove('loading');
                btn.innerHTML = originalHtml;
            }
        });

        // ドラッグ&ドロップ
        const uploadArea = document.getElementById('image-upload');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', async (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const images = await Diary.processImages(files);
                    Diary.addImages(images);
                    Diary.updateImagePreview('image-preview');
                }
            });
        }

        // 自動保存（タイトルと本文の変更時）
        document.getElementById('diary-title')?.addEventListener('input', () => {
            const entry = Diary.getModalData();
            Diary.autoSave(entry);
        });

        document.getElementById('diary-content')?.addEventListener('input', () => {
            const entry = Diary.getModalData();
            Diary.autoSave(entry);
        });
    }

    /**
     * 日記を保存
     */
    function saveDiary() {
        const entry = Diary.getModalData();

        // 空のエントリは保存しない（ただし既存エントリがある場合は上書き）
        const existingEntry = Diary.get(entry.date);
        if (!entry.title && !entry.content && entry.images.length === 0 && entry.tags.length === 0) {
            if (existingEntry) {
                Diary.remove(entry.date);
                showToast('日記を削除しました');
            }
        } else {
            Diary.save(entry);
            showToast('保存しました');
        }

        Diary.closeModal();
        Calendar.refresh();
        Diary.showPreview(entry.date);
        updateStorageInfo();
    }

    /**
     * 設定モーダルイベントを設定
     */
    function setupSettingsModalEvents() {
        // 設定ボタン
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            openSettingsModal();
        });

        // タグ作成
        document.getElementById('create-tag-btn')?.addEventListener('click', () => {
            const nameInput = document.getElementById('new-tag-name');
            const colorInput = document.getElementById('new-tag-color');
            const name = nameInput.value.trim();

            if (!name) {
                alert('タグ名を入力してください');
                return;
            }

            if (Tags.getByName(name)) {
                alert('同じ名前のタグが既に存在します');
                return;
            }

            Tags.create(name, colorInput.value);
            nameInput.value = '';
            renderTagList();
            Calendar.refresh();
        });

        // エクスポートボタン
        document.getElementById('export-btn')?.addEventListener('click', () => {
            exportData();
        });

        // インポートボタン
        document.getElementById('import-btn')?.addEventListener('click', () => {
            document.getElementById('import-input').click();
        });

        // インポートファイル選択
        document.getElementById('import-input')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importData(file);
            }
            e.target.value = '';
        });

        // 全データ削除
        document.getElementById('clear-all-btn')?.addEventListener('click', () => {
            showConfirmDialog(
                '全データを削除',
                '全ての日記データを削除しますか？この操作は取り消せません。',
                () => {
                    Storage.clearAll();
                    Calendar.refresh();
                    const selectedDate = Calendar.getSelectedDate();
                    if (selectedDate) {
                        Diary.showPreview(selectedDate);
                    }
                    renderTagList();
                    updateStorageInfo();
                    alert('全データを削除しました');
                }
            );
        });
    }

    /**
     * 設定モーダルを開く
     */
    function openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        renderTagList();
        updateStorageInfo();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    /**
     * タグ一覧をレンダリング
     */
    function renderTagList() {
        Tags.renderList('tag-list',
            // 編集コールバック
            (tagId) => {
                const tag = Tags.getById(tagId);
                if (!tag) return;

                const newName = prompt('新しいタグ名:', tag.name);
                if (newName && newName.trim()) {
                    Tags.update(tagId, { name: newName.trim() });
                    renderTagList();
                    Calendar.refresh();
                }
            },
            // 削除コールバック
            (tagId) => {
                const tag = Tags.getById(tagId);
                if (!tag) return;

                showConfirmDialog(
                    'タグを削除',
                    `タグ「${tag.name}」を削除しますか？このタグが付いている日記からも削除されます。`,
                    () => {
                        Tags.remove(tagId);
                        renderTagList();
                        Calendar.refresh();
                    }
                );
            }
        );
    }

    /**
     * データをエクスポート
     */
    function exportData() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `diary-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * データをインポート
     */
    function importData(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                showConfirmDialog(
                    'データをインポート',
                    '既存のデータとマージしますか？「実行」でマージ、キャンセル後に再度インポートで上書きを選択できます。',
                    () => {
                        // マージ
                        if (Storage.importData(data, 'merge')) {
                            alert('データをインポートしました（マージ）');
                            Calendar.refresh();
                            renderTagList();
                            updateStorageInfo();
                        } else {
                            alert('インポートに失敗しました');
                        }
                    }
                );
            } catch (error) {
                alert('ファイルの読み込みに失敗しました');
                console.error('Import error:', error);
            }
        };

        reader.readAsText(file);
    }

    /**
     * ストレージ情報を更新
     */
    function updateStorageInfo() {
        const info = Storage.getStorageInfo();
        const usedEl = document.getElementById('storage-used');
        const textEl = document.getElementById('storage-text');

        if (usedEl) {
            usedEl.style.width = `${Math.min(info.ratio * 100, 100)}%`;

            // 80%以上で警告色
            if (info.ratio > 0.8) {
                usedEl.style.backgroundColor = 'var(--color-danger)';
            } else {
                usedEl.style.backgroundColor = 'var(--color-primary)';
            }
        }

        if (textEl) {
            textEl.textContent = `${info.usedFormatted} / ${info.maxFormatted}`;
        }
    }

    /**
     * 確認ダイアログを表示
     */
    function showConfirmDialog(title, message, onConfirm) {
        const dialog = document.getElementById('confirm-dialog');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;

        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        // 既存のリスナーを削除
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newOkBtn.addEventListener('click', () => {
            dialog.classList.remove('active');
            dialog.setAttribute('aria-hidden', 'true');
            onConfirm();
        });

        newCancelBtn.addEventListener('click', () => {
            dialog.classList.remove('active');
            dialog.setAttribute('aria-hidden', 'true');
        });

        dialog.classList.add('active');
        dialog.setAttribute('aria-hidden', 'false');
    }

    /**
     * キーボードショートカットを設定
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escでモーダルを閉じる
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    closeModal(activeModal);
                }
            }

            // Ctrl/Cmd + S で保存（日記モーダルが開いている場合）
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const diaryModal = document.getElementById('diary-modal');
                if (diaryModal.classList.contains('active')) {
                    e.preventDefault();
                    saveDiary();
                }
            }

            // Ctrl/Cmd + F で検索
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
        });
    }

    /**
     * トースト通知を表示
     */
    function showToast(message, duration = 3000) {
        // 既存のトーストを削除
        const existing = document.querySelector('.toast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 表示
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 非表示
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // DOMContentLoaded時に初期化
    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        showConfirmDialog,
        updateStorageInfo,
        showToast
    };
})();
