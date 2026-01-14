const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentUrl = '';
let editingId = null;
let activeTimers = {};

document.addEventListener('DOMContentLoaded', async () => {
    await I18n.init();
    applyTranslations();
    
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || '';
    
    document.getElementById('currentUrl').textContent = shortenUrl(currentUrl);
    document.getElementById('inputPattern').value = currentUrl;
    
    activeTimers = await browserAPI.runtime.sendMessage({ type: 'TIMER_GET_ALL' });
    
    loadRequests();
    setupEventListeners();
});

browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === 'TIMERS_UPDATED') {
        activeTimers = message.timers;
        loadRequests();
    }
});

function applyTranslations() {
    document.getElementById('matchedTitle').textContent = I18n.t('dialogExecuteTitle');
    document.getElementById('addBtnText').textContent = I18n.t('menuAdd').replace(/^[^\s]+\s/, '');
    document.getElementById('manageBtnText').textContent = I18n.t('menuManage').replace(/^[^\s]+\s/, '');
    document.getElementById('dialogTitle').textContent = I18n.t('dialogAddTitle');
    document.getElementById('labelName').textContent = I18n.t('labelName') + ' *';
    document.getElementById('labelPattern').textContent = I18n.t('labelUrlPattern') + ' *';
    document.getElementById('labelCurl').textContent = I18n.t('labelCurl') + ' *';
    document.getElementById('labelCookie').textContent = I18n.t('labelCookieReplace');
    document.getElementById('hintPattern').textContent = I18n.t('hintUrlPattern');
    document.getElementById('hintCookie').textContent = I18n.t('hintCookie');
    document.getElementById('cancelBtn').textContent = I18n.t('btnCancel');
    document.getElementById('submitBtn').textContent = I18n.t('btnAdd');
    
    const executeAllText = document.getElementById('executeAllText');
    if (executeAllText) {
        executeAllText.textContent = I18n.t('dialogExecuteAll');
    }
}

