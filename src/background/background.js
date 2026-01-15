const ErrorMessages = {
    en: {
        requestNotFound: 'Request not found',
        requestFailed: 'Request failed',
        unnamedRequest: 'Unnamed Request',
        failedToSave: 'Failed to save request',
        failedToUpdate: 'Failed to update request',
        failedToDelete: 'Failed to delete request'
    },
    zh: {
        requestNotFound: '请求未找到',
        requestFailed: '请求失败',
        unnamedRequest: '未命名请求',
        failedToSave: '保存请求失败',
        failedToUpdate: '更新请求失败',
        failedToDelete: '删除请求失败'
    }
};

function getLocale() {
    return (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) ? 'zh' : 'en';
}

function t(key) {
    const locale = getLocale();
    return ErrorMessages[locale]?.[key] || ErrorMessages['en'][key] || key;
}

const activeTimers = {};
const activeCrons = {};

const CronParser = {
    parse(expression) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) return null;
        
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
        return { minute, hour, dayOfMonth, month, dayOfWeek };
    },
    
    getNextRun(expression) {
        const cron = this.parse(expression);
        if (!cron) return null;
        
        const now = new Date();
        const next = new Date(now);
        next.setSeconds(0);
        next.setMilliseconds(0);
        
        for (let i = 0; i < 525600; i++) {
            next.setMinutes(next.getMinutes() + 1);
            if (this._matches(next, cron)) {
                return next.getTime();
            }
        }
        return null;
    },
    
    _matches(date, cron) {
        return this._matchField(date.getMinutes(), cron.minute, 0, 59) &&
               this._matchField(date.getHours(), cron.hour, 0, 23) &&
               this._matchField(date.getDate(), cron.dayOfMonth, 1, 31) &&
               this._matchField(date.getMonth() + 1, cron.month, 1, 12) &&
               this._matchField(date.getDay(), cron.dayOfWeek, 0, 6);
    },
    
    _matchField(value, field, min, max) {
        if (field === '*') return true;
        
        if (field.includes('/')) {
            const [range, step] = field.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return value % stepNum === 0;
            }
        }
        
        if (field.includes(',')) {
            return field.split(',').map(Number).includes(value);
        }
        
        if (field.includes('-')) {
            const [start, end] = field.split('-').map(Number);
            return value >= start && value <= end;
        }
        
        return parseInt(field) === value;
    }
};

const TimerManager = {
    async init() {
        const savedTimers = await StorageAdapter.getTimers();
        for (const [requestId, timerData] of Object.entries(savedTimers)) {
            const request = await StorageAdapter.getRequest(requestId);
            if (request) {
                this.start(requestId, timerData.interval, true);
            }
        }
        console.log('[TimerManager] Restored timers:', Object.keys(savedTimers).length);
    },

    start(requestId, interval, isRestore = false) {
        this.stop(requestId, true);
        
        if (!isRestore) {
            RequestExecutor.execute(requestId);
        }
        
        activeTimers[requestId] = {
            intervalId: setInterval(() => {
                RequestExecutor.execute(requestId);
            }, interval * 1000),
            interval
        };
        
        this._persistTimers();
        this._notifyAll();
        return true;
    },
    
    stop(requestId, skipPersist = false) {
        if (activeTimers[requestId]) {
            clearInterval(activeTimers[requestId].intervalId);
            delete activeTimers[requestId];
            if (!skipPersist) {
                this._persistTimers();
            }
            this._notifyAll();
            return true;
        }
        return false;
    },
    
    isRunning(requestId) {
        return !!activeTimers[requestId];
    },
    
    getAll() {
        const result = {};
        for (const [id, timer] of Object.entries(activeTimers)) {
            result[id] = { interval: timer.interval };
        }
        return result;
    },

    async _persistTimers() {
        const timersToSave = {};
        for (const [id, timer] of Object.entries(activeTimers)) {
            timersToSave[id] = { interval: timer.interval };
        }
        await StorageAdapter.saveTimers(timersToSave);
    },
    
    _notifyAll() {
        const timers = this.getAll();
        browser.runtime.sendMessage({ type: 'TIMERS_UPDATED', timers }).catch(() => {});
        browser.tabs.query({}).then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, { type: 'TIMERS_UPDATED', timers }).catch(() => {});
            });
        });
    }
};

