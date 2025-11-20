import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeaseEsignPanel } from './LeaseEsignPanel';
import * as EsignatureApi from '../../services/EsignatureApi';

jest.mock('../../services/EsignatureApi');

const mockCreateEnvelope = EsignatureApi.createEnvelope as jest.Mock;

describe('LeaseEsignPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders envelope data and participant statuses', () => {
    render(
      <LeaseEsignPanel
        token="token"
        leaseId={1}
        tenantEmail="tenant@test.com"
        tenantName="Tenant"
        envelopes={[
          {
            id: 5,
            leaseId: 1,
            provider: 'DOCUSIGN',
            providerEnvelopeId: 'env',
            status: 'SENT',
            createdAt: new Date().toISOString(),
            participants: [
              { id: 1, name: 'Tenant', email: 'tenant@test.com', role: 'TENANT', status: 'SENT' },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/Envelope #5/i)).toBeInTheDocument();
    expect(screen.getByText(/Tenant • TENANT/i)).toBeInTheDocument();
  });

  it('submits a new signature request', async () => {
    const onEnvelopeCreated = jest.fn();
    mockCreateEnvelope.mockResolvedValue({
      id: 6,
      leaseId: 1,
      provider: 'DOCUSIGN',
      providerEnvelopeId: 'env-2',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      participants: [],
    });

    render(
      <LeaseEsignPanel
        token="token"
        leaseId={1}
        tenantEmail="tenant@test.com"
        tenantName="Tenant"
        onEnvelopeCreated={onEnvelopeCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Template ID/i), { target: { value: 'LEASE-TEMPLATE' } });
    fireEvent.change(screen.getByLabelText(/Message to signers/i), { target: { value: 'Please sign' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Signature Request/i }));

    await waitFor(() => expect(mockCreateEnvelope).toHaveBeenCalled());
    expect(onEnvelopeCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }));
  });
});
