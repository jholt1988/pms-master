"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultApi = exports.DefaultApiFactory = exports.DefaultApiFp = exports.DefaultApiAxiosParamCreator = exports.TenantCryptoStatusResponseStateEnum = exports.SignatureEnvelopeAlgEnum = exports.RekeyScheduleRequestTriggerTypeEnum = exports.RekeyJobResponseStatusEnum = exports.MilEvaluationStatusResponseTenantStateEnum = exports.MilEvaluationStatusResponseStatusEnum = exports.MilEvaluateResponseStatusEnum = exports.MilEvaluateRequestModeEnum = exports.AttestationPublicKeyAlgEnum = void 0;
const axios_1 = __importDefault(require("axios"));
const common_1 = require("./common");
const base_1 = require("./base");
exports.AttestationPublicKeyAlgEnum = {
    Ed25519: 'Ed25519'
};
exports.MilEvaluateRequestModeEnum = {
    SyncHttp: 'sync_http',
    AsyncJob: 'async_job'
};
exports.MilEvaluateResponseStatusEnum = {
    Completed: 'COMPLETED',
    Queued: 'QUEUED'
};
exports.MilEvaluationStatusResponseStatusEnum = {
    Queued: 'QUEUED',
    Running: 'RUNNING',
    Completed: 'COMPLETED',
    Failed: 'FAILED',
    Blocked: 'BLOCKED'
};
exports.MilEvaluationStatusResponseTenantStateEnum = {
    Active: 'ACTIVE',
    RekeyRequired: 'REKEY_REQUIRED',
    RekeyOverdue: 'REKEY_OVERDUE',
    RekeyingMaintenance: 'REKEYING_MAINTENANCE',
    CryptoDeleted: 'CRYPTO_DELETED'
};
exports.RekeyJobResponseStatusEnum = {
    Scheduled: 'SCHEDULED',
    Ready: 'READY',
    Running: 'RUNNING',
    Completed: 'COMPLETED',
    Failed: 'FAILED',
    Aborted: 'ABORTED'
};
exports.RekeyScheduleRequestTriggerTypeEnum = {
    KeyAgeThreshold: 'KEY_AGE_THRESHOLD',
    CryptoPolicyUpdate: 'CRYPTO_POLICY_UPDATE',
    SecurityIncidentResponse: 'SECURITY_INCIDENT_RESPONSE',
    TenantRequested: 'TENANT_REQUESTED'
};
exports.SignatureEnvelopeAlgEnum = {
    Ed25519: 'Ed25519'
};
exports.TenantCryptoStatusResponseStateEnum = {
    Active: 'ACTIVE',
    RekeyRequired: 'REKEY_REQUIRED',
    RekeyOverdue: 'REKEY_OVERDUE',
    RekeyingMaintenance: 'REKEYING_MAINTENANCE',
    CryptoDeleted: 'CRYPTO_DELETED'
};
const DefaultApiAxiosParamCreator = function (configuration) {
    return {
        milEvaluateEvaluationIdGet: async (evaluationId, options = {}) => {
            (0, common_1.assertParamExists)('milEvaluateEvaluationIdGet', 'evaluationId', evaluationId);
            const localVarPath = `/mil/evaluate/{evaluation_id}`
                .replace(`{${"evaluation_id"}}`, encodeURIComponent(String(evaluationId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milEvaluatePost: async (milEvaluateRequest, options = {}) => {
            (0, common_1.assertParamExists)('milEvaluatePost', 'milEvaluateRequest', milEvaluateRequest);
            const localVarPath = `/mil/evaluate`;
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            localVarRequestOptions.data = (0, common_1.serializeDataIfNeeded)(milEvaluateRequest, localVarRequestOptions, configuration);
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milLineageEvaluationEvaluationIdGet: async (evaluationId, options = {}) => {
            (0, common_1.assertParamExists)('milLineageEvaluationEvaluationIdGet', 'evaluationId', evaluationId);
            const localVarPath = `/mil/lineage/evaluation/{evaluation_id}`
                .replace(`{${"evaluation_id"}}`, encodeURIComponent(String(evaluationId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milLineageVerifyPost: async (milLineageVerifyRequest, options = {}) => {
            (0, common_1.assertParamExists)('milLineageVerifyPost', 'milLineageVerifyRequest', milLineageVerifyRequest);
            const localVarPath = `/mil/lineage/verify`;
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            localVarRequestOptions.data = (0, common_1.serializeDataIfNeeded)(milLineageVerifyRequest, localVarRequestOptions, configuration);
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milTenantTenantIdCryptoDeletePost: async (tenantId, options = {}) => {
            (0, common_1.assertParamExists)('milTenantTenantIdCryptoDeletePost', 'tenantId', tenantId);
            const localVarPath = `/mil/tenant/{tenant_id}/crypto-delete`
                .replace(`{${"tenant_id"}}`, encodeURIComponent(String(tenantId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milTenantTenantIdCryptoStatusGet: async (tenantId, options = {}) => {
            (0, common_1.assertParamExists)('milTenantTenantIdCryptoStatusGet', 'tenantId', tenantId);
            const localVarPath = `/mil/tenant/{tenant_id}/crypto-status`
                .replace(`{${"tenant_id"}}`, encodeURIComponent(String(tenantId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milTenantTenantIdRekeyRunPost: async (tenantId, rekeyRunRequest, options = {}) => {
            (0, common_1.assertParamExists)('milTenantTenantIdRekeyRunPost', 'tenantId', tenantId);
            (0, common_1.assertParamExists)('milTenantTenantIdRekeyRunPost', 'rekeyRunRequest', rekeyRunRequest);
            const localVarPath = `/mil/tenant/{tenant_id}/rekey/run`
                .replace(`{${"tenant_id"}}`, encodeURIComponent(String(tenantId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            localVarRequestOptions.data = (0, common_1.serializeDataIfNeeded)(rekeyRunRequest, localVarRequestOptions, configuration);
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        milTenantTenantIdRekeySchedulePost: async (tenantId, rekeyScheduleRequest, options = {}) => {
            (0, common_1.assertParamExists)('milTenantTenantIdRekeySchedulePost', 'tenantId', tenantId);
            (0, common_1.assertParamExists)('milTenantTenantIdRekeySchedulePost', 'rekeyScheduleRequest', rekeyScheduleRequest);
            const localVarPath = `/mil/tenant/{tenant_id}/rekey/schedule`
                .replace(`{${"tenant_id"}}`, encodeURIComponent(String(tenantId)));
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Content-Type'] = 'application/json';
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            localVarRequestOptions.data = (0, common_1.serializeDataIfNeeded)(rekeyScheduleRequest, localVarRequestOptions, configuration);
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        wellKnownMilAttestationKeysJsonGet: async (options = {}) => {
            const localVarPath = `/.well-known/mil-attestation-keys.json`;
            const localVarUrlObj = new URL(localVarPath, common_1.DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }
            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options };
            const localVarHeaderParameter = {};
            const localVarQueryParameter = {};
            localVarHeaderParameter['Accept'] = 'application/json';
            (0, common_1.setSearchParams)(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = { ...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers };
            return {
                url: (0, common_1.toPathString)(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    };
};
exports.DefaultApiAxiosParamCreator = DefaultApiAxiosParamCreator;
const DefaultApiFp = function (configuration) {
    const localVarAxiosParamCreator = (0, exports.DefaultApiAxiosParamCreator)(configuration);
    return {
        async milEvaluateEvaluationIdGet(evaluationId, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milEvaluateEvaluationIdGet(evaluationId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milEvaluateEvaluationIdGet']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milEvaluatePost(milEvaluateRequest, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milEvaluatePost(milEvaluateRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milEvaluatePost']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milLineageEvaluationEvaluationIdGet(evaluationId, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milLineageEvaluationEvaluationIdGet(evaluationId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milLineageEvaluationEvaluationIdGet']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milLineageVerifyPost(milLineageVerifyRequest, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milLineageVerifyPost(milLineageVerifyRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milLineageVerifyPost']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milTenantTenantIdCryptoDeletePost(tenantId, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milTenantTenantIdCryptoDeletePost(tenantId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milTenantTenantIdCryptoDeletePost']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milTenantTenantIdCryptoStatusGet(tenantId, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milTenantTenantIdCryptoStatusGet(tenantId, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milTenantTenantIdCryptoStatusGet']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milTenantTenantIdRekeyRunPost']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.milTenantTenantIdRekeySchedulePost']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
        async wellKnownMilAttestationKeysJsonGet(options) {
            const localVarAxiosArgs = await localVarAxiosParamCreator.wellKnownMilAttestationKeysJsonGet(options);
            const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
            const localVarOperationServerBasePath = base_1.operationServerMap['DefaultApi.wellKnownMilAttestationKeysJsonGet']?.[localVarOperationServerIndex]?.url;
            return (axios, basePath) => (0, common_1.createRequestFunction)(localVarAxiosArgs, axios_1.default, base_1.BASE_PATH, configuration)(axios, localVarOperationServerBasePath || basePath);
        },
    };
};
exports.DefaultApiFp = DefaultApiFp;
const DefaultApiFactory = function (configuration, basePath, axios) {
    const localVarFp = (0, exports.DefaultApiFp)(configuration);
    return {
        milEvaluateEvaluationIdGet(evaluationId, options) {
            return localVarFp.milEvaluateEvaluationIdGet(evaluationId, options).then((request) => request(axios, basePath));
        },
        milEvaluatePost(milEvaluateRequest, options) {
            return localVarFp.milEvaluatePost(milEvaluateRequest, options).then((request) => request(axios, basePath));
        },
        milLineageEvaluationEvaluationIdGet(evaluationId, options) {
            return localVarFp.milLineageEvaluationEvaluationIdGet(evaluationId, options).then((request) => request(axios, basePath));
        },
        milLineageVerifyPost(milLineageVerifyRequest, options) {
            return localVarFp.milLineageVerifyPost(milLineageVerifyRequest, options).then((request) => request(axios, basePath));
        },
        milTenantTenantIdCryptoDeletePost(tenantId, options) {
            return localVarFp.milTenantTenantIdCryptoDeletePost(tenantId, options).then((request) => request(axios, basePath));
        },
        milTenantTenantIdCryptoStatusGet(tenantId, options) {
            return localVarFp.milTenantTenantIdCryptoStatusGet(tenantId, options).then((request) => request(axios, basePath));
        },
        milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options) {
            return localVarFp.milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options).then((request) => request(axios, basePath));
        },
        milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options) {
            return localVarFp.milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options).then((request) => request(axios, basePath));
        },
        wellKnownMilAttestationKeysJsonGet(options) {
            return localVarFp.wellKnownMilAttestationKeysJsonGet(options).then((request) => request(axios, basePath));
        },
    };
};
exports.DefaultApiFactory = DefaultApiFactory;
class DefaultApi extends base_1.BaseAPI {
    milEvaluateEvaluationIdGet(evaluationId, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milEvaluateEvaluationIdGet(evaluationId, options).then((request) => request(this.axios, this.basePath));
    }
    milEvaluatePost(milEvaluateRequest, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milEvaluatePost(milEvaluateRequest, options).then((request) => request(this.axios, this.basePath));
    }
    milLineageEvaluationEvaluationIdGet(evaluationId, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milLineageEvaluationEvaluationIdGet(evaluationId, options).then((request) => request(this.axios, this.basePath));
    }
    milLineageVerifyPost(milLineageVerifyRequest, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milLineageVerifyPost(milLineageVerifyRequest, options).then((request) => request(this.axios, this.basePath));
    }
    milTenantTenantIdCryptoDeletePost(tenantId, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milTenantTenantIdCryptoDeletePost(tenantId, options).then((request) => request(this.axios, this.basePath));
    }
    milTenantTenantIdCryptoStatusGet(tenantId, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milTenantTenantIdCryptoStatusGet(tenantId, options).then((request) => request(this.axios, this.basePath));
    }
    milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milTenantTenantIdRekeyRunPost(tenantId, rekeyRunRequest, options).then((request) => request(this.axios, this.basePath));
    }
    milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options) {
        return (0, exports.DefaultApiFp)(this.configuration).milTenantTenantIdRekeySchedulePost(tenantId, rekeyScheduleRequest, options).then((request) => request(this.axios, this.basePath));
    }
    wellKnownMilAttestationKeysJsonGet(options) {
        return (0, exports.DefaultApiFp)(this.configuration).wellKnownMilAttestationKeysJsonGet(options).then((request) => request(this.axios, this.basePath));
    }
}
exports.DefaultApi = DefaultApi;
