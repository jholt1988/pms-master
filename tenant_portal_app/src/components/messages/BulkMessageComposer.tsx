import React, { useMemo, useState } from 'react';

type TemplateSummary = {
  id: number;
  name: string;
  description?: string | null;
  body: string;
  subject?: string | null;
};

type PreviewResponse = {
  totalRecipients: number;
  sample: { user: { username: string }; renderedContent: string }[];
};

interface BulkMessageComposerProps {
  token: string;
  templates: TemplateSummary[];
  onBatchCreated?: () => void;
}

const ROLE_OPTIONS = [
  { label: 'Tenants', value: 'TENANT' },
  { label: 'Property managers', value: 'PROPERTY_MANAGER' },
];

const defaultMergeFields = [
  { key: 'managerName', value: '' },
  { key: 'supportEmail', value: '' },
];

const BulkMessageComposer: React.FC<BulkMessageComposerProps> = ({
  token,
  templates,
  onBatchCreated,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['TENANT']);
  const [propertyIds, setPropertyIds] = useState('');
  const [recipientIds, setRecipientIds] = useState('');
  const [throttle, setThrottle] = useState(50);
  const [scheduledAt, setScheduledAt] = useState('');
  const [mergeFields, setMergeFields] = useState(defaultMergeFields);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState<'preview' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === Number(templateId)),
    [templateId, templates],
  );

  const parseNumberList = (value: string) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter((chunk) => chunk.length > 0)
      .map((chunk) => Number(chunk))
      .filter((id) => Number.isFinite(id));

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    if (value) {
      const template = templates.find((item) => item.id === Number(value));
      if (template) {
        setBody(template.body ?? '');
        if (!title && template.subject) {
          setTitle(template.subject);
        }
      }
    }
  };

  const updateMergeField = (index: number, key: 'key' | 'value', value: string) => {
    setMergeFields((current) => {
      const copy = [...current];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const addMergeField = () => {
    setMergeFields((current) => [...current, { key: '', value: '' }]);
  };

  const removeMergeField = (index: number) => {
    setMergeFields((current) => current.filter((_, idx) => idx !== index));
  };

  const buildPayload = () => {
    const payload: any = {
      title,
      body,
      templateId: templateId ? Number(templateId) : undefined,
      throttlePerMinute: throttle,
      mergeFields: mergeFields.reduce<Record<string, string>>((acc, field) => {
        if (field.key) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {}),
      filters: {
        roles: selectedRoles,
        propertyIds: parseNumberList(propertyIds),
      },
      recipientIds: parseNumberList(recipientIds),
    };

    if (scheduledAt) {
      payload.sendStrategy = 'SCHEDULED';
      payload.scheduledAt = new Date(scheduledAt).toISOString();
    } else {
      payload.sendStrategy = 'IMMEDIATE';
    }

    return payload;
  };

  const request = async (endpoint: string, payload: any) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Request failed');
    }

    return response.json();
  };

  const handlePreview = async () => {
    setError(null);
    setSuccess(null);
    setLoading('preview');
    try {
      const payload = buildPayload();
      const data = await request('/api/messaging/bulk/preview', payload);
      setPreview(data);
      setSuccess(`Matched ${data.totalRecipients} recipients`);
    } catch (err: any) {
      setError(err.message);
      setPreview(null);
    } finally {
      setLoading(null);
    }
  };

  const handleSend = async () => {
    setError(null);
    setSuccess(null);
    setLoading('send');
    try {
      const payload = buildPayload();
      await request('/api/messaging/bulk', payload);
      setSuccess('Bulk message queued successfully');
      setPreview(null);
      if (onBatchCreated) {
        onBatchCreated();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <header>
        <h3 className="text-lg font-semibold text-gray-900">Compose bulk message</h3>
        <p className="text-sm text-gray-500">
          Select a template, target recipients, and personalize merge fields before sending.
        </p>
      </header>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Template</span>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={templateId}
            onChange={(event) => handleTemplateChange(event.target.value)}
          >
            <option value="">Custom message</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {selectedTemplate?.description && (
            <p className="mt-1 text-xs text-gray-500">{selectedTemplate.description}</p>
          )}
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Subject</span>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Rent reminder, maintenance update, etc."
          />
        </label>
      </div>

      <label className="text-sm">
        <span className="mb-1 block font-medium text-gray-700">Message body</span>
        <textarea
          className="min-h-[8rem] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Hi {{username}}, your rent is due on the 1st..."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Recipient roles</span>
          <div className="space-y-2 rounded-md border border-gray-200 p-3">
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedRoles((current) => Array.from(new Set([...current, role.value])));
                    } else {
                      setSelectedRoles((current) => current.filter((value) => value !== role.value));
                    }
                  }}
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Property IDs</span>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={propertyIds}
            onChange={(event) => setPropertyIds(event.target.value)}
            placeholder="e.g. 10, 42"
          />
          <p className="mt-1 text-xs text-gray-500">Optional: limit tenants to certain properties.</p>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Direct recipient IDs</span>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={recipientIds}
            onChange={(event) => setRecipientIds(event.target.value)}
            placeholder="e.g. 4, 9, 11"
          />
          <p className="mt-1 text-xs text-gray-500">Overrides filters to force-include specific users.</p>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Throttle (messages/min)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={throttle}
            onChange={(event) => setThrottle(Number(event.target.value) || 1)}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-gray-700">Schedule send (optional)</span>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">Leave empty to send immediately.</p>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Merge fields</span>
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:underline"
            onClick={addMergeField}
          >
            Add field
          </button>
        </div>
        <div className="space-y-2">
          {mergeFields.map((field, index) => (
            <div key={`${field.key}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Field key (e.g. managerName)"
                value={field.key}
                onChange={(event) => updateMergeField(index, 'key', event.target.value)}
              />
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Value"
                value={field.value}
                onChange={(event) => updateMergeField(index, 'value', event.target.value)}
              />
              <button
                type="button"
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => removeMergeField(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading === 'preview'}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === 'preview' ? 'Generating preview…' : 'Preview recipients'}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={loading === 'send'}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading === 'send' ? 'Queuing…' : 'Queue bulk send'}
        </button>
      </div>

      {preview && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
          <p className="font-medium text-gray-900">
            Preview will reach {preview.totalRecipients} recipients
          </p>
          <ul className="mt-3 space-y-2">
            {preview.sample.map((item, index) => (
              <li key={`${item.user.username}-${index}`} className="rounded-md border border-gray-200 bg-white p-3">
                <p className="font-medium text-gray-900">{item.user.username}</p>
                <p className="text-gray-600">{item.renderedContent}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default BulkMessageComposer;
