import React from 'react';
import { Building2 } from 'lucide-react';
import { baseColors } from '../../../../design-tokens/colors';
import { spacing } from '../../../../design-tokens/spacing';
import { fontSize } from '../../../../design-tokens/typography';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

/**
 * Shared layout for authentication pages (login, signup, password reset)
 * Provides consistent branding and centered card layout
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div 
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ 
        backgroundColor: baseColors.neutral[50],
        padding: `${spacing[12]} ${spacing[4]}`
      }}
    >
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div 
              className="rounded-full p-3"
              style={{ backgroundColor: baseColors.primary[100] }}
            >
              <Building2 
                size={32} 
                style={{ color: baseColors.primary[600] }}
              />
            </div>
          </div>
          <h1 
            className="font-semibold"
            style={{ 
              fontSize: fontSize['3xl'],
              color: baseColors.neutral[900],
              marginBottom: spacing[2]
            }}
          >
            {title}
          </h1>
          <p 
            style={{ 
              fontSize: fontSize.sm,
              color: baseColors.neutral[600]
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Content Card */}
        {children}
      </div>
    </div>
  );
};
