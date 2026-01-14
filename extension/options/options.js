const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let editingId = null;
let activeTimers = {};

document.addEventListener('DOMContentLoaded', async () => {
    await I18n.init();
    applyTranslations();
    
    activeTimers = await browserAPI.runtime.sendMessage({ type: 'TIMER_GET_ALL' });
    
    loadStats();
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
    document.getElementById('labelTotal').textContent = I18n.t('statsTotal');
    document.getElementById('labelExecutions').textContent = I18n.t('statsExecutions');
    document.getElementById('labelSuccess').textContent = I18n.t('statsSuccessRate');
    document.getElementById('sectionTitle').textContent = I18n.t('mgmtAllRequests');
    document.getElementById('labelSelectAll').textContent = I18n.t('batchSelectAll');
    document.getElementById('emptyState').textContent = I18n.t('mgmtNoRequests');
    document.getElementById('exportBtnText').textContent = I18n.t('btnExport').replace(/^[^\s]+\s/, '');
    document.getElementById('importBtnText').textContent = I18n.t('btnImport').replace(/^[^\s]+\s/, '');
    document.getElementById('dialogTitle').textContent = I18n.t('dialogEditTitle');
    document.getElementById('labelEditName').textContent = I18n.t('labelName') + ' *';
    document.getElementById('labelEditPattern').textContent = I18n.t('labelUrlPattern') + ' *';
    document.getElementById('labelEditCurl').textContent = I18n.t('labelCurl') + ' *';
    document.getElementById('labelEditCookie').textContent = I18n.t('labelCookieReplace');
    document.getElementById('hintEditCookie').textContent = I18n.t('hintCookie');
    document.getElementById('deleteBtn').textContent = I18n.t('btnDelete');
    document.getElementById('cancelBtn').textContent = I18n.t('btnCancel');
    document.getElementById('saveBtn').textContent = I18n.t('btnSave');
}

async function loadStats() {
    const stats = await browserAPI.runtime.sendMessage({ type: 'GET_STATISTICS' });
    document.getElementById('statTotal').textContent = stats.totalRequests;
    document.getElementById('statExecutions').textContent = stats.totalExecutions;
    document.getElementById('statSuccess').textContent = stats.successRate + '%';
}

async function loadRequests() {
    const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
    const tableEl = document.getElementById('requestTable');

    if (!requests || requests.length === 0) {
        tableEl.innerHTML = `<div class="empty-state">${I18n.t('mgmtNoRequests')}</div>`;
        return;
    }

    tableEl.innerHTML = requests.map(req => `
        <div class="request-row" data-id="${req.id}">
            <div class="request-checkbox">
                <input type="checkbox" class="item-checkbox" data-id="${req.id}">
            </div>
            <div class="request-info">
                <div class="request-name">${escapeHtml(req.name)}</div>
                <div class="request-details">
                    <span class="request-method">${req.parsedRequest?.method || 'GET'}</span>
                    <span class="request-pattern">${escapeHtml(req.urlPattern)}</span>
                </div>
                <div class="request-stats">
                    ${req.statistics?.executionCount || 0} ${I18n.t('statsExecutionCount')} · 
                    ${req.statistics?.avgResponseTime || 0}ms avg
                </div>
            </div>
            <div class="request-timer">
                <div class="timer-input-group">
                    <input type="number" class="timer-input" value="${activeTimers[req.id]?.interval || 60}" min="5" max="3600">
                    <span class="timer-unit">s</span>
                </div>
                <button class="btn btn-secondary btn-timer ${activeTimers[req.id] ? 'active' : ''}" data-id="${req.id}">
                    ${activeTimers[req.id] ? I18n.t('timerStop') : I18n.t('timerStart')}
                </button>
            </div>
            <div class="request-actions">
                <button class="btn btn-success btn-exec" data-id="${req.id}">${I18n.t('btnExecute')}</button>
                <button class="btn btn-secondary btn-edit" data-id="${req.id}">${I18n.t('btnEdit')}</button>
            </div>
        </div>
    `).join('');

    setupRowEventListeners();
}

function setupEventListeners() {
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', handleImport);

    document.getElementById('selectAll').addEventListener('change', (e) => {
        document.querySelectorAll('.item-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateBatchButton();
    });

    document.getElementById('batchExecBtn').addEventListener('click', handleBatchExecute);

    document.getElementById('closeDialog').addEventListener('click', closeDialog);
    document.getElementById('cancelBtn').addEventListener('click', closeDialog);
    document.getElementById('editDialog').addEventListener('click', (e) => {
        if (e.target.id === 'editDialog') closeDialog();
    });
    document.getElementById('editForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('deleteBtn').addEventListener('click', handleDelete);
}

function setupRowEventListeners() {
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBatchButton);
    });

    document.querySelectorAll('.btn-exec').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            executeRequest(btn.dataset.id, btn);
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditDialog(btn.dataset.id);
        });
    });

    document.querySelectorAll('.btn-timer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = btn.closest('.request-row');
            const input = row.querySelector('.timer-input');
            const interval = parseInt(input.value) || 60;
            handleTimerToggle(btn.dataset.id, interval, btn);
        });
    });
}

