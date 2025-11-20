import React from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Chip,
  Spinner
} from '@nextui-org/react';
import { useViewportCategory } from '../../hooks/useViewportCategory';

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  hideOnTablet?: boolean;
}

export interface DataTableProps {
  title?: string;
  subtitle?: string;
  columns: DataTableColumn[];
  data: Array<Record<string, any>>;
  loading?: boolean;
  emptyContent?: string;
  headerActions?: React.ReactNode;
  className?: string;
  renderCell?: (item: Record<string, any>, columnKey: string) => React.ReactNode;
  renderCard?: (item: Record<string, any>) => React.ReactNode;
  renderAs?: 'table' | 'cards';
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  subtitle,
  columns,
  data,
  loading = false,
  emptyContent = 'No data available',
  headerActions,
  className = '',
  renderCell,
  renderCard,
  renderAs = 'table',
}) => {
  const viewport = useViewportCategory();
  const isMobile = viewport === 'mobile' || viewport === 'tablet-portrait';

  const visibleColumns = isMobile
    ? columns.filter((c) => !c.hideOnTablet)
    : columns;

  const defaultRenderCell = (item: Record<string, any>, columnKey: string): React.ReactNode => {
    const value = item[columnKey];

    if (value === null || value === undefined || value === '') {
      return <span className="text-foreground-500">—</span>;
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  };

  const cellRenderer = renderCell || defaultRenderCell;

  const tableContent = (
    <Table 
      aria-label={title || 'Data table'} 
      removeWrapper
      classNames={{
        th: 'bg-content2 text-foreground-600 font-medium text-tiny uppercase tracking-wide',
        td: `text-small ${isMobile ? 'py-4' : ''}`,
      }}
    >
      <TableHeader>
        {visibleColumns.map((column) => (
          <TableColumn 
            key={column.key}
            align={column.align || 'start'}
            allowsSorting={column.sortable}
          >
            {column.label}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody 
        emptyContent={emptyContent}
        isLoading={loading}
        loadingContent={<Spinner />}
      >
        {data.map((item, index) => (
          <TableRow key={item.id || index}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key}>
                {cellRenderer(item, column.key)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const cardContent = (
    <div className="space-y-4">
      {loading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <p>{emptyContent}</p>
      ) : (
        data.map((item, index) =>
          renderCard ? (
            renderCard(item)
          ) : (
            <Card key={item.id || index}>
              <CardBody>
                {columns.map((column) => (
                  <div key={column.key}>
                    <strong>{column.label}:</strong> {cellRenderer(item, column.key)}
                  </div>
                ))}
              </CardBody>
            </Card>
          ),
        )
      )}
    </div>
  );

  const content = renderAs === 'cards' && isMobile ? cardContent : tableContent;

  if (title || subtitle || headerActions) {
    return (
      <Card className={`shadow-medium ${className}`}>
        {(title || subtitle || headerActions) && (
          <CardHeader className="pb-4 flex-row items-center justify-between">
            <div>
              {title && <h2 className="text-xl font-semibold text-foreground">{title}</h2>}
              {subtitle && <p className="text-small text-foreground-500">{subtitle}</p>}
            </div>
            {headerActions && <div>{headerActions}</div>}
          </CardHeader>
        )}
        <CardBody className="pt-0">
          {content}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
};
