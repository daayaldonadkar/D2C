document.addEventListener('DOMContentLoaded', async () => {
    const clipboardList = document.getElementById('clipboard-list');
    const tabButtons = document.querySelectorAll('.tab-btn');

    let isClosing = false;

    function closeWindow() {
        if (isClosing) return;
        isClosing = true;
        document.body.classList.remove('visible');
        document.body.classList.add('hiding');
        setTimeout(() => {
            window.electronAPI.hideWindow();
            isClosing = false;
        }, 150);
    }

    let currentHistory = [];
    let filteredHistory = [];
    let selectedIndex = 0;
    let activeTab = 'recent'; // Default tab (Updated sequence: Recent, Bookmarked, Top)

    // ─── Rendering ────────────────────────────────────────────────────────────

    function renderList() {
        // Clone for safe sorting
        let items = [...currentHistory];

        // Apply Tab Logic
        if (activeTab === 'bookmarked') {
            items = items.filter(item => item.isBookmarked);
        } else if (activeTab === 'top') {
            items.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        } else if (activeTab === 'recent') {
            items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        filteredHistory = items;
        clipboardList.innerHTML = '';

        if (filteredHistory.length === 0) {
            const empty = document.createElement('li');
            empty.style.cssText = 'padding:24px;color:rgba(255,255,255,0.3);text-align:center;font-size:13px;';
            empty.textContent = activeTab === 'bookmarked' ? 'No bookmarked items yet.' : 'Clipboard is empty.';
            clipboardList.appendChild(empty);
            return;
        }

        // Clamp selection
        selectedIndex = Math.min(selectedIndex, filteredHistory.length - 1);
        selectedIndex = Math.max(selectedIndex, 0);

        filteredHistory.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'clipboard-item' + (index === selectedIndex ? ' selected' : '');
            
            const textSpan = document.createElement('span');
            textSpan.className = 'item-text';
            textSpan.textContent = item.text;
            
            const star = document.createElement('span');
            star.className = 'item-star' + (item.isBookmarked ? ' active' : '');
            star.innerHTML = item.isBookmarked ? '★' : '☆';
            star.onclick = async (e) => {
                e.stopPropagation();
                const nowBookmarked = await window.electronAPI.toggleBookmark(item.text);
                item.isBookmarked = nowBookmarked;
                renderList();
            };

            li.appendChild(textSpan);
            li.appendChild(star);
            
            li.onclick = () => {
                selectedIndex = index;
                confirmSelection();
            };

            clipboardList.appendChild(li);
        });

        scrollSelectedIntoView();
    }

    function scrollSelectedIntoView() {
        const selected = clipboardList.querySelector('.clipboard-item.selected');
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }

    function setSelected(newIndex) {
        selectedIndex = newIndex;
        const items = clipboardList.querySelectorAll('.clipboard-item');
        items.forEach((el, i) => {
            el.classList.toggle('selected', i === selectedIndex);
        });
        scrollSelectedIntoView();
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    async function confirmSelection() {
        const item = filteredHistory[selectedIndex];
        if (!item) return;

        isClosing = true;
        document.body.classList.remove('visible');
        document.body.classList.add('hiding');

        // Main process handles incrementing usageCount and pasting
        await window.electronAPI.pasteItem(item.text);

        // Refresh local state (usage count changed)
        currentHistory = await window.electronAPI.getClipboardHistory();
        isClosing = false;
    }

    // ─── Tab Logic ────────────────────────────────────────────────────────────

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            selectedIndex = 0;
            renderList();
        });
    });

    // ─── Keyboard handler ─────────────────────────────────────────────────────

    window.addEventListener('keydown', (e) => {
        const count = filteredHistory.length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (count === 0) return;
                setSelected((selectedIndex + 1) % count);
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (count === 0) return;
                setSelected((selectedIndex - 1 + count) % count);
                break;

            case 'Enter':
                e.preventDefault();
                confirmSelection();
                break;

            case 'Escape':
                e.preventDefault();
                closeWindow();
                break;
            
            case 'Tab':
                e.preventDefault();
                // Cycle tabs in new sequence: Recent, Bookmarked, Top
                const tabs = ['recent', 'bookmarked', 'top'];
                let nextIdx = (tabs.indexOf(activeTab) + 1) % tabs.length;
                if (e.shiftKey) nextIdx = (tabs.indexOf(activeTab) - 1 + tabs.length) % tabs.length;
                
                const nextTab = tabs[nextIdx];
                const nextBtn = document.querySelector(`[data-tab="${nextTab}"]`);
                if (nextBtn) nextBtn.click();
                break;
        }
    });

    // ─── Window focus ─────────────────────────────────────────────────────────

    window.addEventListener('focus', async () => {
        isClosing = false;
        document.body.classList.remove('hiding');
        document.body.classList.add('visible');
        
        // Refresh data on every focus to ensure consistency
        currentHistory = await window.electronAPI.getClipboardHistory();
        renderList();
    });

    window.addEventListener('blur', () => {
        closeWindow();
    });

    // ─── Bootstrap ────────────────────────────────────────────────────────────

    currentHistory = await window.electronAPI.getClipboardHistory();
    renderList();
    document.body.classList.remove('hiding');
    document.body.classList.add('visible');

    window.electronAPI.onClipboardUpdate((newHistory) => {
        currentHistory = newHistory;
        renderList();
    });
});
