# MilLineageEvaluationResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tenant_id** | **string** |  | [default to undefined]
**evaluation_id** | **string** |  | [default to undefined]
**record_hash** | **string** |  | [default to undefined]
**prev_hash** | **string** |  | [default to undefined]
**trace_root_hash** | **string** |  | [default to undefined]
**trace_steps** | **number** |  | [default to undefined]
**steps** | [**Array&lt;LineageStepSummary&gt;**](LineageStepSummary.md) |  | [default to undefined]

## Example

```typescript
import { MilLineageEvaluationResponse } from './api';

const instance: MilLineageEvaluationResponse = {
    tenant_id,
    evaluation_id,
    record_hash,
    prev_hash,
    trace_root_hash,
    trace_steps,
    steps,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
