# MilEvaluationStatusResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** |  | [default to undefined]
**tenant_state** | **string** |  | [default to undefined]
**evaluation_id** | **string** |  | [default to undefined]
**result** | **{ [key: string]: any; }** |  | [optional] [default to undefined]
**lineage** | [**LineageSummary**](LineageSummary.md) |  | [optional] [default to undefined]
**error** | [**ErrorResponse**](ErrorResponse.md) |  | [optional] [default to undefined]

## Example

```typescript
import { MilEvaluationStatusResponse } from './api';

const instance: MilEvaluationStatusResponse = {
    status,
    tenant_state,
    evaluation_id,
    result,
    lineage,
    error,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
