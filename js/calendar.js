/**
 * calendar.js - カレンダー表示・操作モジュール
 */

const Calendar = (() => {
    // 現在表示中の年月
    let currentYear;
    let currentMonth;

    // 選択中の日付
    let selectedDate = null;

    // 今日の日付
    const today = new Date();
    const todayString = formatDate(today);

    /**
     * 日付をYYYY-MM-DD形式にフォーマット
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * カレンダーを初期化
     */
    function init() {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();

        render();
        setupEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        // 前月ボタン
        document.getElementById('prev-month')?.addEventListener('click', () => {
            goToPrevMonth();
        });

        // 次月ボタン
        document.getElementById('next-month')?.addEventListener('click', () => {
            goToNextMonth();
        });

        // 今日ボタン
        document.getElementById('today-btn')?.addEventListener('click', () => {
            goToToday();
        });
    }

    /**
     * 前月に移動
     */
    function goToPrevMonth() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        render();
    }

    /**
     * 次月に移動
     */
    function goToNextMonth() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        render();
    }

    /**
     * 今日に移動
     */
    function goToToday() {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();
        selectedDate = todayString;
        render();
        Diary.showPreview(selectedDate);
    }

    /**
     * 特定の日付に移動
     */
    function goToDate(dateString) {
        const date = new Date(dateString);
        currentYear = date.getFullYear();
        currentMonth = date.getMonth();
        selectedDate = dateString;
        render();
        Diary.showPreview(selectedDate);
    }

    /**
     * カレンダーをレンダリング
     */
    function render() {
        renderHeader();
        renderDays();
    }

    /**
     * ヘッダー（年月）をレンダリング
     */
    function renderHeader() {
        const titleEl = document.getElementById('current-month');
        if (titleEl) {
            titleEl.textContent = `${currentYear}年${currentMonth + 1}月`;
        }
    }

    /**
     * 日付セルをレンダリング
     */
    function renderDays() {
        const container = document.getElementById('calendar-days');
        if (!container) return;

        // 日記がある日付のリストを取得
        const datesWithEntries = Diary.getDatesWithEntries();
        const entriesSet = new Set(datesWithEntries);

        // 全エントリを取得（タグ表示用）
        const allEntries = Diary.getAll();

        // 月の最初の日と最後の日
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);

        // 月の開始曜日（0=日曜）
        const startDayOfWeek = firstDay.getDay();

        // 前月の最終日
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

        let html = '';
        let dayCount = 1;
        let nextMonthDay = 1;

        // 6週分（42日）のグリッドを生成
        for (let week = 0; week < 6; week++) {
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                const cellIndex = week * 7 + dayOfWeek;

                let day, dateString, isOtherMonth = false;

                if (cellIndex < startDayOfWeek) {
                    // 前月の日付
                    day = prevMonthLastDay - startDayOfWeek + cellIndex + 1;
                    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    isOtherMonth = true;
                } else if (dayCount <= lastDay.getDate()) {
                    // 今月の日付
                    day = dayCount;
                    dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    dayCount++;
                } else {
                    // 来月の日付
                    day = nextMonthDay;
                    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
                    dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    nextMonthDay++;
                    isOtherMonth = true;
                }

                // クラスを構築
                const classes = ['calendar-day'];

                if (isOtherMonth) classes.push('other-month');
                if (dateString === todayString) classes.push('today');
                if (dateString === selectedDate) classes.push('selected');
                if (dayOfWeek === 0) classes.push('sunday');
                if (dayOfWeek === 6) classes.push('saturday');

                // 日記インジケーター
                const hasEntry = entriesSet.has(dateString);
                let indicatorHtml = '';
                let tagsHtml = '';

                if (hasEntry) {
                    indicatorHtml = '<div class="day-indicator"></div>';

                    // タグを表示
                    const entry = allEntries[dateString];
                    if (entry && entry.tags && entry.tags.length > 0) {
                        const tagDots = entry.tags.slice(0, 3).map(tagId => {
                            const tag = Tags.getById(tagId);
                            if (tag) {
                                return `<span class="day-tag-dot" style="background-color: ${tag.color}"></span>`;
                            }
                            return '';
                        }).join('');
                        tagsHtml = `<div class="day-tags">${tagDots}</div>`;
                    }
                }

                html += `
                    <div class="${classes.join(' ')}" data-date="${dateString}">
                        <span class="day-number">${day}</span>
                        ${indicatorHtml}
                        ${tagsHtml}
                    </div>
                `;
            }
        }

        container.innerHTML = html;

        // 日付セルにクリックイベントを設定
        container.querySelectorAll('.calendar-day').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                selectDate(date);
            });

            // ダブルクリックで編集モーダルを開く
            cell.addEventListener('dblclick', () => {
                const date = cell.dataset.date;
                selectDate(date);
                Diary.openModal(date);
            });
        });
    }

    /**
     * 日付を選択
     */
    function selectDate(dateString) {
        // 他の月の日付をクリックした場合、その月に移動
        const clickedDate = new Date(dateString);
        if (clickedDate.getFullYear() !== currentYear || clickedDate.getMonth() !== currentMonth) {
            currentYear = clickedDate.getFullYear();
            currentMonth = clickedDate.getMonth();
        }

        selectedDate = dateString;
        render();
        Diary.showPreview(dateString);
    }

    /**
     * 現在選択中の日付を取得
     */
    function getSelectedDate() {
        return selectedDate;
    }

    /**
     * カレンダーを再描画（外部から呼び出し用）
     */
    function refresh() {
        render();
    }

    return {
        init,
        goToPrevMonth,
        goToNextMonth,
        goToToday,
        goToDate,
        render,
        selectDate,
        getSelectedDate,
        refresh,
        formatDate
    };
})();
