const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const StorageAdapter = {
    KEYS: {
        REQUESTS: 'req_repeater_requests',
        CONFIG: 'req_repeater_config'
    },

    async getAllRequests() {
        const result = await browserAPI.storage.local.get(this.KEYS.REQUESTS);
        const data = result[this.KEYS.REQUESTS] || '[]';
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('[StorageAdapter] Failed to parse requests:', e);
            return [];
        }
    },

    async saveAllRequests(requests) {
        try {
            await browserAPI.storage.local.set({ 
                [this.KEYS.REQUESTS]: JSON.stringify(requests) 
            });
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to save requests:', e);
            return false;
        }
    },

    async addRequest(request) {
        const requests = await this.getAllRequests();
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

    async updateRequest(id, updates) {
        const requests = await this.getAllRequests();
        const index = requests.findIndex(r => r.id === id);
        if (index === -1) return false;
        
        requests[index] = { ...requests[index], ...updates };
        return this.saveAllRequests(requests);
    },

    async deleteRequest(id) {
        const requests = await this.getAllRequests();
        const filtered = requests.filter(r => r.id !== id);
        return this.saveAllRequests(filtered);
    },

    async getRequest(id) {
        const requests = await this.getAllRequests();
        return requests.find(r => r.id === id) || null;
    },

    async getConfig() {
        const result = await browserAPI.storage.local.get(this.KEYS.CONFIG);
        const data = result[this.KEYS.CONFIG] || '{}';
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

    async saveConfig(config) {
        try {
            await browserAPI.storage.local.set({ 
                [this.KEYS.CONFIG]: JSON.stringify(config) 
            });
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to save config:', e);
            return false;
        }
    },

    async exportAll() {
        return {
            requests: await this.getAllRequests(),
            config: await this.getConfig(),
            exportedAt: Date.now(),
            version: '2.0.0'
        };
    },

    async importAll(data) {
        try {
            if (data.requests) {
                await this.saveAllRequests(data.requests);
            }
            if (data.config) {
                await this.saveConfig(data.config);
            }
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to import data:', e);
            return false;
        }
    },

    _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

if (typeof module !== 'undefined') {
    module.exports = StorageAdapter;
}
