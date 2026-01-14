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
            placeholderCurl: "curl 'https://api.example.com/users' -H 'Authorization: Bearer xxx'",
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
            repeatComplete: 'Completed {success}/{total}',
            
            btnSave: 'Save',
            notifExported: 'Exported successfully',
            notifImported: 'Imported successfully',
            notifDeleted: 'Deleted successfully',
            notifImportFailed: 'Import failed',
            notifDeleteFailed: 'Delete failed',
            notifInvalidJson: 'Invalid JSON file',
            unnamedRequest: 'Unnamed Request'
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
            placeholderCurl: "curl 'https://api.example.com/users' -H 'Authorization: Bearer xxx'",
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
            repeatComplete: '完成 {success}/{total}',
            
            btnSave: '保存',
            notifExported: '导出成功',
            notifImported: '导入成功',
            notifDeleted: '删除成功',
            notifImportFailed: '导入失败',
            notifDeleteFailed: '删除失败',
            notifInvalidJson: '无效的 JSON 文件',
            unnamedRequest: '未命名请求'
        },
        'zh-CN': 'zh',
        'zh-TW': 'zh',
        'zh-HK': 'zh'
    },

    async init() {
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        const result = await browserAPI.storage.local.get('rr_locale');
        this.locale = result.rr_locale || 'auto';
        
        if (this.locale === 'auto') {
            const browserLang = navigator.language || 'en';
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

    async setLocale(locale) {
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        this.locale = locale;
        await browserAPI.storage.local.set({ rr_locale: locale });
    },

    getLocale() {
        return this.locale;
    }
};

if (typeof module !== 'undefined') {
    module.exports = I18n;
}