const CronManager = {
    async init() {
        const savedCrons = await StorageAdapter.getCrons();
        for (const [requestId, cronData] of Object.entries(savedCrons)) {
            const request = await StorageAdapter.getRequest(requestId);
            if (request) {
                this.start(requestId, cronData.expression, true);
            }
        }
        console.log('[CronManager] Restored crons:', Object.keys(savedCrons).length);
    },

    start(requestId, expression, isRestore = false) {
        this.stop(requestId, true);
        
        const nextRun = CronParser.getNextRun(expression);
        if (!nextRun) {
            console.error('[CronManager] Invalid cron expression:', expression);
            return false;
        }
        
        const scheduleNext = () => {
            const now = Date.now();
            const nextRunTime = CronParser.getNextRun(expression);
            if (!nextRunTime) return;
            
            const delay = nextRunTime - now;
            if (delay < 0) return;
            
            activeCrons[requestId].timeoutId = setTimeout(async () => {
                await RequestExecutor.execute(requestId);
                scheduleNext();
            }, delay);
            
            activeCrons[requestId].nextRun = nextRunTime;
        };
        
        activeCrons[requestId] = {
            expression,
            nextRun,
            timeoutId: null
        };
        
        scheduleNext();
        
        this._persistCrons();
        this._notifyAll();
        return true;
    },
    
    stop(requestId, skipPersist = false) {
        if (activeCrons[requestId]) {
            if (activeCrons[requestId].timeoutId) {
                clearTimeout(activeCrons[requestId].timeoutId);
            }
            delete activeCrons[requestId];
            if (!skipPersist) {
                this._persistCrons();
            }
            this._notifyAll();
            return true;
        }
        return false;
    },
    
    isRunning(requestId) {
        return !!activeCrons[requestId];
    },
    
    getAll() {
        const result = {};
        for (const [id, cron] of Object.entries(activeCrons)) {
            result[id] = { 
                expression: cron.expression,
                nextRun: cron.nextRun
            };
        }
        return result;
    },

    async _persistCrons() {
        const cronsToSave = {};
        for (const [id, cron] of Object.entries(activeCrons)) {
            cronsToSave[id] = { expression: cron.expression };
        }
        await StorageAdapter.saveCrons(cronsToSave);
    },
    
    _notifyAll() {
        const crons = this.getAll();
        browser.runtime.sendMessage({ type: 'CRONS_UPDATED', crons }).catch(() => {});
        browser.tabs.query({}).then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, { type: 'CRONS_UPDATED', crons }).catch(() => {});
            });
        });
    }
};

