/**
 * Rent Recommendation Card Component
 * Displays AI-generated rent recommendations for property managers
 */

import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Divider } from '@nextui-org/react';
import { RentRecommendation } from '../../../shared/ai-services/types';

interface RentRecommendationCardProps {
  recommendation: RentRecommendation;
  onAccept: (unitId: string, newRent: number) => void;
  onReject: (unitId: string) => void;
  loading?: boolean;
}

export const RentRecommendationCard: React.FC<RentRecommendationCardProps> = ({
  recommendation,
  onAccept,
  onReject,
  loading = false,
}) => {
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);

  const difference = recommendation.recommendedRent - recommendation.currentRent;
  const percentChange = ((difference / recommendation.currentRent) * 100).toFixed(1);
  const isIncrease = difference > 0;

  const handleAccept = async () => {
    setActionLoading('accept');
    await onAccept(recommendation.unitId, recommendation.recommendedRent);
    setActionLoading(null);
  };

  const handleReject = async () => {
    setActionLoading('reject');
    await onReject(recommendation.unitId);
    setActionLoading(null);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Unit #{recommendation.unitId}</h3>
          <p className="text-sm text-gray-500">
            Generated {new Date(recommendation.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <Chip
          color={recommendation.status === 'accepted' ? 'success' : 
                 recommendation.status === 'rejected' ? 'danger' : 'warning'}
          variant="flat"
        >
          {recommendation.status.toUpperCase()}
        </Chip>
      </CardHeader>
      <Divider />
      <CardBody className="gap-4">
        {/* Rent Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current Rent</p>
            <p className="text-2xl font-bold">${recommendation.currentRent}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Recommended Rent</p>
            <p className="text-2xl font-bold text-blue-600">
              ${recommendation.recommendedRent}
            </p>
            <p className={`text-sm font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
              {isIncrease ? '+' : ''}{percentChange}% ({isIncrease ? '+' : ''}${difference})
            </p>
          </div>
        </div>

        {/* Confidence Interval */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Confidence Range</p>
          <div className="flex justify-between items-center">
            <span className="text-sm">${recommendation.confidenceInterval.low}</span>
            <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full relative">
              <div
                className="absolute h-full bg-blue-500 rounded-full"
                style={{
                  left: '0%',
                  width: '100%',
                }}
              />
            </div>
            <span className="text-sm">${recommendation.confidenceInterval.high}</span>
          </div>
        </div>

        {/* Key Factors */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Key Factors</p>
          <div className="space-y-2">
            {recommendation.factors.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{factor.name}</p>
                  <p className="text-xs text-gray-500">{factor.description}</p>
                </div>
                <Chip
                  size="sm"
                  color={factor.impact > 0 ? 'success' : factor.impact < 0 ? 'danger' : 'default'}
                  variant="flat"
                >
                  {factor.impact > 0 ? '+' : ''}{factor.impact > 0 ? factor.impact?.toFixed(1) : factor.impact.toFixed(1)}%
                </Chip>
              </div>
            ))}
          </div>
        </div>

        {/* Market Comparables */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Market Comparables ({recommendation.marketComparables.length})
          </p>
          <div className="space-y-2">
            {recommendation.marketComparables.slice(0, 3).map((comp, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{comp.address}</p>
                    <p className="text-xs text-gray-500">
                      {comp.bedrooms} bed • {comp.bathrooms} bath • {comp.sqft} sqft • {comp.distance} mi
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${comp.rent}</p>
                    <p className="text-xs text-gray-500">
                      {(comp.similarity * 100).toFixed(0)}% match
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Reasoning */}
        {recommendation.reasoning && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-1">AI Analysis</p>
            <p className="text-sm text-blue-800">{recommendation.reasoning}</p>
          </div>
        )}

        {/* Actions */}
        {recommendation.status === 'pending' && (
          <div className="flex gap-3 mt-2">
            <Button
              color="primary"
              className="flex-1"
              onPress={handleAccept}
              isLoading={actionLoading === 'accept' || loading}
              isDisabled={actionLoading !== null}
            >
              Accept Recommendation
            </Button>
            <Button
              color="danger"
              variant="flat"
              className="flex-1"
              onPress={handleReject}
              isLoading={actionLoading === 'reject' || loading}
              isDisabled={actionLoading !== null}
            >
              Reject
            </Button>
          </div>
        )}

        {/* Model Info */}
        <p className="text-xs text-gray-400 text-center">
          Model: {recommendation.modelVersion}
        </p>
      </CardBody>
    </Card>
  );
};
