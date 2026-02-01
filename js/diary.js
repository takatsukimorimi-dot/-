/**
 * diary.js - 日記CRUD機能モジュール
 */

const Diary = (() => {
    // 自動保存のためのdebounceタイマー
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1000; // 1秒

    // 画像設定
    const IMAGE_MAX_WIDTH = 1200;
    const IMAGE_MAX_HEIGHT = 1200;
    const IMAGE_QUALITY = 0.8;
    const MAX_IMAGES = 10;

    // 現在の画像リスト
    let currentImages = [];

    /**
     * ユニークIDを生成
     */
    function generateId() {
        return 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 新しい日記エントリを作成
     */
    function create(date) {
        return {
            id: generateId(),
            date: date,
            title: '',
            content: '',
            tags: [],
            images: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * 日記を保存
     */
    function save(entry) {
        entry.updatedAt = Date.now();
        return Storage.saveEntry(entry);
    }

    /**
     * 日記を取得
     */
    function get(date) {
        return Storage.getEntry(date);
    }

    /**
     * 日記を削除
     */
    function remove(date) {
        return Storage.deleteEntry(date);
    }

    /**
     * 全日記を取得
     */
    function getAll() {
        return Storage.getAllEntries();
    }

    /**
     * 日記がある日付のリストを取得
     */
    function getDatesWithEntries() {
        return Storage.getDatesWithEntries();
    }

    /**
     * 自動保存（debounce付き）
     */
    function autoSave(entry) {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }

        autoSaveTimer = setTimeout(() => {
            save(entry);
            console.log('Auto-saved:', entry.date);
        }, AUTO_SAVE_DELAY);
    }

    /**
     * 画像をリサイズ・圧縮
     */
    function processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // アスペクト比を維持してリサイズ
                    if (width > IMAGE_MAX_WIDTH) {
                        height = (height * IMAGE_MAX_WIDTH) / width;
                        width = IMAGE_MAX_WIDTH;
                    }
                    if (height > IMAGE_MAX_HEIGHT) {
                        width = (width * IMAGE_MAX_HEIGHT) / height;
                        height = IMAGE_MAX_HEIGHT;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Base64に変換
                    const base64 = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                    resolve(base64);
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 複数画像を処理
     */
    async function processImages(files) {
        const results = [];
        const remainingSlots = MAX_IMAGES - currentImages.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        for (const file of filesToProcess) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const base64 = await processImage(file);
                results.push(base64);
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        return results;
    }

    /**
     * 画像プレビューを更新
     */
    function updateImagePreview(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (currentImages.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = currentImages.map((img, index) => `
            <div class="image-preview-item" data-index="${index}">
                <img src="${img}" alt="画像 ${index + 1}">
                <button type="button" class="remove-image" aria-label="画像を削除">&times;</button>
            </div>
        `).join('');

        // 削除ボタンのイベント
        container.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.image-preview-item').dataset.index);
                currentImages.splice(index, 1);
                updateImagePreview(containerId);
            });
        });
    }

    /**
     * 現在の画像リストを設定
     */
    function setCurrentImages(images) {
        currentImages = images ? [...images] : [];
    }

    /**
     * 現在の画像リストを取得
     */
    function getCurrentImages() {
        return [...currentImages];
    }

    /**
     * 画像を追加
     */
    function addImages(images) {
        const remaining = MAX_IMAGES - currentImages.length;
        currentImages.push(...images.slice(0, remaining));
    }

    /**
     * 日記編集モーダルを開く
     */
    function openModal(date) {
        const modal = document.getElementById('diary-modal');
        const entry = get(date) || create(date);

        // フォームに値を設定
        document.getElementById('diary-id').value = entry.id;
        document.getElementById('diary-date').value = entry.date;
        document.getElementById('diary-title').value = entry.title || '';
        document.getElementById('diary-content').value = entry.content || '';

        // モーダルタイトル
        const dateObj = new Date(date);
        document.getElementById('modal-title').textContent =
            `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日の日記`;

        // タグセレクター
        Tags.renderSelector('tag-selector', entry.tags || []);

        // 画像プレビュー
        setCurrentImages(entry.images || []);
        updateImagePreview('image-preview');

        // 削除ボタン（既存エントリの場合のみ表示）
        const deleteBtn = document.getElementById('diary-delete');
        if (Storage.getEntry(date)) {
            deleteBtn.hidden = false;
        } else {
            deleteBtn.hidden = true;
        }

        // ストレージ警告
        const storageInfo = Storage.getStorageInfo();
        const warningEl = document.getElementById('storage-warning');
        if (storageInfo.ratio > 0.8) {
            warningEl.hidden = false;
        } else {
            warningEl.hidden = true;
        }

        // モーダルを表示
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');

        // タイトルにフォーカス
        setTimeout(() => {
            document.getElementById('diary-title').focus();
        }, 100);
    }

    /**
     * 日記編集モーダルを閉じる
     */
    function closeModal() {
        const modal = document.getElementById('diary-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');

        // 自動保存タイマーをクリア
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
    }

    /**
     * モーダルからエントリデータを取得
     */
    function getModalData() {
        return {
            id: document.getElementById('diary-id').value,
            date: document.getElementById('diary-date').value,
            title: document.getElementById('diary-title').value.trim(),
            content: document.getElementById('diary-content').value.trim(),
            tags: Tags.getSelectedTagIds('tag-selector'),
            images: getCurrentImages(),
            createdAt: Storage.getEntry(document.getElementById('diary-date').value)?.createdAt || Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * 日記プレビューを表示
     */
    function showPreview(date) {
        const container = document.getElementById('preview-content');
        const entry = get(date);

        if (!entry || (!entry.title && !entry.content && (!entry.images || entry.images.length === 0))) {
            const dateObj = new Date(date);
            container.innerHTML = `
                <div class="preview-header">
                    <span class="preview-date">${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日</span>
                    <button class="btn btn-primary" onclick="Diary.openModal('${date}')">日記を書く</button>
                </div>
                <p class="preview-placeholder">まだ日記がありません</p>
            `;
            return;
        }

        const dateObj = new Date(entry.date);
        const tagsHtml = Tags.renderTags(entry.tags);

        let imagesHtml = '';
        if (entry.images && entry.images.length > 0) {
            imagesHtml = `
                <div class="preview-images">
                    ${entry.images.map((img, i) => `
                        <img src="${img}" alt="画像 ${i + 1}" class="preview-image" onclick="Diary.showImageFullscreen('${img}')">
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="preview-header">
                <div>
                    <span class="preview-date">${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日</span>
                    ${entry.title ? `<h3 class="preview-title">${Tags.escapeHtml(entry.title)}</h3>` : ''}
                </div>
                <button class="btn btn-secondary" onclick="Diary.openModal('${entry.date}')">編集</button>
            </div>
            ${tagsHtml ? `<div class="preview-tags">${tagsHtml}</div>` : ''}
            ${entry.content ? `<p class="preview-text">${Tags.escapeHtml(entry.content)}</p>` : ''}
            ${imagesHtml}
        `;
    }

    /**
     * 犬種一覧を取得
     */
    async function fetchDogBreeds() {
        try {
            const response = await fetch('https://dog.ceo/api/breeds/list/all');
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            if (data.status !== 'success') throw new Error('API returned error');

            // フラット化された犬種リストを作成
            const breeds = [];
            for (const [breed, subBreeds] of Object.entries(data.message)) {
                if (subBreeds.length === 0) {
                    breeds.push({ value: breed, label: formatBreedName(breed) });
                } else {
                    for (const subBreed of subBreeds) {
                        breeds.push({
                            value: `${breed}/${subBreed}`,
                            label: `${formatBreedName(subBreed)} ${formatBreedName(breed)}`
                        });
                    }
                }
            }

            return breeds.sort((a, b) => a.label.localeCompare(b.label));
        } catch (error) {
            console.error('Failed to fetch dog breeds:', error);
            throw error;
        }
    }

    /**
     * 犬種名をフォーマット（先頭大文字）
     */
    function formatBreedName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * ランダムな犬画像を取得
     */
    async function fetchRandomDogImage(breed = '') {
        try {
            // Dog CEO API からランダム画像URLを取得
            let url = 'https://dog.ceo/api/breeds/image/random';
            if (breed) {
                url = `https://dog.ceo/api/breed/${breed}/images/random`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            if (data.status !== 'success') throw new Error('API returned error');

            // 画像URLから画像データを取得してBase64に変換
            const imageResponse = await fetch(data.message);
            if (!imageResponse.ok) throw new Error('Image fetch failed');

            const blob = await imageResponse.blob();

            // Blobを圧縮処理
            const base64 = await compressImageBlob(blob);
            return base64;
        } catch (error) {
            console.error('Failed to fetch random dog image:', error);
            throw error;
        }
    }

    /**
     * Blobを圧縮してBase64に変換
     */
    function compressImageBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);

                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // アスペクト比を維持してリサイズ
                if (width > IMAGE_MAX_WIDTH) {
                    height = (height * IMAGE_MAX_WIDTH) / width;
                    width = IMAGE_MAX_WIDTH;
                }
                if (height > IMAGE_MAX_HEIGHT) {
                    width = (width * IMAGE_MAX_HEIGHT) / height;
                    height = IMAGE_MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                resolve(base64);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    /**
     * 画像をフルスクリーン表示
     */
    function showImageFullscreen(src) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        `;

        overlay.appendChild(img);
        overlay.addEventListener('click', () => overlay.remove());

        document.body.appendChild(overlay);
    }

    return {
        create,
        save,
        get,
        remove,
        getAll,
        getDatesWithEntries,
        autoSave,
        processImage,
        processImages,
        updateImagePreview,
        setCurrentImages,
        getCurrentImages,
        addImages,
        openModal,
        closeModal,
        getModalData,
        showPreview,
        showImageFullscreen,
        fetchDogBreeds,
        fetchRandomDogImage,
        MAX_IMAGES
    };
})();