function updateBatchButton() {
    const selected = document.querySelectorAll('.item-checkbox:checked').length;
    const btn = document.getElementById('batchExecBtn');
    btn.textContent = I18n.t('batchExecuteSelected', { n: selected });
    btn.disabled = selected === 0;
}

async function handleExport() {
    const data = await browserAPI.runtime.sendMessage({ type: 'EXPORT_DATA' });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request-repeater-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(I18n.t('notifExported'), 'success');
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            const result = await browserAPI.runtime.sendMessage({ type: 'IMPORT_DATA', data });
            if (result.success) {
                showNotification(I18n.t('notifImported'), 'success');
                loadStats();
                loadRequests();
            } else {
                showNotification(I18n.t('notifImportFailed'), 'error');
            }
        } catch (err) {
            showNotification(I18n.t('notifInvalidJson'), 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function handleBatchExecute() {
    const selectedIds = Array.from(document.querySelectorAll('.item-checkbox:checked'))
        .map(cb => cb.dataset.id);

    if (selectedIds.length === 0) return;

    showNotification(I18n.t('notifBatchExecuting', { count: selectedIds.length }), 'info');

    const results = await browserAPI.runtime.sendMessage({
        type: 'EXECUTE_BATCH',
        requestIds: selectedIds
    });

    const successCount = results.filter(r => r.success).length;
    showNotification(
        I18n.t('notifBatchComplete', { success: successCount, total: selectedIds.length }),
        successCount === selectedIds.length ? 'success' : 'error'
    );

    loadStats();
    loadRequests();
}

async function executeRequest(id, btn) {
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    const result = await browserAPI.runtime.sendMessage({
        type: 'EXECUTE_REQUEST',
        requestId: id
    });

    btn.disabled = false;
    btn.textContent = originalText;

    if (result.success) {
        showNotification(`✓ ${result.statusCode} - ${result.responseTime}ms`, 'success');
    } else {
        showNotification(`✗ ${result.error}`, 'error');
    }

    loadStats();
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

async function openEditDialog(id) {
    const requests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
    const request = requests.find(r => r.id === id);
    if (!request) return;

    editingId = id;
    document.getElementById('editName').value = request.name;
    document.getElementById('editPattern').value = request.urlPattern;
    document.getElementById('editCurl').value = request.curl;
    document.getElementById('editCookie').value = (request.cookieReplace || []).join(', ');
    document.getElementById('editDialog').style.display = 'flex';
}

function closeDialog() {
    document.getElementById('editDialog').style.display = 'none';
    editingId = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('editName').value.trim(),
        urlPattern: document.getElementById('editPattern').value.trim(),
        curl: document.getElementById('editCurl').value.trim(),
        cookieReplace: document.getElementById('editCookie').value
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
    };

    const result = await browserAPI.runtime.sendMessage({
        type: 'UPDATE_REQUEST',
        id: editingId,
        data
    });

    if (result.success) {
        showNotification(I18n.t('notifUpdated'), 'success');
        closeDialog();
        loadRequests();
    } else {
        showNotification(`${I18n.t('notifError')}: ${result.error}`, 'error');
    }
}

async function handleDelete() {
    if (!confirm(I18n.t('mgmtConfirmDelete'))) return;

    const result = await browserAPI.runtime.sendMessage({
        type: 'DELETE_REQUEST',
        id: editingId
    });

    if (result.success) {
        showNotification(I18n.t('notifDeleted'), 'success');
        closeDialog();
        loadStats();
        loadRequests();
    } else {
        showNotification(I18n.t('notifDeleteFailed'), 'error');
    }
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
