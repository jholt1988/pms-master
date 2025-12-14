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
  providerStatus?: string;
  createdAt: string;
  updatedAt?: string;
  participants: EsignParticipant[];
  signedPdfDocument?: {
    id: number;
    fileName: string;
  } | null;
  auditTrailDocument?: {
    id: number;
    fileName: string;
  } | null;
  lease?: {
    id: number;
    tenant?: {
      id: number;
      email: string;
    } | null;
  };
  createdBy?: {
    id: number;
    username: string;
  };
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
  console.log('Create Envelope response status:', response.status);
  console.log('Create Envelope response headers:', response.headers);
  console.log('Create Envelope response body:', await response.clone().text());
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
  // Use apiClient to ensure correct base URL
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const url = `${base.replace(/\/$/, '')}/esignature/envelopes/${envelopeId}/recipient-view`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ returnUrl }),
  });

  if (!response.ok) {
    const errorText = await readErrorResponse(response);

    // Check if error is related to envelope status (e.g., voided, completed)
    if (errorText.toLowerCase().includes('envelope') && errorText.toLowerCase().includes('status')) {
      throw new Error(`The document cannot be accessed at this time: ${errorText}`);
    }

    // Handle 401/403 specifically
    if (response.status === 401 || response.status === 403) {
      throw new Error('You are not authorized to sign this document. Please contact support if you believe this is an error.');
    }
    throw new Error(errorText);
  }

  const data = (await response.json()) as { url: string };

  // Validate the URL before returning
  if (!data.url || typeof data.url !== 'string') {
    throw new Error('Invalid response from server: missing or invalid signing URL');
  }

  // CRITICAL: DocuSign sometimes returns a URL that redirects back to our own callback 
  // if the envelope is not in a signable state (e.g., "completed", "voided", or "sent" but not "sent" to THIS recipient).
  // We must ensure the URL is actually pointing to a signing provider domain (docusign.com, etc.) OR
  // at least does NOT loop back immediately to our own domain with an error param.

  // Check if this is a fallback URL (points back to our frontend, not a signing provider)
  const isFallbackUrl = data.url.includes(window.location.origin) &&
    (data.url.includes('?envelope=') || data.url.includes('&envelope=') || data.url.includes('event='));

  if (isFallbackUrl) {
    console.warn('Received fallback URL instead of signing URL:', data.url);
    // Try to extract event from URL to give better error
    const urlObj = new URL(data.url);
    const event = urlObj.searchParams.get('event');

    if (event === 'signing_complete') {
      throw new Error('You have already signed this document.');
    } else if (event === 'decline') {
      throw new Error('You have declined to sign this document.');
    } else if (event === 'ttl_expired') {
      throw new Error('The signing session has expired. Please refresh the page to try again.');
    }

    throw new Error('E-signature provider returned a non-actionable URL. Please contact support.');
  }

  return data.url;
};

export const getEnvelope = async (token: string, envelopeId: number): Promise<EsignEnvelope> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return (await response.json()) as EsignEnvelope;
};

export const voidEnvelope = async (
  token: string,
  envelopeId: number,
  reason?: string,
): Promise<EsignEnvelope> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/void`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return (await response.json()) as EsignEnvelope;
};

export const refreshEnvelopeStatus = async (token: string, envelopeId: number): Promise<EsignEnvelope> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return (await response.json()) as EsignEnvelope;
};

export const resendNotifications = async (
  token: string,
  envelopeId: number,
): Promise<{ success: boolean; participantsNotified: number; reminderCount: number }> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/resend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return (await response.json()) as { success: boolean; participantsNotified: number; reminderCount: number };
};

export const downloadSignedDocument = async (token: string, envelopeId: number): Promise<void> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/documents/signed`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lease-${envelopeId}-signed.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const downloadCertificate = async (token: string, envelopeId: number): Promise<void> => {
  const response = await fetch(`/api/esignature/envelopes/${envelopeId}/documents/certificate`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lease-${envelopeId}-certificate.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
