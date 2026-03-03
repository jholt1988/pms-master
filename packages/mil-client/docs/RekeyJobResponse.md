# RekeyJobResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tenant_id** | **string** |  | [default to undefined]
**job_id** | **string** |  | [default to undefined]
**status** | **string** |  | [default to undefined]
**old_kms_key_id** | **string** |  | [optional] [default to undefined]
**new_kms_key_id** | **string** |  | [optional] [default to undefined]
**result_summary** | **{ [key: string]: any; }** |  | [optional] [default to undefined]

## Example

```typescript
import { RekeyJobResponse } from './api';

const instance: RekeyJobResponse = {
    tenant_id,
    job_id,
    status,
    old_kms_key_id,
    new_kms_key_id,
    result_summary,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
