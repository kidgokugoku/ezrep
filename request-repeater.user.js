// ==UserScript==
// @name         Request Repeater
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Execute curl requests with current page cookies - bind requests to URL patterns
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/curlconverter@4.9.0/dist/index-browser.min.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // MODULE: StorageAdapter
    // ============================================================================
    
    const StorageAdapter = {
        KEYS: {
            REQUESTS: 'req_repeater_requests',
            CONFIG: 'req_repeater_config'
        },

        /**
         * Get all requests
         * @returns {Array} Array of request objects
         */
        getAllRequests() {
            const data = GM_getValue(this.KEYS.REQUESTS, '[]');
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('[StorageAdapter] Failed to parse requests:', e);
                return [];
            }
        },

        /**
         * Save all requests
         * @param {Array} requests - Array of request objects
         * @returns {boolean} Success status
         */
        saveAllRequests(requests) {
            try {
                GM_setValue(this.KEYS.REQUESTS, JSON.stringify(requests));
                return true;
            } catch (e) {
                console.error('[StorageAdapter] Failed to save requests:', e);
                return false;
            }
        },

        /**
         * Add a new request
         * @param {Object} request - Request object
         * @returns {boolean} Success status
         */
        addRequest(request) {
            const requests = this.getAllRequests();
            requests.push({
                ...request,
                id: this._generateUUID(),
                createdAt: Date.now(),
                lastExecuted: null,
                statistics: {
                    executionCount: 0,
                    successCount: 0,
                    failureCount: 0,
                    totalResponseTime: 0,
                    avgResponseTime: 0
                }
            });
            return this.saveAllRequests(requests);
        },

        /**
         * Update an existing request
         * @param {string} id - Request ID
         * @param {Object} updates - Fields to update
         * @returns {boolean} Success status
         */
        updateRequest(id, updates) {
            const requests = this.getAllRequests();
            const index = requests.findIndex(r => r.id === id);
            if (index === -1) return false;
            
            requests[index] = { ...requests[index], ...updates };
            return this.saveAllRequests(requests);
        },

        /**
         * Delete a request
         * @param {string} id - Request ID
         * @returns {boolean} Success status
         */
        deleteRequest(id) {
            const requests = this.getAllRequests();
            const filtered = requests.filter(r => r.id !== id);
            return this.saveAllRequests(filtered);
        },

        /**
         * Get request by ID
         * @param {string} id - Request ID
         * @returns {Object|null} Request object or null
         */
        getRequest(id) {
            const requests = this.getAllRequests();
            return requests.find(r => r.id === id) || null;
        },

        /**
         * Get global configuration
         * @returns {Object} Config object
         */
        getConfig() {
            const data = GM_getValue(this.KEYS.CONFIG, '{}');
            try {
                const config = JSON.parse(data);
                return {
                    defaultCookieReplace: config.defaultCookieReplace || [],
                    notificationDuration: config.notificationDuration || 5000,
                    enableBatchExecution: config.enableBatchExecution !== false
                };
            } catch (e) {
                console.error('[StorageAdapter] Failed to parse config:', e);
                return {
                    defaultCookieReplace: [],
                    notificationDuration: 5000,
                    enableBatchExecution: true
                };
            }
        },

        /**
         * Save global configuration
         * @param {Object} config - Config object
         * @returns {boolean} Success status
         */
        saveConfig(config) {
            try {
                GM_setValue(this.KEYS.CONFIG, JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('[StorageAdapter] Failed to save config:', e);
                return false;
            }
        },

        /**
         * Export all data
         * @returns {Object} All data
         */
        exportAll() {
            return {
                requests: this.getAllRequests(),
                config: this.getConfig(),
                exportedAt: Date.now(),
                version: '1.0.0'
            };
        },

        /**
         * Import data
         * @param {Object} data - Data to import
         * @returns {boolean} Success status
         */
        importAll(data) {
            try {
                if (data.requests) {
                    this.saveAllRequests(data.requests);
                }
                if (data.config) {
                    this.saveConfig(data.config);
                }
                return true;
            } catch (e) {
                console.error('[StorageAdapter] Failed to import data:', e);
                return false;
            }
        },

        /**
         * Generate UUID v4
         * @private
         */
        _generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    };

    console.log('[RequestRepeater] StorageAdapter module loaded');

    // ============================================================================
    // MODULE: CurlParser
    // ============================================================================
    
    const CurlParser = {
        parse(curlCommand) {
            try {
                if (!curlCommand || typeof curlCommand !== 'string') {
                    throw new Error('Invalid curl command');
                }

                const trimmed = curlCommand.trim();
                if (!trimmed.startsWith('curl')) {
                    throw new Error('Command must start with "curl"');
                }

                const parsed = curlconverter.toJsonString(trimmed);
                const result = JSON.parse(parsed);

                return {
                    success: true,
                    data: {
                        url: result.url || result.uri || '',
                        method: (result.method || 'GET').toUpperCase(),
                        headers: result.headers || {},
                        body: result.body || result.data || null,
                        cookies: this._extractCookies(result.headers)
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message || 'Failed to parse curl command'
                };
            }
        },

        _extractCookies(headers) {
            if (!headers) return {};
            
            const cookieHeader = headers['Cookie'] || headers['cookie'] || '';
            if (!cookieHeader) return {};

            const cookies = {};
            cookieHeader.split(';').forEach(pair => {
                const [key, ...valueParts] = pair.trim().split('=');
                if (key) {
                    cookies[key] = valueParts.join('=');
                }
            });
            return cookies;
        },

        validate(curlCommand) {
            const result = this.parse(curlCommand);
            if (!result.success) {
                return { valid: false, error: result.error };
            }
            
            if (!result.data.url) {
                return { valid: false, error: 'No URL found in curl command' };
            }

            try {
                new URL(result.data.url);
            } catch (e) {
                return { valid: false, error: 'Invalid URL format' };
            }

            return { valid: true, data: result.data };
        }
    };

    console.log('[RequestRepeater] CurlParser module loaded');

    // ============================================================================
    // MODULE: RequestExecutor
    // ============================================================================
    
    const RequestExecutor = {
        async execute(requestId) {
            const request = StorageAdapter.getRequest(requestId);
            if (!request) {
                return {
                    success: false,
                    error: 'Request not found'
                };
            }

            const startTime = Date.now();

            try {
                const parsedRequest = request.parsedRequest;
                const finalHeaders = await this._prepareFinalHeaders(
                    parsedRequest.headers,
                    parsedRequest.cookies,
                    request.cookieReplace || []
                );

                const response = await this._sendRequest({
                    url: parsedRequest.url,
                    method: parsedRequest.method,
                    headers: finalHeaders,
                    data: parsedRequest.body
                });

                const responseTime = Date.now() - startTime;
                const success = response.status >= 200 && response.status < 300;

                this._updateStatistics(requestId, success, responseTime);

                return {
                    success: true,
                    statusCode: response.status,
                    statusText: response.statusText,
                    responseTime,
                    responseBody: response.responseText,
                    headers: response.responseHeaders
                };

            } catch (error) {
                const responseTime = Date.now() - startTime;
                this._updateStatistics(requestId, false, responseTime);

                return {
                    success: false,
                    error: error.message || 'Request failed',
                    responseTime
                };
            }
        },

        async _prepareFinalHeaders(originalHeaders, curlCookies, cookieReplaceList) {
            const headers = { ...originalHeaders };
            
            if (cookieReplaceList.length === 0) {
                return headers;
            }

            try {
                const currentCookies = await this._getCurrentPageCookies();
                const finalCookies = { ...curlCookies };

                cookieReplaceList.forEach(cookieName => {
                    if (currentCookies[cookieName]) {
                        finalCookies[cookieName] = currentCookies[cookieName];
                    }
                });

                const cookieString = Object.entries(finalCookies)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ');

                if (cookieString) {
                    headers['Cookie'] = cookieString;
                }

            } catch (error) {
                console.error('[RequestExecutor] Failed to prepare cookies:', error);
            }

            return headers;
        },

        async _getCurrentPageCookies() {
            return new Promise((resolve) => {
                const cookies = {};
                const cookieStr = document.cookie;
                
                cookieStr.split(';').forEach(pair => {
                    const [key, ...valueParts] = pair.trim().split('=');
                    if (key) {
                        cookies[key] = valueParts.join('=');
                    }
                });

                resolve(cookies);
            });
        },

        _sendRequest(config) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                    data: config.data,
                    onload: (response) => resolve(response),
                    onerror: (error) => reject(error),
                    ontimeout: () => reject(new Error('Request timeout'))
                });
            });
        },

        _updateStatistics(requestId, success, responseTime) {
            const request = StorageAdapter.getRequest(requestId);
            if (!request) return;

            const stats = request.statistics || {
                executionCount: 0,
                successCount: 0,
                failureCount: 0,
                totalResponseTime: 0,
                avgResponseTime: 0
            };

            stats.executionCount++;
            if (success) {
                stats.successCount++;
            } else {
                stats.failureCount++;
            }
            stats.totalResponseTime += responseTime;
            stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.executionCount);

            StorageAdapter.updateRequest(requestId, {
                lastExecuted: Date.now(),
                statistics: stats
            });
        },

        async executeBatch(requestIds) {
            const results = [];
            for (const id of requestIds) {
                const result = await this.execute(id);
                results.push({ requestId: id, ...result });
            }
            return results;
        }
    };

    console.log('[RequestRepeater] RequestExecutor module loaded');

    // ============================================================================
    // MODULE: RequestManager
    // ============================================================================
    
    const RequestManager = {
        matchesCurrentUrl(urlPattern) {
            const currentUrl = window.location.href;
            return this._matchPattern(currentUrl, urlPattern);
        },

        _matchPattern(url, pattern) {
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const patternRegex = new RegExp(
                '^' + escapeRegex(pattern).replace(/\\\*/g, '.*') + '$'
            );
            return patternRegex.test(url);
        },

        getRequestsForCurrentUrl() {
            const currentUrl = window.location.href;
            const allRequests = StorageAdapter.getAllRequests();
            
            const matched = allRequests.filter(req => 
                this._matchPattern(currentUrl, req.urlPattern)
            );

            return matched.sort((a, b) => {
                const aTime = a.lastExecuted || 0;
                const bTime = b.lastExecuted || 0;
                return bTime - aTime;
            });
        },

        createRequest(data) {
            const parseResult = CurlParser.validate(data.curl);
            if (!parseResult.valid) {
                return {
                    success: false,
                    error: parseResult.error
                };
            }

            const request = {
                name: data.name || 'Unnamed Request',
                urlPattern: data.urlPattern || window.location.href,
                curl: data.curl,
                parsedRequest: parseResult.data,
                cookieReplace: data.cookieReplace || []
            };

            const success = StorageAdapter.addRequest(request);
            return {
                success,
                error: success ? null : 'Failed to save request'
            };
        },

        updateRequest(id, data) {
            const updates = { ...data };
            
            if (data.curl) {
                const parseResult = CurlParser.validate(data.curl);
                if (!parseResult.valid) {
                    return {
                        success: false,
                        error: parseResult.error
                    };
                }
                updates.parsedRequest = parseResult.data;
            }

            const success = StorageAdapter.updateRequest(id, updates);
            return {
                success,
                error: success ? null : 'Failed to update request'
            };
        },

        deleteRequest(id) {
            const success = StorageAdapter.deleteRequest(id);
            return {
                success,
                error: success ? null : 'Failed to delete request'
            };
        },

        getAllRequests() {
            return StorageAdapter.getAllRequests();
        },

        getStatistics() {
            const requests = StorageAdapter.getAllRequests();
            const totalExecutions = requests.reduce(
                (sum, r) => sum + (r.statistics?.executionCount || 0), 0
            );
            const totalSuccess = requests.reduce(
                (sum, r) => sum + (r.statistics?.successCount || 0), 0
            );
            
            return {
                totalRequests: requests.length,
                totalExecutions,
                successRate: totalExecutions > 0 
                    ? ((totalSuccess / totalExecutions) * 100).toFixed(1) 
                    : 0
            };
        }
    };

    console.log('[RequestRepeater] RequestManager module loaded');

    // ============================================================================
    // MODULE: UIController
    // ============================================================================
    
    const UIController = {
        init() {
            this._injectStyles();
            this._registerMenuCommands();
            console.log('[UIController] Initialized');
        },

        _registerMenuCommands() {
            GM_registerMenuCommand('⚡ Execute Requests', () => this.showExecuteDialog());
            GM_registerMenuCommand('➕ Add New Request', () => this.showAddDialog());
            GM_registerMenuCommand('⚙️ Manage All Requests', () => this.openManagementPage());
            GM_registerMenuCommand('📊 View Statistics', () => this.showStatistics());
        },

        showExecuteDialog() {
            const requests = RequestManager.getRequestsForCurrentUrl();
            
            if (requests.length === 0) {
                this.showNotification('No requests bound to this URL', 'info');
                return;
            }

            const dialogHTML = `
                <div class="rr-dialog-overlay">
                    <div class="rr-dialog">
                        <div class="rr-dialog-header">
                            <h3>Execute Requests</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <p class="rr-url-info">Current URL: ${window.location.href}</p>
                            <div class="rr-request-list">
                                ${requests.map(req => `
                                    <div class="rr-request-item" data-id="${req.id}">
                                        <div class="rr-request-info">
                                            <strong>${this._escapeHtml(req.name)}</strong>
                                            <small>${req.parsedRequest.method} ${this._shortenUrl(req.parsedRequest.url)}</small>
                                            ${req.lastExecuted ? `<small>Last: ${this._formatTime(req.lastExecuted)}</small>` : ''}
                                        </div>
                                        <div class="rr-request-actions">
                                            <button class="rr-btn rr-btn-primary rr-execute-btn" data-id="${req.id}">Execute</button>
                                            <button class="rr-btn rr-btn-secondary rr-edit-btn" data-id="${req.id}">Edit</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${requests.length > 1 ? `
                                <button class="rr-btn rr-btn-primary rr-batch-execute-btn" style="margin-top: 15px; width: 100%;">
                                    Execute All (${requests.length} requests)
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            this._showDialog(dialogHTML, {
                '.rr-execute-btn': (btn) => this._handleExecute(btn.dataset.id),
                '.rr-edit-btn': (btn) => this._handleEdit(btn.dataset.id),
                '.rr-batch-execute-btn': () => this._handleBatchExecute(requests.map(r => r.id))
            });
        },

        showAddDialog(editId = null) {
            const isEdit = !!editId;
            const request = isEdit ? StorageAdapter.getRequest(editId) : null;

            const dialogHTML = `
                <div class="rr-dialog-overlay">
                    <div class="rr-dialog rr-dialog-large">
                        <div class="rr-dialog-header">
                            <h3>${isEdit ? 'Edit Request' : 'Add New Request'}</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <form class="rr-form" id="rr-request-form">
                                <div class="rr-form-group">
                                    <label>Request Name *</label>
                                    <input type="text" name="name" class="rr-input" placeholder="e.g., Get User Info" 
                                           value="${isEdit ? this._escapeHtml(request.name) : ''}" required>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>URL Pattern *</label>
                                    <input type="text" name="urlPattern" class="rr-input" 
                                           placeholder="e.g., https://example.com/users/*" 
                                           value="${isEdit ? this._escapeHtml(request.urlPattern) : window.location.href}" required>
                                    <small>Use * as wildcard. Current URL is pre-filled.</small>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>cURL Command *</label>
                                    <textarea name="curl" class="rr-textarea" rows="6" 
                                              placeholder="curl 'https://api.example.com/users' -H 'Authorization: Bearer xxx'" 
                                              required>${isEdit ? this._escapeHtml(request.curl) : ''}</textarea>
                                    <small>Paste your curl command here. Full syntax supported.</small>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>Cookie Replace List</label>
                                    <input type="text" name="cookieReplace" class="rr-input" 
                                           placeholder="e.g., sessionId, token, userId" 
                                           value="${isEdit ? request.cookieReplace.join(', ') : ''}">
                                    <small>Comma-separated cookie names to replace with current page cookies.</small>
                                </div>
                                
                                <div class="rr-form-actions">
                                    <button type="button" class="rr-btn rr-btn-secondary rr-cancel-btn">Cancel</button>
                                    <button type="submit" class="rr-btn rr-btn-primary">${isEdit ? 'Update' : 'Add'} Request</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            this._showDialog(dialogHTML, {
                '#rr-request-form': (form) => this._handleFormSubmit(form, editId)
            });
        },

        showStatistics() {
            const stats = RequestManager.getStatistics();
            const allRequests = RequestManager.getAllRequests();
            
            const topRequests = allRequests
                .sort((a, b) => (b.statistics?.executionCount || 0) - (a.statistics?.executionCount || 0))
                .slice(0, 5);

            const dialogHTML = `
                <div class="rr-dialog-overlay">
                    <div class="rr-dialog">
                        <div class="rr-dialog-header">
                            <h3>Statistics</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <div class="rr-stats-grid">
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalRequests}</div>
                                    <div class="rr-stat-label">Total Requests</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalExecutions}</div>
                                    <div class="rr-stat-label">Total Executions</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.successRate}%</div>
                                    <div class="rr-stat-label">Success Rate</div>
                                </div>
                            </div>
                            
                            ${topRequests.length > 0 ? `
                                <h4 style="margin-top: 20px; margin-bottom: 10px;">Top 5 Most Used</h4>
                                <div class="rr-top-requests">
                                    ${topRequests.map(req => `
                                        <div class="rr-top-request-item">
                                            <strong>${this._escapeHtml(req.name)}</strong>
                                            <span>${req.statistics?.executionCount || 0} executions</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            this._showDialog(dialogHTML);
        },

        openManagementPage() {
            const data = StorageAdapter.exportAll();
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(this._generateManagementPageHTML(data));
            window.open(dataUrl, '_blank');
        },

        async _handleExecute(requestId) {
            this.showNotification('Executing request...', 'info');
            
            const result = await RequestExecutor.execute(requestId);
            
            if (result.success) {
                this.showNotification(
                    `✓ ${result.statusCode} - ${result.responseTime}ms`,
                    'success'
                );
            } else {
                this.showNotification(
                    `✗ Failed: ${result.error}`,
                    'error'
                );
            }
        },

        async _handleBatchExecute(requestIds) {
            this.showNotification(`Executing ${requestIds.length} requests...`, 'info');
            
            const results = await RequestExecutor.executeBatch(requestIds);
            const successCount = results.filter(r => r.success).length;
            
            this.showNotification(
                `Batch complete: ${successCount}/${requestIds.length} succeeded`,
                successCount === requestIds.length ? 'success' : 'warning'
            );
        },

        _handleEdit(requestId) {
            this._closeCurrentDialog();
            this.showAddDialog(requestId);
        },

        _handleFormSubmit(form, editId) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const data = {
                    name: formData.get('name').trim(),
                    urlPattern: formData.get('urlPattern').trim(),
                    curl: formData.get('curl').trim(),
                    cookieReplace: formData.get('cookieReplace')
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                };

                let result;
                if (editId) {
                    result = RequestManager.updateRequest(editId, data);
                } else {
                    result = RequestManager.createRequest(data);
                }

                if (result.success) {
                    this.showNotification(
                        editId ? 'Request updated successfully' : 'Request added successfully',
                        'success'
                    );
                    this._closeCurrentDialog();
                } else {
                    this.showNotification(`Error: ${result.error}`, 'error');
                }
            });
        },

        _showDialog(html, eventHandlers = {}) {
            this._closeCurrentDialog();
            
            const container = document.createElement('div');
            container.innerHTML = html;
            const dialog = container.firstElementChild;
            
            dialog.querySelector('.rr-close-btn')?.addEventListener('click', () => {
                this._closeCurrentDialog();
            });
            
            dialog.querySelector('.rr-cancel-btn')?.addEventListener('click', () => {
                this._closeCurrentDialog();
            });
            
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    this._closeCurrentDialog();
                }
            });

            Object.entries(eventHandlers).forEach(([selector, handler]) => {
                const elements = dialog.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.tagName === 'FORM') {
                        handler(el);
                    } else {
                        el.addEventListener('click', () => handler(el));
                    }
                });
            });

            document.body.appendChild(dialog);
        },

        _closeCurrentDialog() {
            document.querySelectorAll('.rr-dialog-overlay').forEach(el => el.remove());
        },

        showNotification(message, type = 'info') {
            const config = StorageAdapter.getConfig();
            const duration = config.notificationDuration;

            const notification = document.createElement('div');
            notification.className = `rr-notification rr-notification-${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('rr-notification-show'), 10);
            
            setTimeout(() => {
                notification.classList.remove('rr-notification-show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        },

        _injectStyles() {
            GM_addStyle(`
                .rr-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                    backdrop-filter: blur(4px);
                }
                
                .rr-dialog {
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .rr-dialog-large {
                    max-width: 800px;
                }
                
                .rr-dialog-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .rr-dialog-header h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                }
                
                .rr-close-btn {
                    background: none;
                    border: none;
                    font-size: 28px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                
                .rr-close-btn:hover {
                    background: #f3f4f6;
                    color: #111827;
                }
                
                .rr-dialog-body {
                    padding: 24px;
                    overflow-y: auto;
                }
                
                .rr-url-info {
                    margin: 0 0 16px 0;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #6b7280;
                    word-break: break-all;
                }
                
                .rr-request-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .rr-request-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                
                .rr-request-item:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                }
                
                .rr-request-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .rr-request-info strong {
                    color: #111827;
                    font-size: 15px;
                }
                
                .rr-request-info small {
                    color: #6b7280;
                    font-size: 13px;
                }
                
                .rr-request-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .rr-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .rr-btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                }
                
                .rr-btn-primary:hover {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                }
                
                .rr-btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .rr-btn-secondary:hover {
                    background: #e5e7eb;
                }
                
                .rr-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .rr-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .rr-form-group label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                
                .rr-input, .rr-textarea {
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                
                .rr-input:focus, .rr-textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .rr-textarea {
                    resize: vertical;
                    font-family: 'Monaco', 'Courier New', monospace;
                    font-size: 13px;
                }
                
                .rr-form-group small {
                    color: #6b7280;
                    font-size: 12px;
                }
                
                .rr-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 8px;
                }
                
                .rr-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    z-index: 1000000;
                    opacity: 0;
                    transform: translateX(400px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    max-width: 400px;
                    font-size: 14px;
                    border-left: 4px solid #3b82f6;
                }
                
                .rr-notification-show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .rr-notification-success {
                    border-left-color: #10b981;
                    color: #065f46;
                }
                
                .rr-notification-error {
                    border-left-color: #ef4444;
                    color: #991b1b;
                }
                
                .rr-notification-warning {
                    border-left-color: #f59e0b;
                    color: #92400e;
                }
                
                .rr-notification-info {
                    border-left-color: #3b82f6;
                    color: #1e40af;
                }
                
                .rr-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }
                
                .rr-stat-card {
                    padding: 20px;
                    background: linear-gradient(135deg, #f9fafb, #f3f4f6);
                    border-radius: 8px;
                    text-align: center;
                }
                
                .rr-stat-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #3b82f6;
                    margin-bottom: 8px;
                }
                
                .rr-stat-label {
                    font-size: 13px;
                    color: #6b7280;
                    font-weight: 500;
                }
                
                .rr-top-requests {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .rr-top-request-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 6px;
                    font-size: 14px;
                }
                
                .rr-top-request-item strong {
                    color: #111827;
                }
                
                .rr-top-request-item span {
                    color: #6b7280;
                    font-size: 13px;
                }
            `);
        },

        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        _shortenUrl(url) {
            if (url.length <= 50) return url;
            return url.substring(0, 47) + '...';
        },

        _formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            return Math.floor(diff / 86400000) + 'd ago';
        },

        _generateManagementPageHTML(data) {
            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Request Repeater - Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f9fafb;
            padding: 40px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 32px; color: #111827; }
        .actions { 
            display: flex; 
            gap: 12px; 
            margin-bottom: 24px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            transform: translateY(-1px);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 32px;
        }
        .stat-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 36px;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #6b7280;
            font-size: 14px;
        }
        .request-table {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #f9fafb;
            padding: 16px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
        }
        td {
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 14px;
            color: #111827;
        }
        tr:hover {
            background: #f9fafb;
        }
        .url-pattern {
            font-family: 'Monaco', monospace;
            font-size: 12px;
            color: #6b7280;
        }
        .stats-inline {
            font-size: 12px;
            color: #6b7280;
        }
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Request Repeater - Management</h1>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="exportData()">📥 Export All Data</button>
            <button class="btn btn-primary" onclick="importData()">📤 Import Data</button>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${data.requests.length}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.requests.reduce((s, r) => s + (r.statistics?.executionCount || 0), 0)}</div>
                <div class="stat-label">Total Executions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(() => {
                    const total = data.requests.reduce((s, r) => s + (r.statistics?.executionCount || 0), 0);
                    const success = data.requests.reduce((s, r) => s + (r.statistics?.successCount || 0), 0);
                    return total > 0 ? ((success / total) * 100).toFixed(1) : 0;
                })()}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>
        
        <div class="request-table">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>URL Pattern</th>
                        <th>Method</th>
                        <th>Cookie Replace</th>
                        <th>Statistics</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.requests.map(req => `
                        <tr>
                            <td><strong>${req.name}</strong></td>
                            <td><code class="url-pattern">${req.urlPattern}</code></td>
                            <td><code>${req.parsedRequest.method}</code></td>
                            <td>${req.cookieReplace.map(c => `<code>${c}</code>`).join(' ')}</td>
                            <td class="stats-inline">
                                ${req.statistics?.executionCount || 0} execs, 
                                ${req.statistics?.successCount || 0} success,
                                ${req.statistics?.avgResponseTime || 0}ms avg
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        const data = ${JSON.stringify(data)};
        
        function exportData() {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'request-repeater-backup-' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function importData() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const imported = JSON.parse(event.target.result);
                        alert('Data loaded. Please copy this JSON and use GM_setValue to import manually.');
                        console.log('Import data:', imported);
                    } catch (err) {
                        alert('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }
    </script>
</body>
</html>`;
        }
    };

    UIController.init();

})();
