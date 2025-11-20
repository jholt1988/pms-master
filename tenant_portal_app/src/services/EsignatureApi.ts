export interface EsignParticipant {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  userId?: number | null;
}

export interface EsignEnvelope {
  id: number;
  leaseId: number;
  provider: string;
  providerEnvelopeId: string;
  status: string;
  createdAt: string;
  participants: EsignParticipant[];
}

export interface EnvelopeRecipientInput {
  name: string;
  email: string;
  role: string;
  userId?: number;
  phone?: string;
}

export interface CreateEnvelopePayload {
  templateId: string;
  message?: string;
  recipients: EnvelopeRecipientInput[];
}

const readErrorResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return 'Request failed';
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Ignore JSON parse failures
  }

  return text;
};

export const createEnvelope = async (
  token: string,
  leaseId: number,
  payload: CreateEnvelopePayload,
): Promise<EsignEnvelope> => {
  const response = await fetch(`/api/esignature/leases/${leaseId}/envelopes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return (await response.json()) as EsignEnvelope;
};

export const createRecipientView = async (
  token: string,
  envelopeId: number,
  returnUrl: string,
): Promise<string> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/recipient-view`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ returnUrl }),
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  const data = (await response.json()) as { url: string };
  return data.url;
};
