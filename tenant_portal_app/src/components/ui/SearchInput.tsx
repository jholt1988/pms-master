import React, { useState, useEffect } from 'react';
import { Input } from '@nextui-org/react';
import { SearchIcon, X } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isClearable?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  value = '',
  onSearch,
  onClear,
  debounceMs = 300,
  size = 'md',
  className = '',
  isClearable = true,
}) => {
  const [searchQuery, setSearchQuery] = useState(value);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch, debounceMs]);

  // Update local state when external value changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleClear = () => {
    setSearchQuery('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <Input
      size={size}
      placeholder={placeholder}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      startContent={<SearchIcon className="w-4 h-4 text-foreground-400" aria-hidden="true" />}
      aria-label={placeholder}
      endContent={
        isClearable && searchQuery ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-foreground-400 hover:text-foreground-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null
      }
      className={className}
    />
  );
};