async function loadRequests() {
    const requests = await browserAPI.runtime.sendMessage({
        type: 'GET_REQUESTS_FOR_URL',
        url: currentUrl
    });
    
    const listEl = document.getElementById('requestList');
    const batchSection = document.getElementById('batchSection');
    
    if (!requests || requests.length === 0) {
        listEl.innerHTML = `<div class="empty-state">${I18n.t('notifNoRequests')}</div>`;
        if (batchSection) batchSection.style.display = 'none';
        return;
    }
    
    if (batchSection) {
        batchSection.style.display = requests.length > 1 ? 'block' : 'none';
    }
    
    listEl.innerHTML = requests.map(req => `
        <div class="request-item" data-id="${req.id}">
            <div class="request-info">
                <div class="request-name">${escapeHtml(req.name)}</div>
                <div class="request-meta">
                    <span class="request-method">${req.parsedRequest?.method || 'GET'}</span>
                    ${req.lastExecuted ? `<span class="request-time">${formatTime(req.lastExecuted)}</span>` : ''}
                </div>
            </div>
            <div class="request-actions">
                <div class="action-row">
                    <div class="repeat-control">
                        <input type="number" class="repeat-input" value="1" min="1" max="100" title="${I18n.t('repeatTimes')}">
                        <button class="btn-mini btn-repeat" data-id="${req.id}" title="${I18n.t('btnExecute')}">▶</button>
                    </div>
                    <div class="timer-control">
                        <input type="number" class="timer-input" value="${activeTimers[req.id]?.interval || 60}" min="5" max="3600" title="${I18n.t('timerInterval')}">
                        <button class="btn-mini btn-timer ${activeTimers[req.id] ? 'timer-active' : ''}" data-id="${req.id}">
                            ${activeTimers[req.id] ? '⏹' : '⏱'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    listEl.querySelectorAll('.btn-repeat').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.request-item');
            const input = item.querySelector('.repeat-input');
            const times = parseInt(input.value) || 1;
            handleRepeatExecute(btn.dataset.id, times, btn);
        });
    });
    
    listEl.querySelectorAll('.btn-timer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.request-item');
            const input = item.querySelector('.timer-input');
            const interval = parseInt(input.value) || 60;
            handleTimerToggle(btn.dataset.id, interval, btn);
        });
    });
    
    listEl.querySelectorAll('.request-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.request-actions')) return;
            openEditDialog(item.dataset.id);
        });
    });
}

function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', () => {
        editingId = null;
        document.getElementById('dialogTitle').textContent = I18n.t('dialogAddTitle');
        document.getElementById('submitBtn').textContent = I18n.t('btnAdd');
        document.getElementById('requestForm').reset();
        document.getElementById('inputPattern').value = currentUrl;
        document.getElementById('addDialog').style.display = 'flex';
    });
    
    document.getElementById('manageBtn').addEventListener('click', () => {
        browserAPI.runtime.openOptionsPage();
    });
    
    const executeAllBtn = document.getElementById('executeAllBtn');
    if (executeAllBtn) {
        executeAllBtn.addEventListener('click', handleExecuteAll);
    }
    
    document.getElementById('closeDialog').addEventListener('click', closeDialog);
    document.getElementById('cancelBtn').addEventListener('click', closeDialog);
    
    document.getElementById('addDialog').addEventListener('click', (e) => {
        if (e.target.id === 'addDialog') closeDialog();
    });
    
    document.getElementById('requestForm').addEventListener('submit', handleFormSubmit);
}

function closeDialog() {
    document.getElementById('addDialog').style.display = 'none';
    editingId = null;
}

async function openEditDialog(id) {
    const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    editingId = id;
    document.getElementById('dialogTitle').textContent = I18n.t('dialogEditTitle');
    document.getElementById('submitBtn').textContent = I18n.t('btnUpdate');
    document.getElementById('inputName').value = request.name;
    document.getElementById('inputPattern').value = request.urlPattern;
    document.getElementById('inputCurl').value = request.curl;
    document.getElementById('inputCookie').value = (request.cookieReplace || []).join(', ');
    document.getElementById('addDialog').style.display = 'flex';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('inputName').value.trim(),
        urlPattern: document.getElementById('inputPattern').value.trim(),
        curl: document.getElementById('inputCurl').value.trim(),
        cookieReplace: document.getElementById('inputCookie').value
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
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
        closeDialog();
        loadRequests();
    } else {
        showNotification(`${I18n.t('notifError')}: ${result.error}`, 'error');
    }
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
    
    loadRequests();
}

async function handleTimerToggle(requestId, interval, btn) {
    if (activeTimers[requestId]) {
        await browserAPI.runtime.sendMessage({ type: 'TIMER_STOP', requestId });
        showNotification(I18n.t('timerStopped'), 'info');
    } else {
        const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
        const request = requests.find(r => r.id === requestId);
        
        await browserAPI.runtime.sendMessage({ type: 'TIMER_START', requestId, interval });
        showNotification(I18n.t('timerRunning', { name: request?.name || I18n.t('unnamedRequest') }), 'success');
    }
}

async function handleExecuteAll() {
    const requests = await browserAPI.runtime.sendMessage({
        type: 'GET_REQUESTS_FOR_URL',
        url: currentUrl
    });
    
    if (!requests || requests.length === 0) return;
    
    const requestIds = requests.map(r => r.id);
    showNotification(I18n.t('notifBatchExecuting', { count: requestIds.length }), 'info');
    
    const results = await browserAPI.runtime.sendMessage({
        type: 'EXECUTE_BATCH',
        requestIds
    });
    
    const successCount = results.filter(r => r.success).length;
    showNotification(
        I18n.t('notifBatchComplete', { success: successCount, total: requestIds.length }),
        successCount === requestIds.length ? 'success' : 'error'
    );
    
    loadRequests();
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shortenUrl(url) {
    if (url.length <= 45) return url;
    return url.substring(0, 42) + '...';
}

function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return I18n.t('timeJustNow');
    if (diff < 3600000) return I18n.t('timeMinutesAgo', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return I18n.t('timeHoursAgo', { n: Math.floor(diff / 3600000) });
    return I18n.t('timeDaysAgo', { n: Math.floor(diff / 86400000) });
}
