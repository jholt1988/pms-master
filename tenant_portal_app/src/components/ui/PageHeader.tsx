import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-small text-foreground-500">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-foreground-300">/</span>
                )}
                {breadcrumb.href ? (
                  <a 
                    href={breadcrumb.href} 
                    className="hover:text-foreground-700 transition-colors"
                  >
                    {breadcrumb.label}
                  </a>
                ) : (
                  <span className="text-foreground-700">{breadcrumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-medium text-foreground-600 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};