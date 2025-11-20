import React from 'react';
import { AppShell } from './AppShell';

interface TabletPageShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  actions?: React.ReactNode;
}

/**
 * A shell component that wraps page content within the AppShell, adding standard padding and max-width handling for tablet.
 * It also provides an optional integrated page header with a title and actions that adapts to screen size.
 *
 * @param {React.ReactNode} children - The content of the page.
 * @param {string} [pageTitle] - The title to display in the page header.
 * @param {React.ReactNode} [actions] - The actions to display in the page header.
 */
export const TabletPageShell: React.FC<TabletPageShellProps> = ({ children, pageTitle, actions }) => {
  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8">
        {(pageTitle || actions) && (
          <div className="flex items-center justify-between mb-6">
            {pageTitle && <h1 className="text-2xl font-bold">{pageTitle}</h1>}
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </AppShell>
  );
};
