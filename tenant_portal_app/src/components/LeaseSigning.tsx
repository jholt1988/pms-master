import React, { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Spinner } from '@nextui-org/react';
import { createRecipientView } from '../services/EsignatureApi';
import { useAuth } from '../AuthContext';

interface LeaseSigningProps {
    leaseId: number;
    envelopeId: number;
    onSigningComplete?: () => void;
}

export const LeaseSigning: React.FC<LeaseSigningProps> = ({ leaseId, envelopeId, onSigningComplete }) => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignLease = async () => {
        if (!token) {
            setError('You must be logged in to sign documents.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Request the signing URL (Recipient View)
            const returnUrl = `${window.location.origin}/leases/${leaseId}?signed=true`;

            // Use the centralized API function which includes robust error handling
            const signingUrl = await createRecipientView(token, envelopeId, returnUrl);

            // 2. Redirect to DocuSign
            window.location.href = signingUrl;

        } catch (err: any) {
            console.error('Signing error:', err);

            // Extract a user-friendly message
            let message = err.message || 'An unexpected error occurred';

            // Check for specific error params if present in a URL-like message (unlikely from API call throw, but good safety)
            if (message.includes('token_expired')) message = 'Your session expired. Please refresh the page.';
            if (message.includes('invalid_recipient')) message = 'You are not listed as a valid signer for this document.';

            setError(message);
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
                    <div className="bg-danger-50 text-danger-700 p-3 rounded-medium mb-4 text-sm font-medium border border-danger-100">
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
