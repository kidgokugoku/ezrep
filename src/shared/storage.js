const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const StorageAdapter = {
    KEYS: {
        REQUESTS: 'req_repeater_requests',
        CONFIG: 'req_repeater_config',
        GROUPS: 'req_repeater_groups',
        TIMERS: 'req_repeater_timers'
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
            groupId: request.groupId || null,
            chainNextId: request.chainNextId || null,
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
                enableBatchExecution: config.enableBatchExecution !== false,
                theme: config.theme || 'auto'
            };
        } catch (e) {
            console.error('[StorageAdapter] Failed to parse config:', e);
            return {
                defaultCookieReplace: [],
                notificationDuration: 5000,
                enableBatchExecution: true,
                theme: 'auto'
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
            if (data.groups) {
                await this.saveAllGroups(data.groups);
            }
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to import data:', e);
            return false;
        }
    },

    // ==================== Groups API ====================
    async getAllGroups() {
        const result = await browserAPI.storage.local.get(this.KEYS.GROUPS);
        const data = result[this.KEYS.GROUPS] || '[]';
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('[StorageAdapter] Failed to parse groups:', e);
            return [];
        }
    },

    async saveAllGroups(groups) {
        try {
            await browserAPI.storage.local.set({ 
                [this.KEYS.GROUPS]: JSON.stringify(groups) 
            });
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to save groups:', e);
            return false;
        }
    },

    async addGroup(group) {
        const groups = await this.getAllGroups();
        const newGroup = {
            id: this._generateUUID(),
            name: group.name,
            color: group.color || '#3b82f6',
            createdAt: Date.now()
        };
        groups.push(newGroup);
        await this.saveAllGroups(groups);
        return newGroup;
    },

    async updateGroup(id, updates) {
        const groups = await this.getAllGroups();
        const index = groups.findIndex(g => g.id === id);
        if (index === -1) return false;
        groups[index] = { ...groups[index], ...updates };
        return this.saveAllGroups(groups);
    },

    async deleteGroup(id) {
        const groups = await this.getAllGroups();
        const filtered = groups.filter(g => g.id !== id);
        // Also remove groupId from requests
        const requests = await this.getAllRequests();
        const updatedRequests = requests.map(r => 
            r.groupId === id ? { ...r, groupId: null } : r
        );
        await this.saveAllRequests(updatedRequests);
        return this.saveAllGroups(filtered);
    },

    // ==================== Timers Persistence ====================
    async getTimers() {
        const result = await browserAPI.storage.local.get(this.KEYS.TIMERS);
        const data = result[this.KEYS.TIMERS] || '{}';
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('[StorageAdapter] Failed to parse timers:', e);
            return {};
        }
    },

    async saveTimers(timers) {
        try {
            await browserAPI.storage.local.set({ 
                [this.KEYS.TIMERS]: JSON.stringify(timers) 
            });
            return true;
        } catch (e) {
            console.error('[StorageAdapter] Failed to save timers:', e);
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
