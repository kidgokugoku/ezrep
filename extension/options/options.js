const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let editingId = null;
let editingGroupId = null;
let activeTimers = {};
let allGroups = [];
let allRequests = [];
let currentFilter = 'all';
let selectedGroupColor = '#3b82f6';

document.addEventListener('DOMContentLoaded', async () => {
    await I18n.init();
    await initTheme();
    applyTranslations();
    
    activeTimers = await browserAPI.runtime.sendMessage({ type: 'TIMER_GET_ALL' });
    
    await loadGroups();
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

async function initTheme() {
    const config = await browserAPI.runtime.sendMessage({ type: 'GET_CONFIG' });
    const theme = config.theme || 'auto';
    document.getElementById('themeSelect').value = theme;
    applyTheme(theme);
}

function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

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
    document.getElementById('groupAllLabel').textContent = I18n.t('groupAll');
    document.getElementById('groupUngroupedLabel').textContent = I18n.t('groupUngrouped');
    document.getElementById('labelEditGroup').textContent = I18n.t('labelGroup');
    document.getElementById('labelEditChain').textContent = I18n.t('labelChainNext');
    document.getElementById('groupDialogTitle').textContent = I18n.t('groupNew');
    document.getElementById('labelGroupName').textContent = I18n.t('groupName') + ' *';
    document.getElementById('labelGroupColor').textContent = I18n.t('groupColor');
    document.getElementById('cancelGroupBtn').textContent = I18n.t('btnCancel');
    document.getElementById('saveGroupBtn').textContent = I18n.t('btnSave');
    document.getElementById('deleteGroupBtn').textContent = I18n.t('groupDelete');
}

async function loadStats() {
    const stats = await browserAPI.runtime.sendMessage({ type: 'GET_STATISTICS' });
    document.getElementById('statTotal').textContent = stats.totalRequests;
    document.getElementById('statExecutions').textContent = stats.totalExecutions;
    document.getElementById('statSuccess').textContent = stats.successRate + '%';
}

async function loadGroups() {
    allGroups = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_GROUPS' });
    renderGroupList();
}

function renderGroupList() {
    const container = document.getElementById('groupList');
    const ungroupedCount = allRequests.filter(r => !r.groupId).length;
    
    let html = `
        <div class="group-item ${currentFilter === 'all' ? 'active' : ''}" data-group="all">
            <span class="group-icon">📁</span>
            <span class="group-name">${I18n.t('groupAll')}</span>
            <span class="group-count">${allRequests.length}</span>
        </div>
        <div class="group-item ${currentFilter === 'ungrouped' ? 'active' : ''}" data-group="ungrouped">
            <span class="group-icon">📄</span>
            <span class="group-name">${I18n.t('groupUngrouped')}</span>
            <span class="group-count">${ungroupedCount}</span>
        </div>
    `;
    
    allGroups.forEach(group => {
        const count = allRequests.filter(r => r.groupId === group.id).length;
        html += `
            <div class="group-item ${currentFilter === group.id ? 'active' : ''}" data-group="${group.id}">
                <span class="group-color" style="background:${group.color}"></span>
                <span class="group-name">${escapeHtml(group.name)}</span>
                <span class="group-count">${count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.group-item').forEach(item => {
        item.addEventListener('click', () => {
            currentFilter = item.dataset.group;
            renderGroupList();
            renderRequests();
        });
        
        if (item.dataset.group !== 'all' && item.dataset.group !== 'ungrouped') {
            item.addEventListener('dblclick', () => {
                openGroupDialog(item.dataset.group);
            });
        }
    });
}

async function loadRequests() {
    allRequests = await browserAPI.runtime.sendMessage({ type: 'GET_ALL_REQUESTS' });
    renderGroupList();
    renderRequests();
}

function renderRequests() {
    const tableEl = document.getElementById('requestTable');
    
    let filteredRequests = allRequests;
    if (currentFilter === 'ungrouped') {
        filteredRequests = allRequests.filter(r => !r.groupId);
    } else if (currentFilter !== 'all') {
        filteredRequests = allRequests.filter(r => r.groupId === currentFilter);
    }

    if (filteredRequests.length === 0) {
        tableEl.innerHTML = `<div class="empty-state">${I18n.t('mgmtNoRequests')}</div>`;
        return;
    }

    tableEl.innerHTML = filteredRequests.map(req => {
        const group = allGroups.find(g => g.id === req.groupId);
        const chainNext = req.chainNextId ? allRequests.find(r => r.id === req.chainNextId) : null;
        
        return `
        <div class="request-row" data-id="${req.id}">
            <div class="request-checkbox">
                <input type="checkbox" class="item-checkbox" data-id="${req.id}">
            </div>
            <div class="request-info">
                <div class="request-name">
                    ${escapeHtml(req.name)}
                    ${group ? `<span class="request-group-badge" style="background:${group.color}">${escapeHtml(group.name)}</span>` : ''}
                </div>
                <div class="request-details">
                    <span class="request-method">${req.parsedRequest?.method || 'GET'}</span>
                    <span class="request-pattern">${escapeHtml(req.urlPattern)}</span>
                </div>
                <div class="request-stats">
                    ${req.statistics?.executionCount || 0} ${I18n.t('statsExecutionCount')} · 
                    ${req.statistics?.avgResponseTime || 0}ms avg
                    ${chainNext ? `<span class="request-chain">→ ${escapeHtml(chainNext.name)}</span>` : ''}
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
    `}).join('');

    setupRowEventListeners();
}

function setupEventListeners() {
    document.getElementById('themeSelect').addEventListener('change', async (e) => {
        const theme = e.target.value;
        applyTheme(theme);
        const config = await browserAPI.runtime.sendMessage({ type: 'GET_CONFIG' });
        await browserAPI.runtime.sendMessage({ 
            type: 'SAVE_CONFIG', 
            data: { ...config, theme } 
        });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const theme = document.getElementById('themeSelect').value;
        if (theme === 'auto') {
            applyTheme('auto');
        }
    });

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

    document.getElementById('addGroupBtn').addEventListener('click', () => openGroupDialog());
    document.getElementById('closeGroupDialog').addEventListener('click', closeGroupDialog);
    document.getElementById('cancelGroupBtn').addEventListener('click', closeGroupDialog);
    document.getElementById('groupDialog').addEventListener('click', (e) => {
        if (e.target.id === 'groupDialog') closeGroupDialog();
    });
    document.getElementById('groupForm').addEventListener('submit', handleGroupSubmit);
    document.getElementById('deleteGroupBtn').addEventListener('click', handleGroupDelete);

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedGroupColor = btn.dataset.color;
        });
    });
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
    data.groups = allGroups;
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
                await loadGroups();
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
        let msg = `✓ ${result.statusCode} - ${result.responseTime}ms`;
        if (result.chainResult) {
            msg += ` (chain: ${result.chainResult.success ? '✓' : '✗'})`;
        }
        showNotification(msg, 'success');
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
        const request = allRequests.find(r => r.id === requestId);
        await browserAPI.runtime.sendMessage({ type: 'TIMER_START', requestId, interval });
        showNotification(I18n.t('timerRunning', { name: request?.name || I18n.t('unnamedRequest') }), 'success');
    }
}

async function openEditDialog(id) {
    const request = allRequests.find(r => r.id === id);
    if (!request) return;

    editingId = id;
    document.getElementById('editName').value = request.name;
    document.getElementById('editPattern').value = request.urlPattern;
    document.getElementById('editCurl').value = request.curl;
    document.getElementById('editCookie').value = (request.cookieReplace || []).join(', ');
    
    const groupSelect = document.getElementById('editGroup');
    groupSelect.innerHTML = `<option value="">${I18n.t('groupUngrouped')}</option>` +
        allGroups.map(g => `<option value="${g.id}" ${request.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
    
    const chainSelect = document.getElementById('editChain');
    chainSelect.innerHTML = `<option value="">${I18n.t('chainNone')}</option>` +
        allRequests.filter(r => r.id !== id).map(r => 
            `<option value="${r.id}" ${request.chainNextId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
        ).join('');
    
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
            .filter(s => s.length > 0),
        groupId: document.getElementById('editGroup').value || null,
        chainNextId: document.getElementById('editChain').value || null
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

function openGroupDialog(groupId = null) {
    editingGroupId = groupId;
    const group = groupId ? allGroups.find(g => g.id === groupId) : null;
    
    document.getElementById('groupDialogTitle').textContent = group ? I18n.t('dialogEditTitle') : I18n.t('groupNew');
    document.getElementById('groupName').value = group ? group.name : '';
    document.getElementById('deleteGroupBtn').style.display = group ? 'block' : 'none';
    
    selectedGroupColor = group ? group.color : '#3b82f6';
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === selectedGroupColor);
    });
    
    document.getElementById('groupDialog').style.display = 'flex';
}

function closeGroupDialog() {
    document.getElementById('groupDialog').style.display = 'none';
    editingGroupId = null;
}

async function handleGroupSubmit(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('groupName').value.trim(),
        color: selectedGroupColor
    };
    
    let result;
    if (editingGroupId) {
        result = await browserAPI.runtime.sendMessage({
            type: 'UPDATE_GROUP',
            id: editingGroupId,
            data
        });
    } else {
        result = await browserAPI.runtime.sendMessage({
            type: 'CREATE_GROUP',
            data
        });
    }
    
    if (result.success || result.group) {
        showNotification(editingGroupId ? I18n.t('notifUpdated') : I18n.t('notifAdded'), 'success');
        closeGroupDialog();
        await loadGroups();
        loadRequests();
    } else {
        showNotification(I18n.t('notifError'), 'error');
    }
}

async function handleGroupDelete() {
    if (!confirm(I18n.t('groupConfirmDelete'))) return;
    
    const result = await browserAPI.runtime.sendMessage({
        type: 'DELETE_GROUP',
        id: editingGroupId
    });
    
    if (result.success) {
        showNotification(I18n.t('notifDeleted'), 'success');
        closeGroupDialog();
        currentFilter = 'all';
        await loadGroups();
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
