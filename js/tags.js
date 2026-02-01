/**
 * tags.js - タグ管理モジュール
 */

const Tags = (() => {
    /**
     * ユニークIDを生成
     */
    function generateId() {
        return 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 新しいタグを作成
     */
    function create(name, color = '#4a90d9') {
        const tag = {
            id: generateId(),
            name: name.trim(),
            color: color
        };

        if (Storage.addTag(tag)) {
            return tag;
        }
        return null;
    }

    /**
     * タグを更新
     */
    function update(tagId, updates) {
        return Storage.updateTag(tagId, updates);
    }

    /**
     * タグを削除
     */
    function remove(tagId) {
        // 日記からもタグを削除
        const entries = Storage.getAllEntries();
        let updated = false;

        for (const date in entries) {
            const entry = entries[date];
            if (entry.tags && entry.tags.includes(tagId)) {
                entry.tags = entry.tags.filter(t => t !== tagId);
                updated = true;
            }
        }

        if (updated) {
            Storage.set(Storage.KEYS.ENTRIES, entries);
        }

        return Storage.deleteTag(tagId);
    }

    /**
     * 全タグを取得
     */
    function getAll() {
        return Storage.getAllTags();
    }

    /**
     * IDでタグを取得
     */
    function getById(tagId) {
        const tags = getAll();
        return tags.find(t => t.id === tagId) || null;
    }

    /**
     * 名前でタグを取得
     */
    function getByName(name) {
        const tags = getAll();
        return tags.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
    }

    /**
     * タグ選択UIを生成
     */
    function renderSelector(containerId, selectedTagIds = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tags = getAll();

        if (tags.length === 0) {
            container.innerHTML = '<span class="text-muted">タグがありません</span>';
            return;
        }

        container.innerHTML = tags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            return `
                <span class="tag-option ${isSelected ? 'selected' : ''}"
                      data-tag-id="${tag.id}"
                      style="color: ${tag.color}; ${isSelected ? `background-color: ${tag.color}20; border-color: ${tag.color}` : ''}">
                    ${escapeHtml(tag.name)}
                </span>
            `;
        }).join('');

        // クリックイベント
        container.querySelectorAll('.tag-option').forEach(el => {
            el.addEventListener('click', () => {
                el.classList.toggle('selected');
                const tagId = el.dataset.tagId;
                const tag = getById(tagId);
                if (el.classList.contains('selected')) {
                    el.style.backgroundColor = `${tag.color}20`;
                    el.style.borderColor = tag.color;
                } else {
                    el.style.backgroundColor = '';
                    el.style.borderColor = '';
                }
            });
        });
    }

    /**
     * 選択されたタグIDを取得
     */
    function getSelectedTagIds(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];

        const selected = container.querySelectorAll('.tag-option.selected');
        return Array.from(selected).map(el => el.dataset.tagId);
    }

    /**
     * タグ一覧UIを生成（設定画面用）
     */
    function renderList(containerId, onEdit, onDelete) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tags = getAll();

        if (tags.length === 0) {
            container.innerHTML = '<p class="text-muted">タグがありません</p>';
            return;
        }

        container.innerHTML = tags.map(tag => `
            <div class="tag-item" data-tag-id="${tag.id}">
                <div class="tag-item-info">
                    <span class="tag-color" style="background-color: ${tag.color}"></span>
                    <span class="tag-name">${escapeHtml(tag.name)}</span>
                </div>
                <div class="tag-item-actions">
                    <button class="btn btn-icon btn-edit" aria-label="編集">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn btn-icon btn-delete" aria-label="削除">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        // イベントリスナー
        container.querySelectorAll('.tag-item').forEach(el => {
            const tagId = el.dataset.tagId;

            el.querySelector('.btn-edit')?.addEventListener('click', () => {
                if (onEdit) onEdit(tagId);
            });

            el.querySelector('.btn-delete')?.addEventListener('click', () => {
                if (onDelete) onDelete(tagId);
            });
        });
    }

    /**
     * タグをHTMLとしてレンダリング
     */
    function renderTags(tagIds) {
        if (!tagIds || tagIds.length === 0) return '';

        return tagIds.map(tagId => {
            const tag = getById(tagId);
            if (!tag) return '';
            return `<span class="tag" style="background-color: ${tag.color}20; color: ${tag.color}">${escapeHtml(tag.name)}</span>`;
        }).join('');
    }

    /**
     * HTMLエスケープ
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        create,
        update,
        remove,
        getAll,
        getById,
        getByName,
        renderSelector,
        getSelectedTagIds,
        renderList,
        renderTags,
        escapeHtml
    };
})();
