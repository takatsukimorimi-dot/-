/**
 * storage.js - LocalStorage管理モジュール
 */

const Storage = (() => {
    const KEYS = {
        ENTRIES: 'diary_entries',
        TAGS: 'diary_tags'
    };

    const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

    /**
     * LocalStorageからデータを取得
     */
    function get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage get error:', e);
            return null;
        }
    }

    /**
     * LocalStorageにデータを保存
     */
    function set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            if (e.name === 'QuotaExceededError') {
                alert('ストレージ容量が不足しています。不要なデータを削除してください。');
            }
            return false;
        }
    }

    /**
     * LocalStorageからデータを削除
     */
    function remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }

    /**
     * 全日記エントリを取得
     */
    function getAllEntries() {
        return get(KEYS.ENTRIES) || {};
    }

    /**
     * 特定の日付の日記を取得
     */
    function getEntry(date) {
        const entries = getAllEntries();
        return entries[date] || null;
    }

    /**
     * 日記を保存
     */
    function saveEntry(entry) {
        const entries = getAllEntries();
        entries[entry.date] = entry;
        return set(KEYS.ENTRIES, entries);
    }

    /**
     * 日記を削除
     */
    function deleteEntry(date) {
        const entries = getAllEntries();
        if (entries[date]) {
            delete entries[date];
            return set(KEYS.ENTRIES, entries);
        }
        return false;
    }

    /**
     * 全タグを取得
     */
    function getAllTags() {
        return get(KEYS.TAGS) || [];
    }

    /**
     * タグを保存
     */
    function saveTags(tags) {
        return set(KEYS.TAGS, tags);
    }

    /**
     * タグを追加
     */
    function addTag(tag) {
        const tags = getAllTags();
        tags.push(tag);
        return saveTags(tags);
    }

    /**
     * タグを更新
     */
    function updateTag(tagId, updates) {
        const tags = getAllTags();
        const index = tags.findIndex(t => t.id === tagId);
        if (index !== -1) {
            tags[index] = { ...tags[index], ...updates };
            return saveTags(tags);
        }
        return false;
    }

    /**
     * タグを削除
     */
    function deleteTag(tagId) {
        const tags = getAllTags();
        const filtered = tags.filter(t => t.id !== tagId);
        return saveTags(filtered);
    }

    /**
     * ストレージ使用量を取得 (bytes)
     */
    function getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage.getItem(key).length * 2; // UTF-16
            }
        }
        return total;
    }

    /**
     * ストレージ使用率を取得 (0-1)
     */
    function getStorageUsageRatio() {
        return getStorageUsage() / MAX_STORAGE_SIZE;
    }

    /**
     * ストレージ情報を取得
     */
    function getStorageInfo() {
        const used = getStorageUsage();
        return {
            used: used,
            max: MAX_STORAGE_SIZE,
            ratio: used / MAX_STORAGE_SIZE,
            usedFormatted: formatBytes(used),
            maxFormatted: formatBytes(MAX_STORAGE_SIZE)
        };
    }

    /**
     * バイト数をフォーマット
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 全データをエクスポート
     */
    function exportData() {
        return {
            entries: getAllEntries(),
            tags: getAllTags(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    /**
     * データをインポート
     */
    function importData(data, mode = 'merge') {
        try {
            if (!data.entries || !data.tags) {
                throw new Error('Invalid data format');
            }

            if (mode === 'overwrite') {
                set(KEYS.ENTRIES, data.entries);
                set(KEYS.TAGS, data.tags);
            } else {
                // merge mode
                const currentEntries = getAllEntries();
                const currentTags = getAllTags();

                // マージ（同じキーは上書き）
                const mergedEntries = { ...currentEntries, ...data.entries };

                // タグはIDで重複チェック
                const tagIds = new Set(currentTags.map(t => t.id));
                const newTags = data.tags.filter(t => !tagIds.has(t.id));
                const mergedTags = [...currentTags, ...newTags];

                set(KEYS.ENTRIES, mergedEntries);
                set(KEYS.TAGS, mergedTags);
            }

            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }

    /**
     * 全データを削除
     */
    function clearAll() {
        remove(KEYS.ENTRIES);
        remove(KEYS.TAGS);
    }

    /**
     * 日記がある日付のリストを取得
     */
    function getDatesWithEntries() {
        const entries = getAllEntries();
        return Object.keys(entries);
    }

    return {
        KEYS,
        get,
        set,
        remove,
        getAllEntries,
        getEntry,
        saveEntry,
        deleteEntry,
        getAllTags,
        saveTags,
        addTag,
        updateTag,
        deleteTag,
        getStorageUsage,
        getStorageUsageRatio,
        getStorageInfo,
        exportData,
        importData,
        clearAll,
        getDatesWithEntries
    };
})();
