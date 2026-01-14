const RequestManager = {
    _errors: {
        en: {
            unnamedRequest: 'Unnamed Request',
            failedToSave: 'Failed to save request',
            failedToUpdate: 'Failed to update request',
            failedToDelete: 'Failed to delete request'
        },
        zh: {
            unnamedRequest: '未命名请求',
            failedToSave: '保存请求失败',
            failedToUpdate: '更新请求失败',
            failedToDelete: '删除请求失败'
        }
    },

    _t(key) {
        const locale = (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) ? 'zh' : 'en';
        return this._errors[locale]?.[key] || this._errors['en'][key] || key;
    },

    matchesUrl(url, urlPattern) {
        return this._matchPattern(url, urlPattern);
    },

    _matchPattern(url, pattern) {
        const urlWithoutQuery = url.split('?')[0];
        const patternWithoutQuery = pattern.split('?')[0];
        
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patternRegex = new RegExp(
            '^' + escapeRegex(patternWithoutQuery).replace(/\\\*/g, '.*') + '$'
        );
        return patternRegex.test(urlWithoutQuery);
    },

    async getRequestsForUrl(url) {
        const allRequests = await StorageAdapter.getAllRequests();
        
        const matched = allRequests.filter(req => 
            this._matchPattern(url, req.urlPattern)
        );

        return matched.sort((a, b) => {
            const aTime = a.lastExecuted || 0;
            const bTime = b.lastExecuted || 0;
            return bTime - aTime;
        });
    },

    async createRequest(data) {
        const parseResult = CurlParser.validate(data.curl);
        if (!parseResult.valid) {
            return {
                success: false,
                error: parseResult.error
            };
        }

        const request = {
            name: data.name || this._t('unnamedRequest'),
            urlPattern: data.urlPattern,
            curl: data.curl,
            parsedRequest: parseResult.data,
            cookieReplace: data.cookieReplace || []
        };

        const success = await StorageAdapter.addRequest(request);
        return {
            success,
            error: success ? null : this._t('failedToSave')
        };
    },

    async updateRequest(id, data) {
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

        const success = await StorageAdapter.updateRequest(id, updates);
        return {
            success,
            error: success ? null : this._t('failedToUpdate')
        };
    },

    async deleteRequest(id) {
        const success = await StorageAdapter.deleteRequest(id);
        return {
            success,
            error: success ? null : this._t('failedToDelete')
        };
    },

    async getAllRequests() {
        return StorageAdapter.getAllRequests();
    },

    async getStatistics() {
        const requests = await StorageAdapter.getAllRequests();
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

if (typeof module !== 'undefined') {
    module.exports = RequestManager;
}