const RequestExecutor = {
    async execute(requestId, chainDepth = 0) {
        const MAX_CHAIN_DEPTH = 10;
        if (chainDepth > MAX_CHAIN_DEPTH) {
            console.warn('[RequestExecutor] Chain depth exceeded limit:', MAX_CHAIN_DEPTH);
            return { success: false, error: 'Chain depth exceeded limit' };
        }

        const request = await StorageAdapter.getRequest(requestId);
        if (!request) {
            return {
                success: false,
                error: t('requestNotFound')
            };
        }

        const startTime = Date.now();

        try {
            const parsedRequest = request.parsedRequest;
            const finalHeaders = await this._prepareFinalHeaders(
                parsedRequest.url,
                parsedRequest.headers,
                parsedRequest.cookies,
                request.cookieReplace || []
            );

            const response = await this._sendRequest({
                url: parsedRequest.url,
                method: parsedRequest.method,
                headers: finalHeaders,
                body: parsedRequest.body
            });

            const responseTime = Date.now() - startTime;
            const success = response.status >= 200 && response.status < 300;

            await this._updateStatistics(requestId, success, responseTime);

            await StorageAdapter.addHistory({
                requestId,
                requestName: request.name,
                success: true,
                statusCode: response.status,
                statusText: response.statusText,
                responseTime,
                url: parsedRequest.url,
                method: parsedRequest.method
            });

            const result = {
                success: true,
                statusCode: response.status,
                statusText: response.statusText,
                responseTime,
                responseBody: response.body,
                headers: response.headers
            };

            if (success && request.chainNextId) {
                console.log('[RequestExecutor] Executing chain next:', request.chainNextId);
                const chainResult = await this.execute(request.chainNextId, chainDepth + 1);
                result.chainResult = chainResult;
            }

            return result;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            await this._updateStatistics(requestId, false, responseTime);

            await StorageAdapter.addHistory({
                requestId,
                requestName: request.name,
                success: false,
                error: error.message || t('requestFailed'),
                responseTime,
                url: request.parsedRequest?.url,
                method: request.parsedRequest?.method
            });

            return {
                success: false,
                error: error.message || t('requestFailed'),
                responseTime
            };
        }
    },

    async _prepareFinalHeaders(url, originalHeaders, curlCookies, cookieReplaceList) {
        const headers = { ...originalHeaders };

        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            const browserCookies = await browser.cookies.getAll({ domain });
            
            const currentCookies = {};
            browserCookies.forEach(c => {
                currentCookies[c.name] = c.value;
            });

            console.log(`[RequestExecutor] Got ${browserCookies.length} cookies for ${domain} (including HttpOnly)`);

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

    async _sendRequest(config) {
        console.log('[RequestExecutor] Sending:', config.method, config.url);

        const fetchOptions = {
            method: config.method,
            headers: config.headers,
            credentials: 'include'
        };

        if (config.body && config.method !== 'GET' && config.method !== 'HEAD') {
            fetchOptions.body = config.body;
        }

        const response = await fetch(config.url, fetchOptions);
        
        const body = await response.text();
        
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        console.log('[RequestExecutor] Response:', response.status, response.statusText);

        return {
            status: response.status,
            statusText: response.statusText,
            body,
            headers
        };
    },

    async _updateStatistics(requestId, success, responseTime) {
        const request = await StorageAdapter.getRequest(requestId);
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

        await StorageAdapter.updateRequest(requestId, {
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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_REQUEST') {
        RequestExecutor.execute(message.requestId).then(sendResponse);
        return true;
    }
    
    if (message.type === 'EXECUTE_BATCH') {
        RequestExecutor.executeBatch(message.requestIds).then(sendResponse);
        return true;
    }

    if (message.type === 'TIMER_START') {
        const success = TimerManager.start(message.requestId, message.interval);
        sendResponse({ success });
        return false;
    }

    if (message.type === 'TIMER_STOP') {
        const success = TimerManager.stop(message.requestId);
        sendResponse({ success });
        return false;
    }

    if (message.type === 'TIMER_GET_ALL') {
        sendResponse(TimerManager.getAll());
        return false;
    }

    if (message.type === 'CRON_START') {
        const success = CronManager.start(message.requestId, message.expression);
        sendResponse({ success });
        return false;
    }

    if (message.type === 'CRON_STOP') {
        const success = CronManager.stop(message.requestId);
        sendResponse({ success });
        return false;
    }

    if (message.type === 'CRON_GET_ALL') {
        sendResponse(CronManager.getAll());
        return false;
    }

    if (message.type === 'GET_HISTORY') {
        StorageAdapter.getHistory(message.requestId, message.limit).then(sendResponse);
        return true;
    }

    if (message.type === 'CLEAR_HISTORY') {
        StorageAdapter.clearHistory(message.requestId).then(success => {
            sendResponse({ success });
        });
        return true;
    }

    if (message.type === 'GET_REQUESTS_FOR_URL') {
        (async () => {
            const allRequests = await StorageAdapter.getAllRequests();
            const matched = allRequests.filter(req => {
                const urlWithoutQuery = message.url.split('?')[0];
                const patternWithoutQuery = req.urlPattern.split('?')[0];
                const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const patternRegex = new RegExp(
                    '^' + escapeRegex(patternWithoutQuery).replace(/\\\*/g, '.*') + '$'
                );
                return patternRegex.test(urlWithoutQuery);
            });
            sendResponse(matched.sort((a, b) => (b.lastExecuted || 0) - (a.lastExecuted || 0)));
        })();
        return true;
    }

    if (message.type === 'GET_ALL_REQUESTS') {
        StorageAdapter.getAllRequests().then(sendResponse);
        return true;
    }

    if (message.type === 'CREATE_REQUEST') {
        (async () => {
            const parseResult = CurlParser.validate(message.data.curl);
            if (!parseResult.valid) {
                sendResponse({ success: false, error: parseResult.error });
                return;
            }
            const request = {
                name: message.data.name || t('unnamedRequest'),
                urlPattern: message.data.urlPattern,
                curl: message.data.curl,
                parsedRequest: parseResult.data,
                cookieReplace: message.data.cookieReplace || []
            };
            const success = await StorageAdapter.addRequest(request);
            sendResponse({ success, error: success ? null : t('failedToSave') });
        })();
        return true;
    }

    if (message.type === 'UPDATE_REQUEST') {
        (async () => {
            const updates = { ...message.data };
            if (message.data.curl) {
                const parseResult = CurlParser.validate(message.data.curl);
                if (!parseResult.valid) {
                    sendResponse({ success: false, error: parseResult.error });
                    return;
                }
                updates.parsedRequest = parseResult.data;
            }
            const success = await StorageAdapter.updateRequest(message.id, updates);
            sendResponse({ success, error: success ? null : t('failedToUpdate') });
        })();
        return true;
    }

    if (message.type === 'DELETE_REQUEST') {
        TimerManager.stop(message.id);
        CronManager.stop(message.id);
        StorageAdapter.deleteRequest(message.id).then(success => {
            sendResponse({ success, error: success ? null : t('failedToDelete') });
        });
        return true;
    }

    if (message.type === 'GET_STATISTICS') {
        (async () => {
            const requests = await StorageAdapter.getAllRequests();
            const totalExecutions = requests.reduce(
                (sum, r) => sum + (r.statistics?.executionCount || 0), 0
            );
            const totalSuccess = requests.reduce(
                (sum, r) => sum + (r.statistics?.successCount || 0), 0
            );
            sendResponse({
                totalRequests: requests.length,
                totalExecutions,
                successRate: totalExecutions > 0 
                    ? ((totalSuccess / totalExecutions) * 100).toFixed(1) 
                    : 0
            });
        })();
        return true;
    }

    if (message.type === 'EXPORT_DATA') {
        StorageAdapter.exportAll().then(sendResponse);
        return true;
    }

    if (message.type === 'IMPORT_DATA') {
        StorageAdapter.importAll(message.data).then(success => {
            sendResponse({ success });
        });
        return true;
    }

    if (message.type === 'GET_ALL_GROUPS') {
        StorageAdapter.getAllGroups().then(sendResponse);
        return true;
    }

    if (message.type === 'CREATE_GROUP') {
        StorageAdapter.addGroup(message.data).then(group => {
            sendResponse({ success: true, group });
        });
        return true;
    }

    if (message.type === 'UPDATE_GROUP') {
        StorageAdapter.updateGroup(message.id, message.data).then(success => {
            sendResponse({ success });
        });
        return true;
    }

    if (message.type === 'DELETE_GROUP') {
        StorageAdapter.deleteGroup(message.id).then(success => {
            sendResponse({ success });
        });
        return true;
    }

    if (message.type === 'GET_CONFIG') {
        StorageAdapter.getConfig().then(sendResponse);
        return true;
    }

    if (message.type === 'SAVE_CONFIG') {
        StorageAdapter.saveConfig(message.data).then(success => {
            sendResponse({ success });
        });
        return true;
    }
});

TimerManager.init();
CronManager.init();

console.log('[RequestRepeater] Background script initialized');
