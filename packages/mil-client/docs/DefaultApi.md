# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**milEvaluateEvaluationIdGet**](#milevaluateevaluationidget) | **GET** /mil/evaluate/{evaluation_id} | Get evaluation status/result|
|[**milEvaluatePost**](#milevaluatepost) | **POST** /mil/evaluate | Evaluate a model target with MIL governance (sync or async)|
|[**milLineageEvaluationEvaluationIdGet**](#millineageevaluationevaluationidget) | **GET** /mil/lineage/evaluation/{evaluation_id} | Get lineage hashes/digests for an evaluation (no decryption)|
|[**milLineageVerifyPost**](#millineageverifypost) | **POST** /mil/lineage/verify | Verify chain continuity for a tenant and return signed attestation (allowed when overdue)|
|[**milTenantTenantIdCryptoDeletePost**](#miltenanttenantidcryptodeletepost) | **POST** /mil/tenant/{tenant_id}/crypto-delete | Crypto-delete tenant payload key (payloads unrecoverable; hash continuity preserved)|
|[**milTenantTenantIdCryptoStatusGet**](#miltenanttenantidcryptostatusget) | **GET** /mil/tenant/{tenant_id}/crypto-status | Get tenant crypto governance status|
|[**milTenantTenantIdRekeyRunPost**](#miltenanttenantidrekeyrunpost) | **POST** /mil/tenant/{tenant_id}/rekey/run | Run re-key job (maintenance freeze; everything pauses)|
|[**milTenantTenantIdRekeySchedulePost**](#miltenanttenantidrekeyschedulepost) | **POST** /mil/tenant/{tenant_id}/rekey/schedule | Schedule a tenant re-key maintenance job|
|[**wellKnownMilAttestationKeysJsonGet**](#wellknownmilattestationkeysjsonget) | **GET** /.well-known/mil-attestation-keys.json | Public keys for verifying MIL attestations|

# **milEvaluateEvaluationIdGet**
> MilEvaluationStatusResponse milEvaluateEvaluationIdGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let evaluationId: string; // (default to undefined)

const { status, data } = await apiInstance.milEvaluateEvaluationIdGet(
    evaluationId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **evaluationId** | [**string**] |  | defaults to undefined|


### Return type

**MilEvaluationStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milEvaluatePost**
> MilEvaluateResponse milEvaluatePost(milEvaluateRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MilEvaluateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let milEvaluateRequest: MilEvaluateRequest; //

const { status, data } = await apiInstance.milEvaluatePost(
    milEvaluateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **milEvaluateRequest** | **MilEvaluateRequest**|  | |


### Return type

**MilEvaluateResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Sync completed or async queued |  -  |
|**409** | Tenant blocked (rekey overdue/maintenance/crypto deleted) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milLineageEvaluationEvaluationIdGet**
> MilLineageEvaluationResponse milLineageEvaluationEvaluationIdGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let evaluationId: string; // (default to undefined)

const { status, data } = await apiInstance.milLineageEvaluationEvaluationIdGet(
    evaluationId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **evaluationId** | [**string**] |  | defaults to undefined|


### Return type

**MilLineageEvaluationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Lineage |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milLineageVerifyPost**
> MilLineageVerifyResponse milLineageVerifyPost(milLineageVerifyRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    MilLineageVerifyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let milLineageVerifyRequest: MilLineageVerifyRequest; //

const { status, data } = await apiInstance.milLineageVerifyPost(
    milLineageVerifyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **milLineageVerifyRequest** | **MilLineageVerifyRequest**|  | |


### Return type

**MilLineageVerifyResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Signed attestation |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milTenantTenantIdCryptoDeletePost**
> GenericOk milTenantTenantIdCryptoDeletePost()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tenantId: string; // (default to undefined)

const { status, data } = await apiInstance.milTenantTenantIdCryptoDeletePost(
    tenantId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tenantId** | [**string**] |  | defaults to undefined|


### Return type

**GenericOk**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Done |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milTenantTenantIdCryptoStatusGet**
> TenantCryptoStatusResponse milTenantTenantIdCryptoStatusGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tenantId: string; // (default to undefined)

const { status, data } = await apiInstance.milTenantTenantIdCryptoStatusGet(
    tenantId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tenantId** | [**string**] |  | defaults to undefined|


### Return type

**TenantCryptoStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milTenantTenantIdRekeyRunPost**
> RekeyJobResponse milTenantTenantIdRekeyRunPost(rekeyRunRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RekeyRunRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tenantId: string; // (default to undefined)
let rekeyRunRequest: RekeyRunRequest; //

const { status, data } = await apiInstance.milTenantTenantIdRekeyRunPost(
    tenantId,
    rekeyRunRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rekeyRunRequest** | **RekeyRunRequest**|  | |
| **tenantId** | [**string**] |  | defaults to undefined|


### Return type

**RekeyJobResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Completed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **milTenantTenantIdRekeySchedulePost**
> RekeyJobResponse milTenantTenantIdRekeySchedulePost(rekeyScheduleRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    RekeyScheduleRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tenantId: string; // (default to undefined)
let rekeyScheduleRequest: RekeyScheduleRequest; //

const { status, data } = await apiInstance.milTenantTenantIdRekeySchedulePost(
    tenantId,
    rekeyScheduleRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rekeyScheduleRequest** | **RekeyScheduleRequest**|  | |
| **tenantId** | [**string**] |  | defaults to undefined|


### Return type

**RekeyJobResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Scheduled |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **wellKnownMilAttestationKeysJsonGet**
> AttestationKeySet wellKnownMilAttestationKeysJsonGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.wellKnownMilAttestationKeysJsonGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AttestationKeySet**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Key set |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

