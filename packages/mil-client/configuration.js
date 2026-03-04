"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
class Configuration {
    constructor(param = {}) {
        this.apiKey = param.apiKey;
        this.username = param.username;
        this.password = param.password;
        this.accessToken = param.accessToken;
        this.awsv4 = param.awsv4;
        this.basePath = param.basePath;
        this.serverIndex = param.serverIndex;
        this.baseOptions = {
            ...param.baseOptions,
            headers: {
                ...param.baseOptions?.headers,
            },
        };
        this.formDataCtor = param.formDataCtor;
    }
    isJsonMime(mime) {
        const jsonMime = new RegExp('^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$', 'i');
        return mime !== null && (jsonMime.test(mime) || mime.toLowerCase() === 'application/json-patch+json');
    }
}
exports.Configuration = Configuration;
