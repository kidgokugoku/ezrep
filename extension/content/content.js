(async function() {
    'use strict';

    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    const I18n = {
        locale: 'en',
        translations: {
            'en': {
                dialogExecuteTitle: 'Execute Requests',
                dialogAddTitle: 'Add New Request',
                dialogEditTitle: 'Edit Request',
                menuAdd: '➕ Add New Request',
                notifNoRequests: 'No requests bound to this URL',
                notifExecuting: 'Executing request...',
                notifError: 'Error',
                notifAdded: 'Request added',
                notifUpdated: 'Request updated',
                notifDeleted: 'Request deleted',
                repeatComplete: 'Completed {success}/{total}',
                timerRunning: 'Timer running: {name}',
                timerStopped: 'Timer stopped',
                timeJustNow: 'Just now',
                timeMinutesAgo: '{n}m ago',
                timeHoursAgo: '{n}h ago',
                timeDaysAgo: '{n}d ago',
                unnamedRequest: 'Request',
                labelName: 'Request Name',
                labelUrlPattern: 'URL Pattern',
                labelCurl: 'cURL Command',
                labelCookieReplace: 'Cookie Replace List',
                hintCookie: 'Comma-separated. Leave empty to use all page cookies.',
                btnAdd: 'Add',
                btnUpdate: 'Update',
                btnCancel: 'Cancel',
                btnDelete: 'Delete',
                confirmDelete: 'Delete this request?'
            },
            'zh': {
                dialogExecuteTitle: '执行请求',
                dialogAddTitle: '添加新请求',
                dialogEditTitle: '编辑请求',
                menuAdd: '➕ 添加新请求',
                notifNoRequests: '当前 URL 没有绑定的请求',
                notifExecuting: '正在执行请求...',
                notifError: '错误',
                notifAdded: '请求已添加',
                notifUpdated: '请求已更新',
                notifDeleted: '请求已删除',
                repeatComplete: '完成 {success}/{total}',
                timerRunning: '定时运行中：{name}',
                timerStopped: '定时已停止',
                timeJustNow: '刚刚',
                timeMinutesAgo: '{n}分钟前',
                timeHoursAgo: '{n}小时前',
                timeDaysAgo: '{n}天前',
                unnamedRequest: '请求',
                labelName: '请求名称',
                labelUrlPattern: 'URL 模式',
                labelCurl: 'cURL 命令',
                labelCookieReplace: 'Cookie 替换列表',
                hintCookie: '逗号分隔。留空则使用所有页面 cookie。',
                btnAdd: '添加',
                btnUpdate: '更新',
                btnCancel: '取消',
                btnDelete: '删除',
                confirmDelete: '删除此请求？'
            }
        },
        async init() {
            const result = await browserAPI.storage.local.get('rr_locale');
            let locale = result.rr_locale || 'auto';
            if (locale === 'auto') {
                locale = navigator.language.startsWith('zh') ? 'zh' : 'en';
            }
            this.locale = locale;
        },
        t(key, params = {}) {
            const translation = this.translations[this.locale]?.[key] || this.translations['en'][key] || key;
            return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
    };

    await I18n.init();

    const activeTimers = {};
    let editingId = null;

    async function checkAndShowPanel() {
        const requests = await browserAPI.runtime.sendMessage({
            type: 'GET_REQUESTS_FOR_URL',
            url: window.location.href
        });

        if (requests && requests.length > 0) {
            showFloatingPanel(requests);
        }
    }

    function showFloatingPanel(requests) {
        closeFloatingPanel();

        const panel = document.createElement('div');
        panel.className = 'rr-floating-panel';
        panel.innerHTML = `
            <div class="rr-floating-header">
                <span class="rr-floating-title">⚡ ${I18n.t('dialogExecuteTitle')}</span>
                <div class="rr-floating-controls">
                    <button class="rr-floating-add" title="${I18n.t('menuAdd')}">+</button>
                    <button class="rr-floating-minimize">−</button>
                    <button class="rr-floating-close">×</button>
                </div>
            </div>
            <div class="rr-floating-body">
                <div class="rr-floating-url">${shortenUrl(window.location.href)}</div>
                ${requests.length === 0 ? `
                    <div class="rr-floating-empty">${I18n.t('notifNoRequests')}</div>
                ` : `
                    <div class="rr-floating-list">
                        ${requests.map(req => `
                            <div class="rr-floating-item" data-id="${req.id}">
                                <div class="rr-floating-item-info">
                                    <div class="rr-floating-item-name">${escapeHtml(req.name)}</div>
                                    <div class="rr-floating-item-meta">
                                        <code>${req.parsedRequest?.method || 'GET'}</code>
                                        ${req.lastExecuted ? `<span>${formatTime(req.lastExecuted)}</span>` : ''}
                                    </div>
                                </div>
                                <div class="rr-floating-item-actions">
                                    <div class="rr-action-row">
                                        <div class="rr-repeat-control">
                                            <input type="number" class="rr-repeat-input" value="1" min="1" max="100">
                                            <button class="rr-btn-mini rr-btn-repeat" data-id="${req.id}">▶</button>
                                        </div>
                                        <div class="rr-timer-control">
                                            <input type="number" class="rr-timer-interval" value="60" min="5" max="3600">
                                            <button class="rr-btn-mini rr-btn-timer-toggle ${activeTimers[req.id] ? 'rr-timer-running' : ''}" data-id="${req.id}">
                                                ${activeTimers[req.id] ? '⏹' : '⏱'}
                                            </button>
                                        </div>
                                        <button class="rr-btn-mini rr-btn-edit" data-id="${req.id}">✎</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        document.body.appendChild(panel);
        makeDraggable(panel);

        panel.querySelector('.rr-floating-close').addEventListener('click', closeFloatingPanel);
        panel.querySelector('.rr-floating-minimize').addEventListener('click', () => {
            panel.classList.toggle('rr-floating-minimized');
        });
        panel.querySelector('.rr-floating-add').addEventListener('click', () => {
            showModal();
        });

        panel.querySelectorAll('.rr-btn-repeat').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const input = btn.closest('.rr-floating-item').querySelector('.rr-repeat-input');
                const times = parseInt(input.value) || 1;
                await handleRepeatExecute(id, times, btn);
            });
        });

        panel.querySelectorAll('.rr-btn-timer-toggle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const input = btn.closest('.rr-floating-item').querySelector('.rr-timer-interval');
                const interval = parseInt(input.value) || 60;
                await handleTimerToggle(id, interval, btn);
            });
        });

        panel.querySelectorAll('.rr-btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                showModal(btn.dataset.id);
            });
        });
    }

    function closeFloatingPanel() {
        document.querySelectorAll('.rr-floating-panel').forEach(el => el.remove());
    }

    async function showModal(requestId = null) {
        closeModal();
        
        const isEdit = !!requestId;
        let request = null;
        
        if (isEdit) {
            const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
            request = requests.find(r => r.id === requestId);
            if (!request) return;
        }
        
        editingId = requestId;

        const overlay = document.createElement('div');
        overlay.className = 'rr-modal-overlay';
        overlay.innerHTML = `
            <div class="rr-modal">
                <div class="rr-modal-header">
                    <h3>${isEdit ? I18n.t('dialogEditTitle') : I18n.t('dialogAddTitle')}</h3>
                    <button class="rr-modal-close">×</button>
                </div>
                <form class="rr-modal-body">
                    <div class="rr-form-group">
                        <label>${I18n.t('labelName')} *</label>
                        <input type="text" class="rr-input" name="name" value="${isEdit ? escapeHtml(request.name) : ''}" required>
                    </div>
                    <div class="rr-form-group">
                        <label>${I18n.t('labelUrlPattern')} *</label>
                        <input type="text" class="rr-input" name="urlPattern" value="${isEdit ? escapeHtml(request.urlPattern) : window.location.href}" required>
                    </div>
                    <div class="rr-form-group">
                        <label>${I18n.t('labelCurl')} *</label>
                        <textarea class="rr-textarea" name="curl" rows="8" required>${isEdit ? escapeHtml(request.curl) : ''}</textarea>
                    </div>
                    <div class="rr-form-group">
                        <label>${I18n.t('labelCookieReplace')}</label>
                        <input type="text" class="rr-input" name="cookieReplace" value="${isEdit ? (request.cookieReplace || []).join(', ') : ''}">
                        <small>${I18n.t('hintCookie')}</small>
                    </div>
                    <div class="rr-modal-actions">
                        ${isEdit ? `<button type="button" class="rr-btn rr-btn-danger rr-btn-delete">${I18n.t('btnDelete')}</button>` : ''}
                        <div class="rr-modal-spacer"></div>
                        <button type="button" class="rr-btn rr-btn-secondary rr-btn-cancel">${I18n.t('btnCancel')}</button>
                        <button type="submit" class="rr-btn rr-btn-primary">${isEdit ? I18n.t('btnUpdate') : I18n.t('btnAdd')}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        overlay.querySelector('.rr-modal-close').addEventListener('click', closeModal);
        overlay.querySelector('.rr-btn-cancel').addEventListener('click', closeModal);
        
        const deleteBtn = overlay.querySelector('.rr-btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                if (confirm(I18n.t('confirmDelete'))) {
                    const result = await browserAPI.runtime.sendMessage({
                        type: 'DELETE_REQUEST',
                        id: editingId
                    });
                    if (result.success) {
                        showNotification(I18n.t('notifDeleted'), 'success');
                        closeModal();
                        refreshPanel();
                    } else {
                        showNotification(I18n.t('notifError'), 'error');
                    }
                }
            });
        }

        overlay.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const data = {
                name: form.name.value.trim(),
                urlPattern: form.urlPattern.value.trim(),
                curl: form.curl.value.trim(),
                cookieReplace: form.cookieReplace.value.split(',').map(s => s.trim()).filter(s => s)
            };

            let result;
            if (editingId) {
                result = await browserAPI.runtime.sendMessage({
                    type: 'UPDATE_REQUEST',
                    id: editingId,
                    data
                });
            } else {
                result = await browserAPI.runtime.sendMessage({
                    type: 'CREATE_REQUEST',
                    data
                });
            }

            if (result.success) {
                showNotification(editingId ? I18n.t('notifUpdated') : I18n.t('notifAdded'), 'success');
                closeModal();
                refreshPanel();
            } else {
                showNotification(`${I18n.t('notifError')}: ${result.error}`, 'error');
            }
        });
    }

    function closeModal() {
        document.querySelectorAll('.rr-modal-overlay').forEach(el => el.remove());
        editingId = null;
    }

    async function refreshPanel() {
        const requests = await browserAPI.runtime.sendMessage({
            type: 'GET_REQUESTS_FOR_URL',
            url: window.location.href
        });
        if (requests && requests.length > 0) {
            showFloatingPanel(requests);
        } else {
            closeFloatingPanel();
        }
    }

    function makeDraggable(element) {
        const header = element.querySelector('.rr-floating-header');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            element.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = (initialX + dx) + 'px';
            element.style.top = (initialY + dy) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.transition = '';
        });
    }

    async function handleRepeatExecute(requestId, times, btn) {
        const originalText = btn.textContent;
        btn.disabled = true;

        let successCount = 0;
        for (let i = 0; i < times; i++) {
            btn.textContent = `${i + 1}/${times}`;
            const result = await browserAPI.runtime.sendMessage({
                type: 'EXECUTE_REQUEST',
                requestId
            });
            if (result.success) successCount++;

            if (i < times - 1) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        btn.disabled = false;
        btn.textContent = originalText;

        showNotification(
            I18n.t('repeatComplete', { success: successCount, total: times }),
            successCount === times ? 'success' : 'error'
        );
    }

    async function handleTimerToggle(requestId, interval, btn) {
        if (activeTimers[requestId]) {
            clearInterval(activeTimers[requestId]);
            delete activeTimers[requestId];
            btn.textContent = '⏱';
            btn.classList.remove('rr-timer-running');
            showNotification(I18n.t('timerStopped'), 'info');
        } else {
            const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
            const request = requests.find(r => r.id === requestId);

            browserAPI.runtime.sendMessage({ type: 'EXECUTE_REQUEST', requestId });

            activeTimers[requestId] = setInterval(() => {
                browserAPI.runtime.sendMessage({ type: 'EXECUTE_REQUEST', requestId });
            }, interval * 1000);

            btn.textContent = '⏹';
            btn.classList.add('rr-timer-running');
            showNotification(I18n.t('timerRunning', { name: request?.name || I18n.t('unnamedRequest') }), 'success');
        }
    }

    function showNotification(message, type = 'info') {
        document.querySelectorAll('.rr-notification').forEach(el => el.remove());

        const notif = document.createElement('div');
        notif.className = `rr-notification rr-notification-${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => notif.classList.add('rr-notification-show'), 10);
        setTimeout(() => {
            notif.classList.remove('rr-notification-show');
            setTimeout(() => notif.remove(), 300);
        }, 5000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function shortenUrl(url) {
        if (url.length <= 50) return url;
        return url.substring(0, 47) + '...';
    }

    function formatTime(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return I18n.t('timeJustNow');
        if (diff < 3600000) return I18n.t('timeMinutesAgo', { n: Math.floor(diff / 60000) });
        if (diff < 86400000) return I18n.t('timeHoursAgo', { n: Math.floor(diff / 3600000) });
        return I18n.t('timeDaysAgo', { n: Math.floor(diff / 86400000) });
    }

    setTimeout(checkAndShowPanel, 500);

})();
