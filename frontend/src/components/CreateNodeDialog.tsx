import { useState, useEffect } from 'react';
import {
  useCreateCuration,
  useCreateSwarm,
  useCreateLocation,
  useCreateInterpretationToken,
  useGetGraphData,
} from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Info, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { NodeId, CustomAttribute } from '../backend';

type NodeType = 'curation' | 'swarm' | 'location' | 'interpretationToken';

interface CreateNodeDialogProps {
  trigger?: React.ReactNode;
  defaultNodeType?: NodeType;
  defaultParentId?: NodeId;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ISO 3166-1 alpha-3 country codes
const ISO_COUNTRY_CODES = [
  'ABW', 'AFG', 'AGO', 'AIA', 'ALA', 'ALB', 'AND', 'ARE', 'ARG', 'ARM', 'ASM', 'ATA', 'ATF', 'ATG', 'AUS', 'AUT', 'AZE',
  'BDI', 'BEL', 'BEN', 'BES', 'BFA', 'BGD', 'BGR', 'BHR', 'BHS', 'BIH', 'BLM', 'BLR', 'BLZ', 'BMU', 'BOL', 'BRA', 'BRB', 'BRN', 'BTN', 'BVT', 'BWA',
  'CAF', 'CAN', 'CCK', 'CHE', 'CHL', 'CHN', 'CIV', 'CMR', 'COD', 'COG', 'COK', 'COL', 'COM', 'CPV', 'CRI', 'CUB', 'CUW', 'CXR', 'CYM', 'CYP', 'CZE',
  'DEU', 'DJI', 'DMA', 'DNK', 'DOM', 'DZA',
  'ECU', 'EGY', 'ERI', 'ESH', 'ESP', 'EST', 'ETH',
  'FIN', 'FJI', 'FLK', 'FRA', 'FRO', 'FSM',
  'GAB', 'GBR', 'GEO', 'GGY', 'GHA', 'GIB', 'GIN', 'GLP', 'GMB', 'GNB', 'GNQ', 'GRC', 'GRD', 'GRL', 'GTM', 'GUF', 'GUM', 'GUY',
  'HKG', 'HMD', 'HND', 'HRV', 'HTI', 'HUN',
  'IDN', 'IMN', 'IND', 'IOT', 'IRL', 'IRN', 'IRQ', 'ISL', 'ISR', 'ITA',
  'JAM', 'JEY', 'JOR', 'JPN',
  'KAZ', 'KEN', 'KGZ', 'KHM', 'KIR', 'KNA', 'KOR', 'KWT',
  'LAO', 'LBN', 'LBR', 'LBY', 'LCA', 'LIE', 'LKA', 'LSO', 'LTU', 'LUX', 'LVA',
  'MAC', 'MAF', 'MAR', 'MCO', 'MDA', 'MDG', 'MDV', 'MEX', 'MHL', 'MKD', 'MLI', 'MLT', 'MMR', 'MNE', 'MNG', 'MNP', 'MOZ', 'MRT', 'MSR', 'MTQ', 'MUS', 'MWI', 'MYS', 'MYT',
  'NAM', 'NCL', 'NER', 'NFK', 'NGA', 'NIC', 'NIU', 'NLD', 'NOR', 'NPL', 'NRU', 'NZL',
  'OMN',
  'PAK', 'PAN', 'PCN', 'PER', 'PHL', 'PLW', 'PNG', 'POL', 'PRI', 'PRK', 'PRT', 'PRY', 'PSE', 'PYF',
  'QAT',
  'REU', 'ROU', 'RUS', 'RWA',
  'SAU', 'SDN', 'SEN', 'SGP', 'SGS', 'SHN', 'SJM', 'SLB', 'SLE', 'SLV', 'SMR', 'SOM', 'SPM', 'SRB', 'SSD', 'STP', 'SUR', 'SVK', 'SVN', 'SWE', 'SWZ', 'SXM', 'SYC', 'SYR',
  'TCA', 'TCD', 'TGO', 'THA', 'TJK', 'TKL', 'TKM', 'TLS', 'TON', 'TTO', 'TUN', 'TUR', 'TUV', 'TWN', 'TZA',
  'UGA', 'UKR', 'UMI', 'URY', 'USA', 'UZB',
  'VAT', 'VCT', 'VEN', 'VGB', 'VIR', 'VNM', 'VUT',
  'WLF', 'WSM',
  'YEM',
  'ZAF', 'ZMB', 'ZWE'
];

export default function CreateNodeDialog({
  trigger,
  defaultNodeType,
  defaultParentId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateNodeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [nodeType, setNodeType] = useState<NodeType>(defaultNodeType || 'curation');
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [tags, setTags] = useState('');
  const [jurisdiction, setJurisdiction] = useState('IND');
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([
    { key: '', value: '' },
  ]);
  const [parentId, setParentId] = useState<NodeId>(defaultParentId || '');
  const [fromRelationType, setFromRelationType] = useState('');
  const [toNodeId, setToNodeId] = useState<NodeId>('');
  const [toRelationType, setToRelationType] = useState('');

  const { data: graphData } = useGetGraphData();
  const createCuration = useCreateCuration();
  const createSwarm = useCreateSwarm();
  const createLocation = useCreateLocation();
  const createInterpretationToken = useCreateInterpretationToken();

  const isPending =
    createCuration.isPending ||
    createSwarm.isPending ||
    createLocation.isPending ||
    createInterpretationToken.isPending;

  // Determine if dialog is controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  // Update nodeType and parentId when defaults change
  useEffect(() => {
    if (defaultNodeType) {
      setNodeType(defaultNodeType);
    }
  }, [defaultNodeType]);

  useEffect(() => {
    if (defaultParentId) {
      setParentId(defaultParentId);
    }
  }, [defaultParentId]);

  const resetForm = () => {
    setName('');
    setContext('');
    setTags('');
    setJurisdiction('IND');
    setCustomAttributes([{ key: '', value: '' }]);
    if (!defaultParentId) {
      setParentId('');
    }
    setFromRelationType('');
    setToNodeId('');
    setToRelationType('');
  };

  const handleAddAttribute = () => {
    setCustomAttributes([...customAttributes, { key: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    if (customAttributes.length > 1) {
      setCustomAttributes(customAttributes.filter((_, i) => i !== index));
    }
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customAttributes];
    updated[index][field] = value;
    setCustomAttributes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name/title');
      return;
    }

    try {
      switch (nodeType) {
        case 'curation':
          await createCuration.mutateAsync({
            name: name.trim(),
            jurisdiction: jurisdiction,
          });
          toast.success('Curation created successfully!');
          break;

        case 'swarm':
          if (!parentId) {
            toast.error('Please select a parent curation');
            return;
          }
          // Parse comma-separated tags
          const parsedTags = tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
          
          await createSwarm.mutateAsync({
            name: name.trim(),
            tags: parsedTags,
            parentCurationId: parentId,
          });
          toast.success('Swarm created successfully!');
          break;

        case 'location':
          if (!parentId) {
            toast.error('Please select a parent swarm');
            return;
          }
          // Filter out empty attributes
          const validAttributes = customAttributes.filter(
            (attr) => attr.key.trim() !== '' || attr.value.trim() !== ''
          );
          
          await createLocation.mutateAsync({
            title: name.trim(),
            content: context.trim(),
            customAttributes: validAttributes,
            parentSwarmId: parentId,
          });
          toast.success('Location created successfully! Law tokens have been auto-extracted.');
          break;

        case 'interpretationToken':
          if (!parentId) {
            toast.error('Please select a from law token');
            return;
          }
          if (!fromRelationType.trim()) {
            toast.error('Please enter a from relationship type');
            return;
          }
          if (!toNodeId) {
            toast.error('Please select a to node');
            return;
          }
          if (!toRelationType.trim()) {
            toast.error('Please enter a to relationship type');
            return;
          }
          // Filter out empty attributes
          const validInterpretationAttributes = customAttributes.filter(
            (attr) => attr.key.trim() !== '' || attr.value.trim() !== ''
          );
          
          await createInterpretationToken.mutateAsync({
            title: name.trim(),
            context: context.trim(),
            fromLawTokenId: parentId,
            fromRelationshipType: fromRelationType.trim(),
            toNodeId: toNodeId,
            toRelationshipType: toRelationType.trim(),
            customAttributes: validInterpretationAttributes,
          });
          toast.success('Interpretation token created successfully!');
          break;
      }

      resetForm();
      setOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Only swarm creator or approved members')) {
        toast.error('You must be the swarm creator or an approved member to create this node');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('You do not have permission to perform this action');
      } else if (errorMessage.includes('trap')) {
        toast.error(`Failed to create ${nodeType}. Please check your input and try again.`);
      } else if (errorMessage.includes('Parent') && errorMessage.includes('does not exist')) {
        toast.error('The selected parent node no longer exists. Please refresh and try again.');
      } else {
        toast.error(`Failed to create ${nodeType}: ${errorMessage}`);
      }
      
      console.error(`Error creating ${nodeType}:`, error);
    }
  };

  const getParentOptions = () => {
    if (!graphData) return [];

    switch (nodeType) {
      case 'swarm':
        return graphData.curations.map((c) => ({ id: c.id, label: c.name }));
      case 'location':
        return graphData.swarms.map((s) => ({ id: s.id, label: s.name }));
      case 'interpretationToken':
        return graphData.lawTokens.map((t) => ({ id: t.id, label: t.tokenLabel }));
      default:
        return [];
    }
  };

  // Get available nodes for "To Node" selection (all nodes from user's member swarms)
  const getToNodeOptions = () => {
    if (!graphData) return [];

    const allNodes: Array<{ id: NodeId; label: string; type: string }> = [];

    // Add all curations
    graphData.curations.forEach((c) => {
      allNodes.push({ id: c.id, label: `${c.name} (Curation)`, type: 'curation' });
    });

    // Add all swarms
    graphData.swarms.forEach((s) => {
      allNodes.push({ id: s.id, label: `${s.name} (Swarm)`, type: 'swarm' });
    });

    // Add all locations
    graphData.locations.forEach((l) => {
      allNodes.push({ id: l.id, label: `${l.title} (Location)`, type: 'location' });
    });

    // Add all law tokens
    graphData.lawTokens.forEach((t) => {
      allNodes.push({ id: t.id, label: `${t.tokenLabel} (Law Token)`, type: 'lawToken' });
    });

    // Add all interpretation tokens
    graphData.interpretationTokens.forEach((i) => {
      allNodes.push({ id: i.id, label: `${i.title} (Interpretation Token)`, type: 'interpretationToken' });
    });

    return allNodes;
  };

  const parentOptions = getParentOptions();
  const toNodeOptions = getToNodeOptions();
  const needsParent = nodeType !== 'curation';

  const getParentLabel = () => {
    switch (nodeType) {
      case 'swarm':
        return 'Curation';
      case 'location':
        return 'Swarm';
      case 'interpretationToken':
        return 'From Law Token';
      default:
        return 'Parent';
    }
  };

  const getPermissionInfo = () => {
    switch (nodeType) {
      case 'curation':
        return 'Any authenticated user can create curations';
      case 'swarm':
        return 'Any authenticated user can create swarms under any curation';
      case 'location':
        return 'Only swarm creators and approved members can create locations';
      case 'interpretationToken':
        return 'Only swarm creators and approved members can create interpretation tokens';
      default:
        return '';
    }
  };

  const getNodeTypeDescription = () => {
    switch (nodeType) {
      case 'curation':
        return 'A curation is an area of law, e.g. Indian Arbitration Law, UK Banking Law etc.';
      case 'swarm':
        return 'A swarm is a research topic, a container for annotations and a collaborative space, all rolled into one. For example: key definitions, important caselaws, rights and duties etc.';
      case 'location':
        return null; // Location has two separate descriptions shown in different places
      case 'interpretationToken':
        return null;
      default:
        return '';
    }
  };

  // Build current path showing parent hierarchy
  const getCurrentPath = (): string[] => {
    if (!graphData || !parentId) return [];

    const path: string[] = [];

    switch (nodeType) {
      case 'swarm': {
        // Path: Curation
        const curation = graphData.curations.find(c => c.id === parentId);
        if (curation) path.push(curation.name);
        break;
      }
      case 'location': {
        // Path: Curation → Swarm
        const swarm = graphData.swarms.find(s => s.id === parentId);
        if (swarm) {
          const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
          if (curation) path.push(curation.name);
          path.push(swarm.name);
        }
        break;
      }
      case 'interpretationToken': {
        // Path: Curation → Swarm → Location → Law Token
        const lawToken = graphData.lawTokens.find(t => t.id === parentId);
        if (lawToken) {
          const location = graphData.locations.find(l => l.id === lawToken.parentLocationId);
          if (location) {
            const swarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
            if (swarm) {
              const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
              if (curation) path.push(curation.name);
              path.push(swarm.name);
            }
            path.push(location.title);
          }
          path.push(lawToken.tokenLabel);
        }
        break;
      }
    }

    return path;
  };

  const currentPath = getCurrentPath();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Node
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Node</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nodeType">Node Type</Label>
            <Select
              value={nodeType}
              onValueChange={(value) => {
                setNodeType(value as NodeType);
                if (!defaultParentId) {
                  setParentId('');
                }
                setFromRelationType('');
                setToNodeId('');
                setToRelationType('');
              }}
              disabled={!!defaultNodeType || isPending}
            >
              <SelectTrigger id="nodeType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="curation">Curation (Top Level)</SelectItem>
                <SelectItem value="swarm">Swarm</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="interpretationToken">Interpretation Token</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{getPermissionInfo()}</p>
            </div>
          </div>

          {needsParent && (
            <div className="space-y-2">
              <Label htmlFor="parent">{getParentLabel()}</Label>
              <Select value={parentId} onValueChange={setParentId} disabled={!!defaultParentId || isPending}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select parent..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No parent nodes available
                    </div>
                  ) : (
                    parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeType === 'interpretationToken' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fromRelationType">From Relationship Type</Label>
                <Input
                  id="fromRelationType"
                  placeholder="e.g., defines, exemplifies, contradicts..."
                  value={fromRelationType}
                  onChange={(e) => setFromRelationType(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Describe how this interpretation relates to the law token
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toNode">To Node</Label>
                <Select value={toNodeId} onValueChange={setToNodeId} disabled={isPending}>
                  <SelectTrigger id="toNode">
                    <SelectValue placeholder="Select target node..." />
                  </SelectTrigger>
                  <SelectContent>
                    {toNodeOptions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No nodes available
                      </div>
                    ) : (
                      toNodeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select any node from swarms you are a member of
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toRelationType">To Relationship Type</Label>
                <Input
                  id="toRelationType"
                  placeholder="e.g., references, applies to, extends..."
                  value={toRelationType}
                  onChange={(e) => setToRelationType(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Describe how this interpretation relates to the target node
                </p>
              </div>
            </>
          )}

          {currentPath.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current Path</Label>
              <div className="text-sm font-mono text-foreground bg-muted/30 p-2 rounded border border-border">
                {currentPath.join(' → ')}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              {nodeType === 'location' || nodeType === 'interpretationToken' ? 'Title' : 'Name'}
            </Label>
            <Input
              id="name"
              placeholder={`Enter ${nodeType === 'location' || nodeType === 'interpretationToken' ? 'title' : 'name'}...`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
            {getNodeTypeDescription() && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{getNodeTypeDescription()}</p>
              </div>
            )}
          </div>

          {nodeType === 'curation' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="jurisdictionKey" className="text-muted-foreground">
                    Attribute Key
                  </Label>
                  <Input
                    id="jurisdictionKey"
                    value="Jurisdiction"
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="jurisdiction">Attribute Value</Label>
                  <Select value={jurisdiction} onValueChange={setJurisdiction} disabled={isPending}>
                    <SelectTrigger id="jurisdiction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {ISO_COUNTRY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the jurisdiction (ISO 3166-1 alpha-3 country code)
              </p>
            </div>
          )}

          {nodeType === 'swarm' && (
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Add tags to help others discover this swarm
              </p>
            </div>
          )}

          {(nodeType === 'location' || nodeType === 'interpretationToken') && (
            <div className="space-y-2">
              <Label htmlFor="context">
                {nodeType === 'location' ? 'Content' : 'Context'}
              </Label>
              <Textarea
                id="context"
                placeholder={`Enter ${nodeType === 'location' ? 'content' : 'context'}...`}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={isPending}
                rows={4}
              />
              {nodeType === 'location' && (
                <>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Each location points to a particular chunk of positive law. For example: sec 123 of act ABC, para 456 of case XYZ.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Wrap the positive law text in curly brackets to generate specific tokens. For example: {'{appropriate authority}'}{'{means}'}{'{the State Government}'}{'{or}'}..
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {(nodeType === 'location' || nodeType === 'interpretationToken') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attributes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddAttribute}
                  disabled={isPending}
                  className="h-8 px-2 hover:bg-accent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {customAttributes.map((attr, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Key"
                      value={attr.key}
                      onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                      disabled={isPending}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      disabled={isPending}
                      className="flex-1"
                    />
                    {customAttributes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttribute(index)}
                        disabled={isPending}
                        className="h-10 px-2 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Add custom key-value pairs for additional metadata
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="flex-1 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending} 
              className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
