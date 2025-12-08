import React, { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Spinner } from '@nextui-org/react';

interface LeaseSigningProps {
    leaseId: number;
    envelopeId: number;
    onSigningComplete?: () => void;
}

export const LeaseSigning: React.FC<LeaseSigningProps> = ({ leaseId, envelopeId, onSigningComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignLease = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token'); // Assuming token is stored here
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // 1. Request the signing URL (Recipient View)
            const returnUrl = `${window.location.origin}/leases/${leaseId}?signed=true`;

            const response = await fetch(`/api/esignature/envelopes/${envelopeId}/recipient-view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ returnUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to initialize signing session');
            }

            const data = await response.json();

            // 2. Redirect to DocuSign
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No signing URL returned from server');
            }

        } catch (err: any) {
            console.error('Signing error:', err);
            setError(err.message || 'An unexpected error occurred');
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex gap-3">
                <div className="flex flex-col">
                    <p className="text-md font-bold">Lease Signature Required</p>
                    <p className="text-small text-default-500">Please sign your lease to finalize the agreement.</p>
                </div>
            </CardHeader>
            <CardBody>
                {error && (
                    <div className="bg-danger-50 text-danger p-3 rounded-medium mb-4 text-sm">
                        {error}
                    </div>
                )}

                <Button
                    color="primary"
                    size="lg"
                    onPress={handleSignLease}
                    isLoading={isLoading}
                    className="w-full font-semibold"
                >
                    {isLoading ? 'Preparing Document...' : 'Sign Lease Now'}
                </Button>

                <p className="text-xs text-center text-default-400 mt-4">
                    You will be redirected to DocuSign to securely sign your document.
                </p>
            </CardBody>
        </Card>
    );
};
