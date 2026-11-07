import { Test, TestingModule } from '@nestjs/testing';
import { ModelGatewayService } from './model-gateway.service';
import { MaintenanceTriageService } from './maintenance-triage.service';

describe('MaintenanceTriageService', () => {
  let service: MaintenanceTriageService;
  let gateway: jest.Mocked<ModelGatewayService>;

  beforeEach(async () => {
    gateway = { chat: jest.fn() } as any;
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaintenanceTriageService, { provide: ModelGatewayService, useValue: gateway }],
    }).compile();
    service = module.get<MaintenanceTriageService>(MaintenanceTriageService);
  });

  it('classifies emergency plumbing request', async () => {
    gateway.chat.mockResolvedValue({
      content: JSON.stringify({ urgency: 'emergency', category: 'plumbing', suggestedVendorType: 'plumber', summary: 'Water leak' }),
      tokensUsed: 50,
      model: 'gpt-4o-mini',
      fallback: false,
    });
    const result = await service.triage('t1', 'Pipe burst in kitchen, water everywhere');
    expect(result.urgency).toBe('emergency');
    expect(result.category).toBe('plumbing');
    expect(result.fallback).toBe(false);
  });

  it('returns fallback on gateway failure', async () => {
    gateway.chat.mockResolvedValue({ content: '', tokensUsed: 0, model: 'fallback', fallback: true });
    const result = await service.triage('t1', 'something broke');
    expect(result.fallback).toBe(true);
    expect(result.urgency).toBe('medium');
  });

  it('handles malformed JSON gracefully', async () => {
    gateway.chat.mockResolvedValue({ content: 'not json', tokensUsed: 10, model: 'gpt-4o-mini', fallback: false });
    const result = await service.triage('t1', 'door squeaks');
    expect(result.fallback).toBe(true);
    expect(result.urgency).toBe('medium');
  });

  it('validates urgency enum', async () => {
    gateway.chat.mockResolvedValue({
      content: JSON.stringify({ urgency: 'critical', category: 'electrical', suggestedVendorType: 'electrician', summary: 'Wiring issue' }),
      tokensUsed: 30,
      model: 'gpt-4o-mini',
      fallback: false,
    });
    const result = await service.triage('t1', 'sparks from outlet');
    expect(result.urgency).toBe('medium'); // invalid → default
    expect(result.category).toBe('electrical');
  });
});
