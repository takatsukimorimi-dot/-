/**
 * search.js - 検索・フィルタ機能モジュール
 */

const Search = (() => {
    // 現在のフィルター状態
    let currentFilters = {
        keyword: '',
        tags: [],
        fromDate: null,
        toDate: null
    };

    /**
     * キーワードで日記を検索
     */
    function searchByKeyword(keyword) {
        const entries = Storage.getAllEntries();
        const results = [];
        const lowerKeyword = keyword.toLowerCase();

        for (const date in entries) {
            const entry = entries[date];
            const titleMatch = entry.title && entry.title.toLowerCase().includes(lowerKeyword);
            const contentMatch = entry.content && entry.content.toLowerCase().includes(lowerKeyword);

            if (titleMatch || contentMatch) {
                results.push(entry);
            }
        }

        return results;
    }

    /**
     * タグで日記をフィルタ
     */
    function filterByTags(entries, tagIds) {
        if (!tagIds || tagIds.length === 0) return entries;

        return entries.filter(entry => {
            if (!entry.tags || entry.tags.length === 0) return false;
            return tagIds.some(tagId => entry.tags.includes(tagId));
        });
    }

    /**
     * 期間で日記をフィルタ
     */
    function filterByDateRange(entries, fromDate, toDate) {
        return entries.filter(entry => {
            const entryDate = entry.date;
            if (fromDate && entryDate < fromDate) return false;
            if (toDate && entryDate > toDate) return false;
            return true;
        });
    }

    /**
     * 複合検索
     */
    function search(filters) {
        currentFilters = { ...currentFilters, ...filters };

        let results;

        // キーワード検索
        if (currentFilters.keyword) {
            results = searchByKeyword(currentFilters.keyword);
        } else {
            // 全エントリを取得
            const entries = Storage.getAllEntries();
            results = Object.values(entries);
        }

        // タグフィルタ
        if (currentFilters.tags && currentFilters.tags.length > 0) {
            results = filterByTags(results, currentFilters.tags);
        }

        // 期間フィルタ
        if (currentFilters.fromDate || currentFilters.toDate) {
            results = filterByDateRange(results, currentFilters.fromDate, currentFilters.toDate);
        }

        // 日付で降順ソート
        results.sort((a, b) => b.date.localeCompare(a.date));

        return results;
    }

    /**
     * 検索モーダルを開く
     */
    function openModal(keyword = '') {
        const modal = document.getElementById('search-modal');
        const searchInput = document.getElementById('search-input');

        currentFilters = {
            keyword: keyword || searchInput.value,
            tags: [],
            fromDate: null,
            toDate: null
        };

        // フィルタUIを更新
        renderFilterTags();

        // 日付フィルタをクリア
        document.getElementById('filter-from').value = '';
        document.getElementById('filter-to').value = '';

        // 検索を実行
        const results = search(currentFilters);
        renderResults(results);

        // モーダルを表示
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    /**
     * 検索モーダルを閉じる
     */
    function closeModal() {
        const modal = document.getElementById('search-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * フィルタ用タグUIをレンダリング
     */
    function renderFilterTags() {
        const container = document.getElementById('filter-tags');
        if (!container) return;

        const tags = Tags.getAll();

        if (tags.length === 0) {
            container.innerHTML = '<span class="text-muted">タグがありません</span>';
            return;
        }

        container.innerHTML = tags.map(tag => {
            const isSelected = currentFilters.tags.includes(tag.id);
            return `
                <span class="tag-option ${isSelected ? 'selected' : ''}"
                      data-tag-id="${tag.id}"
                      style="color: ${tag.color}; ${isSelected ? `background-color: ${tag.color}20; border-color: ${tag.color}` : ''}">
                    ${Tags.escapeHtml(tag.name)}
                </span>
            `;
        }).join('');

        // クリックイベント
        container.querySelectorAll('.tag-option').forEach(el => {
            el.addEventListener('click', () => {
                el.classList.toggle('selected');
                const tagId = el.dataset.tagId;
                const tag = Tags.getById(tagId);

                if (el.classList.contains('selected')) {
                    el.style.backgroundColor = `${tag.color}20`;
                    el.style.borderColor = tag.color;
                    if (!currentFilters.tags.includes(tagId)) {
                        currentFilters.tags.push(tagId);
                    }
                } else {
                    el.style.backgroundColor = '';
                    el.style.borderColor = '';
                    currentFilters.tags = currentFilters.tags.filter(t => t !== tagId);
                }

                // 再検索
                updateResults();
            });
        });
    }

    /**
     * 検索結果をレンダリング
     */
    function renderResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = '<p class="search-no-results">検索結果がありません</p>';
            return;
        }

        container.innerHTML = results.map(entry => {
            const dateObj = new Date(entry.date);
            const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

            // 本文の抜粋（最大100文字）
            const excerpt = entry.content
                ? entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
                : '';

            const tagsHtml = Tags.renderTags(entry.tags);

            return `
                <div class="search-result-item" data-date="${entry.date}">
                    <span class="search-result-date">${dateStr}</span>
                    <div class="search-result-title">${entry.title ? Tags.escapeHtml(entry.title) : '（タイトルなし）'}</div>
                    ${excerpt ? `<div class="search-result-excerpt">${Tags.escapeHtml(excerpt)}</div>` : ''}
                    ${tagsHtml ? `<div class="preview-tags" style="margin-top: 8px;">${tagsHtml}</div>` : ''}
                </div>
            `;
        }).join('');

        // クリックイベント
        container.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const date = el.dataset.date;
                closeModal();
                Calendar.goToDate(date);
            });
        });
    }

    /**
     * 検索結果を更新
     */
    function updateResults() {
        const results = search(currentFilters);
        renderResults(results);
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        // 期間フィルタ
        document.getElementById('filter-from')?.addEventListener('change', (e) => {
            currentFilters.fromDate = e.target.value || null;
            updateResults();
        });

        document.getElementById('filter-to')?.addEventListener('change', (e) => {
            currentFilters.toDate = e.target.value || null;
            updateResults();
        });

        // 検索ボタン
        document.getElementById('search-btn')?.addEventListener('click', () => {
            openModal();
        });

        // 検索入力でEnter
        document.getElementById('search-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                openModal();
            }
        });
    }

    /**
     * 初期化
     */
    function init() {
        setupEventListeners();
    }

    return {
        search,
        searchByKeyword,
        filterByTags,
        filterByDateRange,
        openModal,
        closeModal,
        renderResults,
        updateResults,
        init
    };
})();
