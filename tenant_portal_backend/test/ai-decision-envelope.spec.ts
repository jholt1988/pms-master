import { wrapAiResult, hashInputs, confidenceRequiresApproval } from '../src/ai-gateway/ai-decision-envelope';

describe('AiDecisionEnvelope', () => {
  describe('hashInputs', () => {
    it('should produce the same hash for identical inputs', () => {
      const inputs = { task: 'MAINTENANCE_CLASSIFICATION', title: 'Leaky faucet' };
      expect(hashInputs(inputs)).toBe(hashInputs(inputs));
    });

    it('should produce different hashes for different inputs', () => {
      const a = hashInputs({ task: 'LEASE_SUMMARY' });
      const b = hashInputs({ task: 'APPLICATION_SUMMARY' });
      expect(a).not.toBe(b);
    });

    it('should be stable regardless of key order', () => {
      const h1 = hashInputs({ a: 1, b: 2 });
      const h2 = hashInputs({ b: 2, a: 1 });
      expect(h1).toBe(h2);
    });

    it('should return a 16-char hex string', () => {
      const h = hashInputs({ foo: 'bar' });
      expect(h).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('confidenceRequiresApproval', () => {
    it('should require approval for confidence < 0.7', () => {
      expect(confidenceRequiresApproval(0.69)).toBe(true);
      expect(confidenceRequiresApproval(0.5)).toBe(true);
      expect(confidenceRequiresApproval(0.0)).toBe(true);
    });

    it('should NOT require approval for confidence >= 0.7', () => {
      expect(confidenceRequiresApproval(0.7)).toBe(false);
      expect(confidenceRequiresApproval(0.85)).toBe(false);
      expect(confidenceRequiresApproval(1.0)).toBe(false);
    });

    it('should require approval when HIGH severity risk flags exist', () => {
      expect(
        confidenceRequiresApproval(0.9, [{ severity: 'HIGH', description: 'Critical' }]),
      ).toBe(true);
    });

    it('should NOT require approval for LOW/MEDIUM risk flags', () => {
      expect(
        confidenceRequiresApproval(0.9, [{ severity: 'MEDIUM', description: 'Warning' }]),
      ).toBe(false);
    });
  });

  describe('wrapAiResult', () => {
    const sampleResult = {
      summary: 'Test response',
      confidence: 0.85,
      requiresApproval: false,
    };

    const options = {
      confidence: 0.85,
      rationale: ['Based on analysis of input data'],
      modelVersion: 'ai-gateway-v1',
      inputs: { task: 'TEST' },
      provider: 'mock',
    };

    it('should wrap a result in the standard envelope', () => {
      const envelope = wrapAiResult(sampleResult, options);

      expect(envelope.result).toBe(sampleResult);
      expect(envelope.confidence).toBe(0.85);
      expect(envelope.rationale).toEqual(['Based on analysis of input data']);
      expect(envelope.modelVersion).toBe('ai-gateway-v1');
      expect(envelope.provider).toBe('mock');
      expect(envelope.requiresApproval).toBe(false);
      expect(envelope.inputsHash).toMatch(/^[0-9a-f]{16}$/);
      expect(envelope.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should flag requiresApproval for low confidence', () => {
      const envelope = wrapAiResult(sampleResult, { ...options, confidence: 0.5 });
      expect(envelope.requiresApproval).toBe(true);
    });

    it('should flag requiresApproval for HIGH risk flags', () => {
      const envelope = wrapAiResult(sampleResult, {
        ...options,
        riskFlags: [{ severity: 'HIGH' }],
      });
      expect(envelope.requiresApproval).toBe(true);
    });

    it('should preserve the original result object identity', () => {
      const envelope = wrapAiResult(sampleResult, options);
      expect(envelope.result).toBe(sampleResult);
    });
  });
});
