import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { useGetAllCustomAttributeKeys, useGetAttributeValuesForKey, useSearchNodesByAttribute } from '../hooks/useQueries';
import type { SearchResult } from '../backend';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: attributeKeys = [], isLoading: keysLoading } = useGetAllCustomAttributeKeys();
  const { data: attributeValues = [], isLoading: valuesLoading } = useGetAttributeValuesForKey(selectedKey);
  const { mutate: searchNodes, isPending: searchPending } = useSearchNodesByAttribute();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedKey('');
      setSelectedValue('');
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [open]);

  // Reset selected value when key changes
  useEffect(() => {
    setSelectedValue('');
  }, [selectedKey]);

  const handleSearch = () => {
    if (!selectedKey || !selectedValue) {
      return;
    }

    setHasSearched(true);
    searchNodes(
      { key: selectedKey, value: selectedValue },
      {
        onSuccess: (results) => {
          setSearchResults(results);
        },
        onError: (error) => {
          console.error('Search error:', error);
          setSearchResults([]);
        },
      }
    );
  };

  const handleResultClick = (result: SearchResult) => {
    // For now, just log the result. In a full implementation, this would navigate to the node
    console.log('Selected node:', result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Nodes by Custom Attributes</DialogTitle>
          <DialogDescription>
            Search for nodes (Locations and Interpretation Tokens) by their custom attribute key-value pairs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-shrink-0">
          <div className="space-y-2">
            <Label htmlFor="attribute-key">Keys</Label>
            {keysLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : attributeKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No custom attributes found. Create locations or interpretation tokens with custom attributes first.
              </p>
            ) : (
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger id="attribute-key">
                  <SelectValue placeholder="Select an attribute key" />
                </SelectTrigger>
                <SelectContent>
                  {attributeKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="attribute-value">Values</Label>
            {!selectedKey ? (
              <p className="text-sm text-muted-foreground py-2">
                Select a key first to see available values.
              </p>
            ) : valuesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : attributeValues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No values found for the selected key.
              </p>
            ) : (
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger id="attribute-value">
                  <SelectValue placeholder="Select an attribute value" />
                </SelectTrigger>
                <SelectContent>
                  {attributeValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={handleSearch}
            disabled={!selectedKey || !selectedValue || searchPending}
            className="w-full"
          >
            {searchPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {hasSearched && (
          <div className="flex-1 min-h-0 mt-4">
            <div className="mb-2">
              <h3 className="text-sm font-medium">
                Search Results ({searchResults.length})
              </h3>
            </div>
            <ScrollArea className="h-full border rounded-md">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No nodes found matching the search criteria.</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-3 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.name}</div>
                          {result.parentContext && (
                            <div className="text-sm text-muted-foreground truncate">
                              {result.parentContext}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
                            {result.nodeType}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
