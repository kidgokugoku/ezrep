const CurlParser = {
    _errors: {
        en: {
            invalidCurl: 'Invalid curl command',
            curlStart: 'Command must start with "curl"',
            noUrl: 'No URL found in curl command',
            invalidUrl: 'Invalid URL format'
        },
        zh: {
            invalidCurl: '无效的 curl 命令',
            curlStart: '命令必须以 "curl" 开头',
            noUrl: '在 curl 命令中未找到 URL',
            invalidUrl: '无效的 URL 格式'
        }
    },

    _getLocale() {
        if (typeof navigator !== 'undefined' && navigator.language) {
            return navigator.language.startsWith('zh') ? 'zh' : 'en';
        }
        return 'en';
    },

    _t(key) {
        const locale = this._getLocale();
        return this._errors[locale]?.[key] || this._errors['en'][key] || key;
    },

    parse(curlCommand) {
        try {
            if (!curlCommand || typeof curlCommand !== 'string') {
                throw new Error(this._t('invalidCurl'));
            }

            const trimmed = curlCommand.trim();
            if (!trimmed.toLowerCase().startsWith('curl')) {
                throw new Error(this._t('curlStart'));
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
                error: error.message || 'Failed to parse curl command'
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
            return { valid: false, error: this._t('noUrl') };
        }

        try {
            new URL(result.data.url);
        } catch (e) {
            return { valid: false, error: this._t('invalidUrl') };
        }

        return { valid: true, data: result.data };
    }
};

if (typeof module !== 'undefined') {
    module.exports = CurlParser;
}
