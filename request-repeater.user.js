// ==UserScript==
// @name         Request Repeater
// @name:zh-CN   请求重放器
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  Execute curl requests with current page cookies - bind requests to URL patterns
// @description:zh-CN  执行 curl 请求并使用当前页面 Cookie - 将请求绑定到 URL 模式
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const _startTime = performance.now();

    // ============================================================================
    // MODULE: I18n (Internationalization)
    // ============================================================================
    
    const I18n = {
        locale: 'auto',
        
        translations: {
            'en': {
                menuExecute: '⚡ Execute Requests',
                menuAdd: '➕ Add New Request',
                menuManage: '⚙️ Manage All Requests',
                menuStats: '📊 View Statistics',
                menuLanguage: '🌐 Language',
                
                dialogExecuteTitle: 'Execute Requests',
                dialogAddTitle: 'Add New Request',
                dialogEditTitle: 'Edit Request',
                dialogStatsTitle: 'Statistics',
                dialogCurrentUrl: 'Current URL',
                dialogExecuteAll: 'Execute All',
                
                btnExecute: 'Execute',
                btnEdit: 'Edit',
                btnDelete: 'Delete',
                btnAdd: 'Add',
                btnUpdate: 'Update',
                btnCancel: 'Cancel',
                btnClose: 'Close',
                btnExport: 'Export All Data',
                btnImport: 'Import Data',
                
                labelName: 'Request Name',
                labelUrlPattern: 'URL Pattern',
                labelCurl: 'cURL Command',
                labelCookieReplace: 'Cookie Replace List',
                
                placeholderName: 'e.g., Get User Info',
                placeholderUrlPattern: 'e.g., https://example.com/users/*',
                placeholderCurl: 'curl \'https://api.example.com/users\' -H \'Authorization: Bearer xxx\'',
                placeholderCookie: 'e.g., sessionId, token, userId',
                
                hintUrlPattern: 'Use * as wildcard. Current URL is pre-filled.',
                hintCurl: 'Paste your curl command here. Full syntax supported.',
                hintCookie: 'Comma-separated cookie names to replace with current page cookies. Leave empty to use all page cookies.',
                
                statsTotal: 'Total Requests',
                statsExecutions: 'Total Executions',
                statsSuccessRate: 'Success Rate',
                statsTopRequests: 'Top 5 Most Used',
                statsExecutionCount: 'executions',
                
                notifExecuting: 'Executing request...',
                notifBatchExecuting: 'Executing {count} requests...',
                notifBatchComplete: 'Batch complete: {success}/{total} succeeded',
                notifAdded: 'Request added successfully',
                notifUpdated: 'Request updated successfully',
                notifError: 'Error',
                notifNoRequests: 'No requests bound to this URL',
                
                errorInvalidCurl: 'Invalid curl command',
                errorCurlStart: 'Command must start with "curl"',
                errorParseFailed: 'Failed to parse curl command',
                errorNoUrl: 'No URL found in curl command',
                errorInvalidUrl: 'Invalid URL format',
                errorRequestNotFound: 'Request not found',
                errorRequestFailed: 'Request failed',
                
                mgmtTitle: 'Request Repeater - Management',
                mgmtColName: 'Name',
                mgmtColPattern: 'URL Pattern',
                mgmtColMethod: 'Method',
                mgmtColCookie: 'Cookie Replace',
                mgmtColStats: 'Statistics',
                mgmtStatsFormat: '{count} execs, {success} success, {avg}ms avg',
                
                timeJustNow: 'Just now',
                timeMinutesAgo: '{n}m ago',
                timeHoursAgo: '{n}h ago',
                timeDaysAgo: '{n}d ago',
                timeLast: 'Last',
                
                method: 'Method',
                
                mgmtAllRequests: 'All Requests',
                mgmtNoRequests: 'No requests yet. Add one from the menu.',
                mgmtActions: 'Actions',
                mgmtConfirmDelete: 'Are you sure you want to delete this request?',
                
                timerStart: 'Start Timer',
                timerStop: 'Stop Timer',
                timerInterval: 'Interval (seconds)',
                timerRunning: 'Timer running: {name}',
                timerStopped: 'Timer stopped',
                timerNextRun: 'Next run in {n}s',
                
                batchSelect: 'Select for batch',
                batchExecuteSelected: 'Execute Selected ({n})',
                batchNoneSelected: 'No requests selected',
                batchSelectAll: 'Select All',
                
                repeatTimes: 'times',
                repeatExecute: 'Run {n}x',
                repeatRunning: 'Running {current}/{total}...',
                repeatComplete: 'Completed {success}/{total}'
            },
            'zh': {
                menuExecute: '⚡ 执行请求',
                menuAdd: '➕ 添加新请求',
                menuManage: '⚙️ 管理所有请求',
                menuStats: '📊 查看统计',
                menuLanguage: '🌐 语言',
                
                dialogExecuteTitle: '执行请求',
                dialogAddTitle: '添加新请求',
                dialogEditTitle: '编辑请求',
                dialogStatsTitle: '统计信息',
                dialogCurrentUrl: '当前 URL',
                dialogExecuteAll: '全部执行',
                
                btnExecute: '执行',
                btnEdit: '编辑',
                btnDelete: '删除',
                btnAdd: '添加',
                btnUpdate: '更新',
                btnCancel: '取消',
                btnClose: '关闭',
                btnExport: '导出所有数据',
                btnImport: '导入数据',
                
                labelName: '请求名称',
                labelUrlPattern: 'URL 模式',
                labelCurl: 'cURL 命令',
                labelCookieReplace: 'Cookie 替换列表',
                
                placeholderName: '例如：获取用户信息',
                placeholderUrlPattern: '例如：https://example.com/users/*',
                placeholderCurl: 'curl \'https://api.example.com/users\' -H \'Authorization: Bearer xxx\'',
                placeholderCookie: '例如：sessionId, token, userId',
                
                hintUrlPattern: '使用 * 作为通配符。当前 URL 已预填。',
                hintCurl: '在此粘贴您的 curl 命令。支持完整语法。',
                hintCookie: '逗号分隔的 cookie 名称，将使用当前页面的 cookie 替换。留空则使用所有页面 cookie。',
                
                statsTotal: '总请求数',
                statsExecutions: '总执行次数',
                statsSuccessRate: '成功率',
                statsTopRequests: '最常用的 5 个',
                statsExecutionCount: '次执行',
                
                notifExecuting: '正在执行请求...',
                notifBatchExecuting: '正在执行 {count} 个请求...',
                notifBatchComplete: '批量完成：{success}/{total} 成功',
                notifAdded: '请求添加成功',
                notifUpdated: '请求更新成功',
                notifError: '错误',
                notifNoRequests: '当前 URL 没有绑定的请求',
                
                errorInvalidCurl: '无效的 curl 命令',
                errorCurlStart: '命令必须以 "curl" 开头',
                errorParseFailed: '解析 curl 命令失败',
                errorNoUrl: '在 curl 命令中未找到 URL',
                errorInvalidUrl: '无效的 URL 格式',
                errorRequestNotFound: '请求未找到',
                errorRequestFailed: '请求失败',
                
                mgmtTitle: '请求重放器 - 管理',
                mgmtColName: '名称',
                mgmtColPattern: 'URL 模式',
                mgmtColMethod: '方法',
                mgmtColCookie: 'Cookie 替换',
                mgmtColStats: '统计',
                mgmtStatsFormat: '{count} 次执行，{success} 次成功，平均 {avg}ms',
                
                timeJustNow: '刚刚',
                timeMinutesAgo: '{n}分钟前',
                timeHoursAgo: '{n}小时前',
                timeDaysAgo: '{n}天前',
                timeLast: '上次',
                
                method: '方法',
                
                mgmtAllRequests: '所有请求',
                mgmtNoRequests: '暂无请求。从菜单添加一个。',
                mgmtActions: '操作',
                mgmtConfirmDelete: '确定要删除这个请求吗？',
                
                timerStart: '启动定时',
                timerStop: '停止定时',
                timerInterval: '间隔（秒）',
                timerRunning: '定时运行中：{name}',
                timerStopped: '定时已停止',
                timerNextRun: '{n}秒后执行',
                
                batchSelect: '选择批量执行',
                batchExecuteSelected: '执行选中 ({n})',
                batchNoneSelected: '未选择任何请求',
                batchSelectAll: '全选',
                
                repeatTimes: '次',
                repeatExecute: '执行 {n} 次',
                repeatRunning: '执行中 {current}/{total}...',
                repeatComplete: '完成 {success}/{total}'
            },
            'zh-CN': 'zh',
            'zh-TW': 'zh',
            'zh-HK': 'zh'
        },

        init() {
            const savedLocale = GM_getValue('rr_locale', 'auto');
            this.locale = savedLocale;
            
            if (this.locale === 'auto') {
                const browserLang = navigator.language || navigator.userLanguage || 'en';
                this.locale = browserLang.startsWith('zh') ? 'zh' : 'en';
            }
        },

        t(key, params = {}) {
            let locale = this.locale;
            
            if (typeof this.translations[locale] === 'string') {
                locale = this.translations[locale];
            }
            
            const translation = this.translations[locale]?.[key] || this.translations['en'][key] || key;
            
            return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        },

        setLocale(locale) {
            this.locale = locale;
            GM_setValue('rr_locale', locale);
            window.location.reload();
        },

        getLocale() {
            return this.locale;
        }
    };

    I18n.init();
    console.log('[RequestRepeater] I18n module loaded, locale:', I18n.getLocale());

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
    // MODULE: CurlParser (Built-in parser, no external dependency)
    // ============================================================================
    
    const CurlParser = {
        parse(curlCommand) {
            try {
                if (!curlCommand || typeof curlCommand !== 'string') {
                    throw new Error(I18n.t('errorInvalidCurl'));
                }

                const trimmed = curlCommand.trim();
                if (!trimmed.toLowerCase().startsWith('curl')) {
                    throw new Error(I18n.t('errorCurlStart'));
                }

                const result = this._parseCurlCommand(trimmed);

                return {
                    success: true,
                    data: {
                        url: result.url || '',
                        method: (result.method || 'GET').toUpperCase(),
                        headers: result.headers || {},
                        body: result.body || null,
                        cookies: this._extractCookies(result.headers)
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message || I18n.t('errorParseFailed')
                };
            }
        },

        _parseCurlCommand(cmd) {
            const result = {
                url: '',
                method: 'GET',
                headers: {},
                body: null
            };

            const normalizedCmd = cmd
                .replace(/\\\r?\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const urlMatch = normalizedCmd.match(/curl\s+(?:['"]([^'"]+)['"]|(\S+))/i);
            if (!urlMatch) {
                const laterUrlMatch = normalizedCmd.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
                if (laterUrlMatch) {
                    result.url = laterUrlMatch[1];
                }
            } else {
                result.url = urlMatch[1] || urlMatch[2];
            }

            const methodMatch = normalizedCmd.match(/-X\s+['"]?(\w+)['"]?/i);
            if (methodMatch) {
                result.method = methodMatch[1].toUpperCase();
            }

            const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
            let headerMatch;
            while ((headerMatch = headerRegex.exec(normalizedCmd)) !== null) {
                const headerStr = headerMatch[1];
                const colonIndex = headerStr.indexOf(':');
                if (colonIndex > 0) {
                    const key = headerStr.substring(0, colonIndex).trim();
                    const value = headerStr.substring(colonIndex + 1).trim();
                    result.headers[key] = value;
                }
            }

            const dataPatterns = [
                /--data-raw\s+['"](.+?)['"]/gi,
                /--data\s+['"](.+?)['"]/gi,
                /-d\s+['"](.+?)['"]/gi,
                /--data-binary\s+['"](.+?)['"]/gi
            ];

            for (const pattern of dataPatterns) {
                const dataMatch = pattern.exec(normalizedCmd);
                if (dataMatch) {
                    result.body = dataMatch[1];
                    if (result.method === 'GET') {
                        result.method = 'POST';
                    }
                    break;
                }
            }

            const formPatterns = [
                /-F\s+['"]([^'"]+)['"]/gi,
                /--form\s+['"]([^'"]+)['"]/gi
            ];

            const formData = [];
            for (const pattern of formPatterns) {
                let formMatch;
                while ((formMatch = pattern.exec(normalizedCmd)) !== null) {
                    formData.push(formMatch[1]);
                }
            }
            if (formData.length > 0) {
                result.body = formData.join('&');
                if (result.method === 'GET') {
                    result.method = 'POST';
                }
                if (!result.headers['Content-Type']) {
                    result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
            }

            if (normalizedCmd.includes('--compressed')) {
                if (!result.headers['Accept-Encoding']) {
                    result.headers['Accept-Encoding'] = 'gzip, deflate, br';
                }
            }

            const userAgentMatch = normalizedCmd.match(/-A\s+['"]([^'"]+)['"]/i);
            if (userAgentMatch) {
                result.headers['User-Agent'] = userAgentMatch[1];
            }

            const userMatch = normalizedCmd.match(/-u\s+['"]?([^'"\s]+)['"]?/i);
            if (userMatch) {
                const credentials = userMatch[1];
                const base64 = btoa(credentials);
                result.headers['Authorization'] = `Basic ${base64}`;
            }

            return result;
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
                return { valid: false, error: I18n.t('errorNoUrl') };
            }

            try {
                new URL(result.data.url);
            } catch (e) {
                return { valid: false, error: I18n.t('errorInvalidUrl') };
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
                    error: I18n.t('errorRequestNotFound')
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
                    error: error.message || I18n.t('errorRequestFailed'),
                    responseTime
                };
            }
        },

        async _prepareFinalHeaders(originalHeaders, curlCookies, cookieReplaceList) {
            const headers = { ...originalHeaders };

            try {
                const currentCookies = await this._getCurrentPageCookies();
                let finalCookies;

                if (cookieReplaceList.length === 0) {
                    finalCookies = currentCookies;
                } else {
                    finalCookies = { ...curlCookies };
                    cookieReplaceList.forEach(cookieName => {
                        if (currentCookies[cookieName]) {
                            finalCookies[cookieName] = currentCookies[cookieName];
                        }
                    });
                }

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
            // Strip query parameters - only match path before '?'
            const urlWithoutQuery = url.split('?')[0];
            const patternWithoutQuery = pattern.split('?')[0];
            
            const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const patternRegex = new RegExp(
                '^' + escapeRegex(patternWithoutQuery).replace(/\\\*/g, '.*') + '$'
            );
            return patternRegex.test(urlWithoutQuery);
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
            GM_registerMenuCommand(I18n.t('menuExecute'), () => this.showExecuteDialog());
            GM_registerMenuCommand(I18n.t('menuAdd'), () => this.showAddDialog());
            GM_registerMenuCommand(I18n.t('menuManage'), () => this.openManagementPage());
            GM_registerMenuCommand(I18n.t('menuStats'), () => this.showStatistics());
            GM_registerMenuCommand(I18n.t('menuLanguage') + ': ' + (I18n.getLocale() === 'zh' ? '中文' : 'English'), () => {
                const newLocale = I18n.getLocale() === 'zh' ? 'en' : 'zh';
                I18n.setLocale(newLocale);
            });
        },

        showExecuteDialog() {
            const requests = RequestManager.getRequestsForCurrentUrl();

            this._closeFloatingPanel();

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
                    <div class="rr-floating-url">${this._shortenUrl(window.location.href)}</div>
                    ${requests.length === 0 ? `
                        <div class="rr-floating-empty">${I18n.t('notifNoRequests')}</div>
                    ` : `
                        <div class="rr-floating-list">
                            ${requests.map(req => `
                                <div class="rr-floating-item" data-id="${req.id}">
                                    <div class="rr-floating-item-info">
                                        <div class="rr-floating-item-name">${this._escapeHtml(req.name)}</div>
                                        <div class="rr-floating-item-meta">
                                            <code>${req.parsedRequest?.method || 'GET'}</code>
                                            ${req.lastExecuted ? `<span>${this._formatTime(req.lastExecuted)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="rr-floating-item-actions">
                                        <div class="rr-action-row">
                                            <div class="rr-repeat-control">
                                                <input type="number" class="rr-repeat-input" value="1" min="1" max="100" title="${I18n.t('repeatTimes')}">
                                                <button class="rr-btn-mini rr-btn-repeat" data-id="${req.id}">▶</button>
                                            </div>
                                            <div class="rr-timer-control">
                                                <input type="number" class="rr-timer-interval" value="60" min="5" max="3600" title="${I18n.t('timerInterval')}">
                                                <button class="rr-btn-mini rr-btn-timer-toggle ${this._activeTimers[req.id] ? 'rr-timer-running' : ''}" data-id="${req.id}">
                                                    ${this._activeTimers[req.id] ? '⏹' : '⏱'}
                                                </button>
                                            </div>
                                            <button class="rr-btn-mini rr-btn-edit-mini" data-id="${req.id}">✎</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;

            document.body.appendChild(panel);

            this._makeDraggable(panel);

            panel.querySelector('.rr-floating-close').addEventListener('click', () => {
                this._closeFloatingPanel();
            });

            panel.querySelector('.rr-floating-minimize').addEventListener('click', () => {
                panel.classList.toggle('rr-floating-minimized');
            });

            panel.querySelector('.rr-floating-add').addEventListener('click', () => {
                this.showAddDialog();
            });

            panel.querySelectorAll('.rr-btn-repeat').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const input = btn.closest('.rr-floating-item').querySelector('.rr-repeat-input');
                    const times = parseInt(input.value) || 1;
                    this._handleRepeatExecute(id, times, btn);
                });
            });

            panel.querySelectorAll('.rr-btn-timer-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const input = btn.closest('.rr-floating-item').querySelector('.rr-timer-interval');
                    const interval = parseInt(input.value) || 60;
                    this._handleTimerToggle(id, interval, btn);
                });
            });

            panel.querySelectorAll('.rr-btn-edit-mini').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.showAddDialog(btn.dataset.id);
                });
            });
        },

        _activeTimers: {},

        _handleTimerToggle(requestId, interval, btn) {
            if (this._activeTimers[requestId]) {
                clearInterval(this._activeTimers[requestId]);
                delete this._activeTimers[requestId];
                btn.textContent = '⏱';
                btn.classList.remove('rr-timer-running');
                this.showNotification(I18n.t('timerStopped'), 'info');
            } else {
                const request = StorageAdapter.getRequest(requestId);
                
                this._handleExecute(requestId);
                
                this._activeTimers[requestId] = setInterval(() => {
                    this._handleExecute(requestId);
                }, interval * 1000);

                btn.textContent = '⏹';
                btn.classList.add('rr-timer-running');
                this.showNotification(I18n.t('timerRunning', {name: request?.name || 'Request'}), 'success');
            }
        },

        _closeFloatingPanel() {
            document.querySelectorAll('.rr-floating-panel').forEach(el => el.remove());
        },

        _refreshFloatingPanel() {
            if (document.querySelector('.rr-floating-panel')) {
                this.showExecuteDialog();
            }
        },

        _makeDraggable(element) {
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
        },

        async _handleRepeatExecute(requestId, times, btn) {
            const originalText = btn.textContent;
            btn.disabled = true;
            
            let successCount = 0;
            for (let i = 0; i < times; i++) {
                btn.textContent = `${i + 1}/${times}`;
                const result = await RequestExecutor.execute(requestId);
                if (result.success) successCount++;
                
                if (i < times - 1) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            btn.disabled = false;
            btn.textContent = originalText;
            
            this.showNotification(
                I18n.t('repeatComplete', {success: successCount, total: times}),
                successCount === times ? 'success' : 'warning'
            );
        },

        showAddDialog(editId = null) {
            const isEdit = !!editId;
            const request = isEdit ? StorageAdapter.getRequest(editId) : null;

            const dialogHTML = `
                <div class="rr-dialog-overlay">
                    <div class="rr-dialog rr-dialog-large">
                        <div class="rr-dialog-header">
                            <h3>${isEdit ? I18n.t('dialogEditTitle') : I18n.t('dialogAddTitle')}</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <form class="rr-form" id="rr-request-form">
                                <div class="rr-form-group">
                                    <label>${I18n.t('labelName')} *</label>
                                    <input type="text" name="name" class="rr-input" placeholder="${I18n.t('placeholderName')}" 
                                           value="${isEdit ? this._escapeHtml(request.name) : ''}" required>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>${I18n.t('labelUrlPattern')} *</label>
                                    <input type="text" name="urlPattern" class="rr-input" 
                                           placeholder="${I18n.t('placeholderUrlPattern')}" 
                                           value="${isEdit ? this._escapeHtml(request.urlPattern) : window.location.href}" required>
                                    <small>${I18n.t('hintUrlPattern')}</small>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>${I18n.t('labelCurl')} *</label>
                                    <textarea name="curl" class="rr-textarea" rows="12" 
                                              placeholder="${I18n.t('placeholderCurl')}" 
                                              required>${isEdit ? this._escapeHtml(request.curl) : ''}</textarea>
                                    <small>${I18n.t('hintCurl')}</small>
                                </div>
                                
                                <div class="rr-form-group">
                                    <label>${I18n.t('labelCookieReplace')}</label>
                                    <input type="text" name="cookieReplace" class="rr-input" 
                                           placeholder="${I18n.t('placeholderCookie')}" 
                                           value="${isEdit ? request.cookieReplace.join(', ') : ''}">
                                    <small>${I18n.t('hintCookie')}</small>
                                </div>
                                
                                <div class="rr-form-actions">
                                    <button type="button" class="rr-btn rr-btn-secondary rr-cancel-btn">${I18n.t('btnCancel')}</button>
                                    <button type="submit" class="rr-btn rr-btn-primary">${isEdit ? I18n.t('btnUpdate') : I18n.t('btnAdd')}</button>
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
                            <h3>${I18n.t('dialogStatsTitle')}</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <div class="rr-stats-grid">
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalRequests}</div>
                                    <div class="rr-stat-label">${I18n.t('statsTotal')}</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalExecutions}</div>
                                    <div class="rr-stat-label">${I18n.t('statsExecutions')}</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.successRate}%</div>
                                    <div class="rr-stat-label">${I18n.t('statsSuccessRate')}</div>
                                </div>
                            </div>
                            
                            ${topRequests.length > 0 ? `
                                <h4 style="margin-top: 20px; margin-bottom: 10px;">${I18n.t('statsTopRequests')}</h4>
                                <div class="rr-top-requests">
                                    ${topRequests.map(req => `
                                        <div class="rr-top-request-item">
                                            <strong>${this._escapeHtml(req.name)}</strong>
                                            <span>${req.statistics?.executionCount || 0} ${I18n.t('statsExecutionCount')}</span>
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
            const allRequests = RequestManager.getAllRequests();
            const stats = RequestManager.getStatistics();
            
            const dialogHTML = `
                <div class="rr-dialog-overlay">
                    <div class="rr-dialog rr-dialog-fullscreen">
                        <div class="rr-dialog-header">
                            <h3>${I18n.t('mgmtTitle')}</h3>
                            <button class="rr-close-btn">&times;</button>
                        </div>
                        <div class="rr-dialog-body">
                            <div class="rr-mgmt-actions">
                                <button class="rr-btn rr-btn-primary rr-export-btn">📥 ${I18n.t('btnExport')}</button>
                                <button class="rr-btn rr-btn-secondary rr-import-btn">📤 ${I18n.t('btnImport')}</button>
                                <input type="file" id="rr-import-file" accept=".json" style="display:none">
                            </div>
                            
                            <div class="rr-stats-grid" style="margin-bottom: 20px;">
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalRequests}</div>
                                    <div class="rr-stat-label">${I18n.t('statsTotal')}</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.totalExecutions}</div>
                                    <div class="rr-stat-label">${I18n.t('statsExecutions')}</div>
                                </div>
                                <div class="rr-stat-card">
                                    <div class="rr-stat-value">${stats.successRate}%</div>
                                    <div class="rr-stat-label">${I18n.t('statsSuccessRate')}</div>
                                </div>
                            </div>
                            
                            <h4 style="margin-bottom: 15px;">${I18n.t('mgmtAllRequests')}</h4>
                            
                            ${allRequests.length === 0 ? `
                                <div class="rr-empty-state">${I18n.t('mgmtNoRequests')}</div>
                            ` : `
                                <div class="rr-batch-actions" style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                                    <button class="rr-btn rr-btn-primary rr-batch-exec-btn" disabled>
                                        ${I18n.t('batchExecuteSelected', {n: 0})}
                                    </button>
                                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                                        <input type="checkbox" class="rr-select-all-cb">
                                        <span style="font-size: 14px;">${I18n.t('batchSelectAll')}</span>
                                    </label>
                                </div>
                                <div class="rr-request-table">
                                    ${allRequests.map(req => `
                                        <div class="rr-mgmt-item" data-id="${req.id}">
                                            <div class="rr-mgmt-checkbox">
                                                <input type="checkbox" class="rr-item-cb" data-id="${req.id}">
                                            </div>
                                            <div class="rr-mgmt-info">
                                                <div class="rr-mgmt-name">${this._escapeHtml(req.name)}</div>
                                                <div class="rr-mgmt-details">
                                                    <code>${req.parsedRequest?.method || 'GET'}</code>
                                                    <span class="rr-mgmt-pattern">${this._escapeHtml(req.urlPattern)}</span>
                                                </div>
                                                <div class="rr-mgmt-stats">
                                                    ${req.statistics?.executionCount || 0} ${I18n.t('statsExecutionCount')} · 
                                                    ${req.statistics?.avgResponseTime || 0}ms avg
                                                </div>
                                            </div>
                                            <div class="rr-mgmt-timer">
                                                <div class="rr-timer-controls">
                                                    <input type="number" class="rr-timer-input" placeholder="60" min="5" max="3600" value="${req.timerInterval || 60}">
                                                    <span style="font-size: 12px; color: #6b7280;">s</span>
                                                </div>
                                                <button class="rr-btn rr-btn-timer ${req.id === this._activeTimerId ? 'rr-timer-active' : ''}" data-id="${req.id}">
                                                    ${req.id === this._activeTimerId ? I18n.t('timerStop') : I18n.t('timerStart')}
                                                </button>
                                            </div>
                                            <div class="rr-mgmt-actions-col">
                                                <button class="rr-btn rr-btn-primary rr-mgmt-exec-btn" data-id="${req.id}">${I18n.t('btnExecute')}</button>
                                                <button class="rr-btn rr-btn-secondary rr-mgmt-edit-btn" data-id="${req.id}">${I18n.t('btnEdit')}</button>
                                                <button class="rr-btn rr-btn-danger rr-mgmt-delete-btn" data-id="${req.id}">${I18n.t('btnDelete')}</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;

            this._showDialog(dialogHTML, {
                '.rr-export-btn': () => this._handleExport(),
                '.rr-import-btn': () => document.getElementById('rr-import-file').click(),
                '.rr-mgmt-exec-btn': (btn) => this._handleExecute(btn.dataset.id),
                '.rr-mgmt-edit-btn': (btn) => {
                    this._closeCurrentDialog();
                    this.showAddDialog(btn.dataset.id);
                },
                '.rr-mgmt-delete-btn': (btn) => this._handleDelete(btn.dataset.id),
                '.rr-btn-timer': (btn) => this._handleTimer(btn.dataset.id, btn),
                '.rr-batch-exec-btn': () => this._handleBatchFromManagement()
            });

            const importInput = document.getElementById('rr-import-file');
            if (importInput) {
                importInput.addEventListener('change', (e) => this._handleImport(e));
            }

            this._setupBatchSelection();
        },

        _setupBatchSelection() {
            const selectAllCb = document.querySelector('.rr-select-all-cb');
            const itemCbs = document.querySelectorAll('.rr-item-cb');
            const batchBtn = document.querySelector('.rr-batch-exec-btn');

            const updateBatchBtn = () => {
                const selected = document.querySelectorAll('.rr-item-cb:checked').length;
                if (batchBtn) {
                    batchBtn.textContent = I18n.t('batchExecuteSelected', {n: selected});
                    batchBtn.disabled = selected === 0;
                }
            };

            if (selectAllCb) {
                selectAllCb.addEventListener('change', () => {
                    itemCbs.forEach(cb => cb.checked = selectAllCb.checked);
                    updateBatchBtn();
                });
            }

            itemCbs.forEach(cb => {
                cb.addEventListener('change', updateBatchBtn);
            });
        },

        async _handleBatchFromManagement() {
            const selectedIds = Array.from(document.querySelectorAll('.rr-item-cb:checked'))
                .map(cb => cb.dataset.id);
            
            if (selectedIds.length === 0) {
                this.showNotification(I18n.t('batchNoneSelected'), 'warning');
                return;
            }

            await this._handleBatchExecute(selectedIds);
        },

        _activeTimerId: null,
        _timerHandle: null,

        _handleTimer(requestId, btn) {
            const item = btn.closest('.rr-mgmt-item');
            const intervalInput = item.querySelector('.rr-timer-input');
            const interval = parseInt(intervalInput.value) || 60;

            if (this._activeTimerId === requestId) {
                clearInterval(this._timerHandle);
                this._activeTimerId = null;
                this._timerHandle = null;
                btn.textContent = I18n.t('timerStart');
                btn.classList.remove('rr-timer-active');
                this.showNotification(I18n.t('timerStopped'), 'info');
            } else {
                if (this._timerHandle) {
                    clearInterval(this._timerHandle);
                    document.querySelectorAll('.rr-btn-timer').forEach(b => {
                        b.textContent = I18n.t('timerStart');
                        b.classList.remove('rr-timer-active');
                    });
                }

                this._activeTimerId = requestId;
                const request = StorageAdapter.getRequest(requestId);
                
                this._handleExecute(requestId);
                
                this._timerHandle = setInterval(() => {
                    this._handleExecute(requestId);
                }, interval * 1000);

                btn.textContent = I18n.t('timerStop');
                btn.classList.add('rr-timer-active');
                this.showNotification(I18n.t('timerRunning', {name: request?.name || 'Request'}), 'success');
            }
        },

        _handleExport() {
            const data = StorageAdapter.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'request-repeater-backup-' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Exported successfully', 'success');
        },

        _handleImport(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    StorageAdapter.importAll(data);
                    this.showNotification('Imported successfully', 'success');
                    this._closeCurrentDialog();
                    this.openManagementPage();
                } catch (err) {
                    this.showNotification('Invalid JSON file', 'error');
                }
            };
            reader.readAsText(file);
        },

        _handleDelete(requestId) {
            if (confirm(I18n.t('mgmtConfirmDelete'))) {
                RequestManager.deleteRequest(requestId);
                this._closeCurrentDialog();
                this.openManagementPage();
            }
        },

        async _handleExecute(requestId) {
            this.showNotification(I18n.t('notifExecuting'), 'info');
            
            const result = await RequestExecutor.execute(requestId);
            
            if (result.success) {
                this.showNotification(
                    `✓ ${result.statusCode} - ${result.responseTime}ms`,
                    'success'
                );
            } else {
                this.showNotification(
                    `✗ ${I18n.t('notifError')}: ${result.error}`,
                    'error'
                );
            }
        },

        async _handleBatchExecute(requestIds) {
            this.showNotification(I18n.t('notifBatchExecuting', {count: requestIds.length}), 'info');
            
            const results = await RequestExecutor.executeBatch(requestIds);
            const successCount = results.filter(r => r.success).length;
            
            this.showNotification(
                I18n.t('notifBatchComplete', {success: successCount, total: requestIds.length}),
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
                        editId ? I18n.t('notifUpdated') : I18n.t('notifAdded'),
                        'success'
                    );
                    this._closeCurrentDialog();
                    this._refreshFloatingPanel();
                } else {
                    this.showNotification(`${I18n.t('notifError')}: ${result.error}`, 'error');
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
                
                .rr-dialog-fullscreen {
                    max-width: 900px;
                    width: 95%;
                    max-height: 90vh;
                }
                
                .rr-mgmt-actions {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                
                .rr-mgmt-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    transition: all 0.2s;
                }
                
                .rr-mgmt-item:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
                }
                
                .rr-mgmt-checkbox {
                    flex-shrink: 0;
                }
                
                .rr-mgmt-checkbox input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .rr-mgmt-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .rr-mgmt-name {
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 4px;
                }
                
                .rr-mgmt-details {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                
                .rr-mgmt-details code {
                    background: #dbeafe;
                    color: #1e40af;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .rr-mgmt-pattern {
                    font-size: 12px;
                    color: #6b7280;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 300px;
                }
                
                .rr-mgmt-stats {
                    font-size: 12px;
                    color: #9ca3af;
                }
                
                .rr-mgmt-timer {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .rr-timer-controls {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .rr-timer-input {
                    width: 60px;
                    padding: 6px 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 13px;
                    text-align: center;
                }
                
                .rr-btn-timer {
                    padding: 6px 12px;
                    font-size: 12px;
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }
                
                .rr-btn-timer:hover {
                    background: #e5e7eb;
                }
                
                .rr-timer-active {
                    background: #fef3c7 !important;
                    border-color: #f59e0b !important;
                    color: #92400e !important;
                }
                
                .rr-mgmt-actions-col {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .rr-btn-danger {
                    background: #fee2e2;
                    color: #991b1b;
                }
                
                .rr-btn-danger:hover {
                    background: #fecaca;
                }
                
                .rr-empty-state {
                    text-align: center;
                    padding: 40px;
                    color: #6b7280;
                    font-size: 14px;
                }
                
                .rr-request-table {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .rr-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                    box-shadow: none !important;
                }
                
                .rr-floating-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 420px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    z-index: 999998;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                }
                
                .rr-floating-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    cursor: move;
                    user-select: none;
                }
                
                .rr-floating-title {
                    font-weight: 600;
                    font-size: 14px;
                }
                
                .rr-floating-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .rr-floating-controls button {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .rr-floating-controls button:hover {
                    background: rgba(255,255,255,0.3);
                }
                
                .rr-floating-body {
                    padding: 12px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .rr-floating-minimized .rr-floating-body {
                    display: none;
                }
                
                .rr-floating-url {
                    font-size: 11px;
                    color: #6b7280;
                    padding: 8px;
                    background: #f3f4f6;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    word-break: break-all;
                }
                
                .rr-floating-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .rr-floating-item {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 12px 14px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    transition: all 0.2s;
                }
                
                .rr-floating-item:hover {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
                
                .rr-floating-item-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .rr-floating-item-name {
                    font-weight: 500;
                    font-size: 13px;
                    color: #111827;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .rr-floating-item-meta {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 4px;
                }
                
                .rr-floating-item-meta code {
                    background: #dbeafe;
                    color: #1e40af;
                    padding: 1px 5px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: 600;
                }
                
                .rr-floating-item-meta span {
                    font-size: 10px;
                    color: #9ca3af;
                }
                
                .rr-floating-item-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .rr-action-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .rr-floating-empty {
                    text-align: center;
                    padding: 24px;
                    color: #6b7280;
                    font-size: 14px;
                }
                
                .rr-floating-add {
                    font-weight: bold;
                    font-size: 18px !important;
                }
                
                .rr-repeat-control {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .rr-repeat-input {
                    width: 36px;
                    padding: 4px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 12px;
                    text-align: center;
                }
                
                .rr-repeat-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                
                .rr-btn-mini {
                    padding: 6px 10px;
                    border: none;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .rr-btn-repeat {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }
                
                .rr-btn-repeat:hover {
                    transform: scale(1.05);
                }
                
                .rr-btn-repeat:disabled {
                    opacity: 0.7;
                    transform: none;
                }
                
                .rr-btn-edit-mini {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .rr-btn-edit-mini:hover {
                    background: #e5e7eb;
                }
                
                .rr-timer-control {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .rr-timer-interval {
                    width: 42px;
                    padding: 4px 6px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 11px;
                    text-align: center;
                }
                
                .rr-timer-interval:focus {
                    outline: none;
                    border-color: #3b82f6;
                }
                
                .rr-btn-timer-toggle {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .rr-btn-timer-toggle:hover {
                    background: #e5e7eb;
                }
                
                .rr-btn-timer-toggle.rr-timer-running {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    animation: rr-pulse 2s infinite;
                }
                
                @keyframes rr-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
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
            
            if (diff < 60000) return I18n.t('timeJustNow');
            if (diff < 3600000) return I18n.t('timeMinutesAgo', {n: Math.floor(diff / 60000)});
            if (diff < 86400000) return I18n.t('timeHoursAgo', {n: Math.floor(diff / 3600000)});
            return I18n.t('timeDaysAgo', {n: Math.floor(diff / 86400000)});
        },

        _generateManagementPageHTML(data) {
            const locale = I18n.getLocale();
            const isZh = locale === 'zh';
            
            return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${I18n.t('mgmtTitle')}</title>
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
        <h1>🔄 ${I18n.t('mgmtTitle')}</h1>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="exportData()">📥 ${I18n.t('btnExport')}</button>
            <button class="btn btn-primary" onclick="importData()">📤 ${I18n.t('btnImport')}</button>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${data.requests.length}</div>
                <div class="stat-label">${I18n.t('statsTotal')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.requests.reduce((s, r) => s + (r.statistics?.executionCount || 0), 0)}</div>
                <div class="stat-label">${I18n.t('statsExecutions')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(() => {
                    const total = data.requests.reduce((s, r) => s + (r.statistics?.executionCount || 0), 0);
                    const success = data.requests.reduce((s, r) => s + (r.statistics?.successCount || 0), 0);
                    return total > 0 ? ((success / total) * 100).toFixed(1) : 0;
                })()}%</div>
                <div class="stat-label">${I18n.t('statsSuccessRate')}</div>
            </div>
        </div>
        
        <div class="request-table">
            <table>
                <thead>
                    <tr>
                        <th>${I18n.t('mgmtColName')}</th>
                        <th>${I18n.t('mgmtColPattern')}</th>
                        <th>${I18n.t('mgmtColMethod')}</th>
                        <th>${I18n.t('mgmtColCookie')}</th>
                        <th>${I18n.t('mgmtColStats')}</th>
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
                                ${isZh 
                                    ? `${req.statistics?.executionCount || 0} 次执行，${req.statistics?.successCount || 0} 次成功，平均 ${req.statistics?.avgResponseTime || 0}ms`
                                    : `${req.statistics?.executionCount || 0} execs, ${req.statistics?.successCount || 0} success, ${req.statistics?.avgResponseTime || 0}ms avg`
                                }
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
                        alert(${isZh ? "'数据已加载。请复制此 JSON 并使用 GM_setValue 手动导入。'" : "'Data loaded. Please copy this JSON and use GM_setValue to import manually.'"});
                        console.log('Import data:', imported);
                    } catch (err) {
                        alert(${isZh ? "'无效的 JSON 文件'" : "'Invalid JSON file'"});
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

    console.log(`[RequestRepeater] Initialized in ${(performance.now() - _startTime).toFixed(2)}ms`);

})();
