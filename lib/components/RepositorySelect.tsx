import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { searchRepositories, clearSearchResults } from '@/lib/store/slices/githubSlice';
import { Input } from '@/lib/components/ui/input';
import { Badge } from '@/lib/components/ui/badge';
import { Search, Loader2, Lock, Unlock } from 'lucide-react';

interface RepositorySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function RepositorySelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Search your repositories...",
  className = ""
}: RepositorySelectProps) {
  const dispatch = useAppDispatch();
  const { searchResults, loading } = useAppSelector((state) => state.github);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.length >= 2) {
      const timeout = setTimeout(() => {
        dispatch(searchRepositories({ query: `user:@me ${query}` }));
        setShowDropdown(true);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      dispatch(clearSearchResults());
      setShowDropdown(false);
    }
  };

  const handleSelectRepo = (repoFullName: string) => {
    onChange(repoFullName);
    setSearchQuery('');
    setShowDropdown(false);
    dispatch(clearSearchResults());
  };

  const handleInputChange = (inputValue: string) => {
    if (value && !searchQuery) {
      // If there's a selected value and user starts typing, clear it
      onChange('');
    }
    handleSearch(inputValue);
  };

  const handleFocus = () => {
    if (searchResults?.items.length) {
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => setShowDropdown(false), 200);
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const displayValue = searchQuery || value;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className="pl-10"
        />
        {loading.search && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && searchResults && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.items.length > 0 ? (
            searchResults.items.slice(0, 10).map((repo) => (
              <div
                key={repo.id}
                className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                onClick={() => handleSelectRepo(repo.full_name)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {repo.private ? (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Unlock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <p className="font-medium truncate">{repo.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{repo.full_name}</p>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">{repo.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {repo.private && (
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                  )}
                  {repo.language && (
                    <Badge variant="outline" className="text-xs">{repo.language}</Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No repositories found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Selected Repository Display */}
      {value && !searchQuery && (
        <div className="mt-1 text-sm text-muted-foreground">
          Selected: <span className="font-medium">{value}</span>
        </div>
      )}
    </div>
  );
}
