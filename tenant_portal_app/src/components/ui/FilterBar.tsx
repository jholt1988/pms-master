import React from 'react';
import { Card, CardBody, Select, SelectItem } from '@nextui-org/react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface FilterBarProps {
  title: string;
  description: string;
  filters: FilterConfig[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ title, description, filters }) => {
  const filterBarId = `filter-bar-${title.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <Card className="shadow-medium" role="region" aria-labelledby={`${filterBarId}-title`}>
      <CardBody className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id={`${filterBarId}-title`} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p id={`${filterBarId}-description`} className="mt-1 text-sm text-foreground-500">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-4" role="group" aria-label="Filter options">
            {filters.map((filter) => {
              const filterId = `${filterBarId}-${filter.name}`;
              return (
                <div key={filter.name} className="flex flex-col text-xs font-medium text-foreground-700">
                  <label htmlFor={filterId} className="mb-1">
                    {filter.label}
                  </label>
                  <Select
                    id={filterId}
                    size="sm"
                    selectedKeys={filter.value ? [filter.value] : []}
                    onChange={(e) => filter.onChange({ target: { name: filter.name, value: e.target.value } } as React.ChangeEvent<HTMLSelectElement>)}
                    isDisabled={filter.disabled}
                    className="w-40"
                    aria-label={`Filter by ${filter.label.toLowerCase()}`}
                    aria-describedby={undefined}
                  >
                    {[
                      { value: '', label: filter.label === 'Status' || filter.label === 'Priority' ? 'All' : 'Any' },
                      ...filter.options
                    ].map((option) => (
                      <SelectItem key={option.value || 'empty'}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};