import { useState, useEffect, useRef } from 'react';
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
import { Plus, Info, X, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { NodeId, CustomAttribute } from '../backend';
import { Directionality } from '../backend';
import { ScrollArea } from '@/components/ui/scroll-area';

type NodeType = 'curation' | 'swarm' | 'location' | 'interpretationToken';

interface CreateNodeDialogProps {
  trigger?: React.ReactNode;
  defaultNodeType?: NodeType;
  defaultParentId?: NodeId;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Define proper types for options
interface SimpleOption {
  id: NodeId;
  label: string;
}

interface ExtendedOption {
  id: NodeId;
  label: string;
  type: string;
  path: string;
  name: string;
}

type ParentOption = SimpleOption | ExtendedOption;

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

// Helper function to check if option is extended
function isExtendedOption(option: ParentOption): option is ExtendedOption {
  return 'name' in option && 'path' in option && 'type' in option;
}

// Helper function to extract node name
function getNodeName(option: ParentOption): string {
  if (isExtendedOption(option)) {
    return option.name;
  }
  return option.label;
}

// Helper function to get node path
function getNodePath(option: ParentOption): string {
  if (isExtendedOption(option)) {
    return option.path;
  }
  return '';
}

// Helper function to get node type label
function getNodeTypeLabel(type: string): string {
  switch (type) {
    case 'location':
      return 'Location';
    case 'lawToken':
      return 'Law Token';
    case 'interpretationToken':
      return 'Int. Token';
    default:
      return type;
  }
}

// Helper to extract law token sequence from content (text inside curly braces)
function extractLawTokenSequence(content: string): string {
  const matches = content.match(/\{[^}]+\}/g);
  return matches ? matches.join('') : '';
}

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
  const [fromDirectionality, setFromDirectionality] = useState<Directionality>(Directionality.unidirectional);
  const [toNodeId, setToNodeId] = useState<NodeId>('');
  const [toRelationType, setToRelationType] = useState('');
  const [toDirectionality, setToDirectionality] = useState<Directionality>(Directionality.unidirectional);

  // Direct typing states for From Token
  const [fromTokenInput, setFromTokenInput] = useState('');
  const [fromTokenDropdownOpen, setFromTokenDropdownOpen] = useState(false);
  const [fromTokenSelectedIndex, setFromTokenSelectedIndex] = useState(-1);
  const fromTokenInputRef = useRef<HTMLInputElement>(null);

  // Direct typing states for To Node
  const [toNodeInput, setToNodeInput] = useState('');
  const [toNodeDropdownOpen, setToNodeDropdownOpen] = useState(false);
  const [toNodeSelectedIndex, setToNodeSelectedIndex] = useState(-1);
  const toNodeInputRef = useRef<HTMLInputElement>(null);

  // Direct typing states for From Relationship Type
  const [fromRelationTypeDropdownOpen, setFromRelationTypeDropdownOpen] = useState(false);
  const [fromRelationTypeSelectedIndex, setFromRelationTypeSelectedIndex] = useState(-1);
  const fromRelationTypeInputRef = useRef<HTMLInputElement>(null);

  // Direct typing states for To Relationship Type
  const [toRelationTypeDropdownOpen, setToRelationTypeDropdownOpen] = useState(false);
  const [toRelationTypeSelectedIndex, setToRelationTypeSelectedIndex] = useState(-1);
  const toRelationTypeInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to build hierarchical path for a node
  const buildNodePath = (nodeId: string): string => {
    if (!graphData) return '';

    const pathParts: string[] = [];

    const curation = graphData.curations.find(c => c.id === nodeId);
    if (curation) {
      return '';
    }

    const swarm = graphData.swarms.find(s => s.id === nodeId);
    if (swarm) {
      const parentCuration = graphData.curations.find(c => c.id === swarm.parentCurationId);
      if (parentCuration) pathParts.push(parentCuration.name);
      return pathParts.join('/');
    }

    const location = graphData.locations.find(l => l.id === nodeId);
    if (location) {
      const parentSwarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
      if (parentSwarm) {
        const parentCuration = graphData.curations.find(c => c.id === parentSwarm.parentCurationId);
        if (parentCuration) pathParts.push(parentCuration.name);
        pathParts.push(parentSwarm.name);
      }
      return pathParts.join('/');
    }

    const lawToken = graphData.lawTokens.find(t => t.id === nodeId);
    if (lawToken) {
      const parentLocation = graphData.locations.find(l => l.id === lawToken.parentLocationId);
      if (parentLocation) {
        const parentSwarm = graphData.swarms.find(s => s.id === parentLocation.parentSwarmId);
        if (parentSwarm) {
          const parentCuration = graphData.curations.find(c => c.id === parentSwarm.parentCurationId);
          if (parentCuration) pathParts.push(parentCuration.name);
          pathParts.push(parentSwarm.name);
        }
        pathParts.push(parentLocation.title);
      }
      return pathParts.join('/');
    }

    const interpretationToken = graphData.interpretationTokens.find(i => i.id === nodeId);
    if (interpretationToken) {
      const buildFromToken = (tokenId: string): void => {
        const originLocation = graphData.locations.find(l => l.id === tokenId);
        if (originLocation) {
          const parentSwarm = graphData.swarms.find(s => s.id === originLocation.parentSwarmId);
          if (parentSwarm) {
            const parentCuration = graphData.curations.find(c => c.id === parentSwarm.parentCurationId);
            if (parentCuration) pathParts.push(parentCuration.name);
            pathParts.push(parentSwarm.name);
          }
          pathParts.push(originLocation.title);
        } else {
          const originLawToken = graphData.lawTokens.find(t => t.id === tokenId);
          if (originLawToken) {
            const parentLocation = graphData.locations.find(l => l.id === originLawToken.parentLocationId);
            if (parentLocation) {
              const parentSwarm = graphData.swarms.find(s => s.id === parentLocation.parentSwarmId);
              if (parentSwarm) {
                const parentCuration = graphData.curations.find(c => c.id === parentSwarm.parentCurationId);
                if (parentCuration) pathParts.push(parentCuration.name);
                pathParts.push(parentSwarm.name);
              }
              pathParts.push(parentLocation.title);
            }
            pathParts.push(originLawToken.tokenLabel);
          } else {
            const originInterpretationToken = graphData.interpretationTokens.find(i => i.id === tokenId);
            if (originInterpretationToken) {
              buildFromToken(originInterpretationToken.fromTokenId);
              pathParts.push(originInterpretationToken.title);
            }
          }
        }
      };
      buildFromToken(interpretationToken.fromTokenId);
      return pathParts.join('/');
    }

    return '';
  };

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
    setFromDirectionality(Directionality.unidirectional);
    setToNodeId('');
    setToRelationType('');
    setToDirectionality(Directionality.unidirectional);
    setFromTokenInput('');
    setToNodeInput('');
    setFromTokenDropdownOpen(false);
    setToNodeDropdownOpen(false);
    setFromTokenSelectedIndex(-1);
    setToNodeSelectedIndex(-1);
    setFromRelationTypeDropdownOpen(false);
    setToRelationTypeDropdownOpen(false);
    setFromRelationTypeSelectedIndex(-1);
    setToRelationTypeSelectedIndex(-1);
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
          const validAttributes = customAttributes.filter(
            (attr) => attr.key.trim() !== '' || attr.value.trim() !== ''
          );
          const contentTrimmed = context.trim();
          const originalTokenSequence = extractLawTokenSequence(contentTrimmed);

          await createLocation.mutateAsync({
            title: name.trim(),
            content: contentTrimmed,
            originalTokenSequence,
            customAttributes: validAttributes,
            parentSwarmId: parentId,
          });
          toast.success('Location created successfully! Law tokens have been auto-extracted.');
          break;

        case 'interpretationToken':
          if (!parentId) {
            toast.error('Please select a from token');
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
          if (parentId === toNodeId) {
            toast.error('From and To nodes must be different');
            return;
          }
          if (!toRelationType.trim()) {
            toast.error('Please enter a to relationship type');
            return;
          }
          const validInterpretationAttributes = customAttributes.filter(
            (attr) => attr.key.trim() !== '' || attr.value.trim() !== ''
          );

          await createInterpretationToken.mutateAsync({
            title: name.trim(),
            context: context.trim(),
            fromTokenId: parentId,
            fromRelationshipType: fromRelationType.trim(),
            fromDirectionality: fromDirectionality,
            toNodeId: toNodeId,
            toRelationshipType: toRelationType.trim(),
            toDirectionality: toDirectionality,
            customAttributes: validInterpretationAttributes,
          });
          toast.success('Interpretation token created successfully!');
          break;
      }

      resetForm();
      setOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Only swarm creator or approved members')) {
        toast.error('You must be the swarm creator or an approved member to create this node');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('You do not have permission to perform this action');
      } else if (errorMessage.includes('Invalid from node')) {
        toast.error('Invalid from node selection. Only Locations, Law Tokens, and Interpretation Tokens are allowed.');
      } else if (errorMessage.includes('Invalid to node')) {
        toast.error('Invalid to node selection. Only Locations, Law Tokens, and Interpretation Tokens are allowed.');
      } else if (errorMessage.includes('trap')) {
        toast.error(`Failed to create ${nodeType}. Please check your input and try again.`);
      } else if (errorMessage.includes('Parent') && errorMessage.includes('does not exist')) {
        toast.error('The selected parent node no longer exists. Please refresh and try again.');
      } else if (errorMessage.includes('From and To nodes must be different')) {
        toast.error('From and To nodes must be different');
      } else {
        toast.error(`Failed to create ${nodeType}: ${errorMessage}`);
      }

      console.error(`Error creating ${nodeType}:`, error);
    }
  };

  const getParentOptions = (): ParentOption[] => {
    if (!graphData) return [];

    switch (nodeType) {
      case 'swarm':
        return graphData.curations.map((c): SimpleOption => ({ id: c.id, label: c.name }));
      case 'location':
        return graphData.swarms.map((s): SimpleOption => ({ id: s.id, label: s.name }));
      case 'interpretationToken': {
        const options: ExtendedOption[] = [];

        graphData.locations.forEach((l) => {
          const path = buildNodePath(l.id);
          options.push({
            id: l.id,
            label: l.title,
            type: 'location',
            path,
            name: l.title
          });
        });

        graphData.lawTokens.forEach((t) => {
          const path = buildNodePath(t.id);
          options.push({
            id: t.id,
            label: t.tokenLabel,
            type: 'lawToken',
            path,
            name: t.tokenLabel
          });
        });

        graphData.interpretationTokens.forEach((t) => {
          const path = buildNodePath(t.id);
          options.push({
            id: t.id,
            label: t.title,
            type: 'interpretationToken',
            path,
            name: t.title
          });
        });

        return options;
      }
      default:
        return [];
    }
  };

  const getToNodeOptions = (): ExtendedOption[] => {
    if (!graphData) return [];

    const options: ExtendedOption[] = [];

    graphData.locations.forEach((l) => {
      const path = buildNodePath(l.id);
      options.push({
        id: l.id,
        label: l.title,
        type: 'location',
        path,
        name: l.title
      });
    });

    graphData.lawTokens.forEach((t) => {
      const path = buildNodePath(t.id);
      options.push({
        id: t.id,
        label: t.tokenLabel,
        type: 'lawToken',
        path,
        name: t.tokenLabel
      });
    });

    graphData.interpretationTokens.forEach((t) => {
      const path = buildNodePath(t.id);
      options.push({
        id: t.id,
        label: t.title,
        type: 'interpretationToken',
        path,
        name: t.title
      });
    });

    return options;
  };

  const parentOptions = getParentOptions();
  const toNodeOptions = getToNodeOptions();

  // Relationship type suggestions
  const relationshipTypeSuggestions = [
    'isA', 'partOf', 'relatedTo', 'causes', 'enables', 'requires',
    'contradicts', 'supports', 'defines', 'extends', 'implements',
    'hasProperty', 'hasValue', 'hasContext', 'appliesTo', 'derivedFrom'
  ];

  // Filter from token options based on input
  const filteredFromOptions = parentOptions.filter(option => {
    const name = getNodeName(option).toLowerCase();
    return name.includes(fromTokenInput.toLowerCase());
  });

  // Filter to node options based on input
  const filteredToOptions = toNodeOptions.filter(option => {
    const name = getNodeName(option).toLowerCase();
    return name.includes(toNodeInput.toLowerCase());
  });

  // Filter relationship type suggestions
  const filteredFromRelationSuggestions = relationshipTypeSuggestions.filter(s =>
    s.toLowerCase().includes(fromRelationType.toLowerCase())
  );

  const filteredToRelationSuggestions = relationshipTypeSuggestions.filter(s =>
    s.toLowerCase().includes(toRelationType.toLowerCase())
  );

  const handleFromTokenKeyDown = (e: React.KeyboardEvent) => {
    if (!fromTokenDropdownOpen || filteredFromOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFromTokenSelectedIndex(prev => Math.min(prev + 1, filteredFromOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFromTokenSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && fromTokenSelectedIndex >= 0) {
      e.preventDefault();
      const selected = filteredFromOptions[fromTokenSelectedIndex];
      setParentId(selected.id);
      setFromTokenInput(getNodeName(selected));
      setFromTokenDropdownOpen(false);
      setFromTokenSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setFromTokenDropdownOpen(false);
    }
  };

  const handleToNodeKeyDown = (e: React.KeyboardEvent) => {
    if (!toNodeDropdownOpen || filteredToOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setToNodeSelectedIndex(prev => Math.min(prev + 1, filteredToOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setToNodeSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && toNodeSelectedIndex >= 0) {
      e.preventDefault();
      const selected = filteredToOptions[toNodeSelectedIndex];
      setToNodeId(selected.id);
      setToNodeInput(getNodeName(selected));
      setToNodeDropdownOpen(false);
      setToNodeSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setToNodeDropdownOpen(false);
    }
  };

  const handleFromRelationTypeKeyDown = (e: React.KeyboardEvent) => {
    if (!fromRelationTypeDropdownOpen || filteredFromRelationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFromRelationTypeSelectedIndex(prev => Math.min(prev + 1, filteredFromRelationSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFromRelationTypeSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && fromRelationTypeSelectedIndex >= 0) {
      e.preventDefault();
      setFromRelationType(filteredFromRelationSuggestions[fromRelationTypeSelectedIndex]);
      setFromRelationTypeDropdownOpen(false);
      setFromRelationTypeSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setFromRelationTypeDropdownOpen(false);
    }
  };

  const handleToRelationTypeKeyDown = (e: React.KeyboardEvent) => {
    if (!toRelationTypeDropdownOpen || filteredToRelationSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setToRelationTypeSelectedIndex(prev => Math.min(prev + 1, filteredToRelationSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setToRelationTypeSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && toRelationTypeSelectedIndex >= 0) {
      e.preventDefault();
      setToRelationType(filteredToRelationSuggestions[toRelationTypeSelectedIndex]);
      setToRelationTypeDropdownOpen(false);
      setToRelationTypeSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setToRelationTypeDropdownOpen(false);
    }
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-background border border-border">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>Create New Node</DialogTitle>
      </DialogHeader>

      <ScrollArea className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
          {/* Node Type Selection */}
          <div className="space-y-2">
            <Label>Node Type</Label>
            <Select
              value={nodeType}
              onValueChange={(value) => {
                setNodeType(value as NodeType);
                setParentId(defaultParentId || '');
                setFromTokenInput('');
                setToNodeInput('');
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="curation">Curation</SelectItem>
                <SelectItem value="swarm">Swarm</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="interpretationToken">Interpretation Token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name/Title Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {nodeType === 'location' ? 'Title' : nodeType === 'interpretationToken' ? 'Title' : 'Name'}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${nodeType === 'location' || nodeType === 'interpretationToken' ? 'title' : 'name'}...`}
              className="bg-background border-border"
            />
          </div>

          {/* Jurisdiction (Curation only) */}
          {nodeType === 'curation' && (
            <div className="space-y-2">
              <Label>Jurisdiction (ISO 3166-1 alpha-3)</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  {ISO_COUNTRY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags (Swarm only) */}
          {nodeType === 'swarm' && (
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. legal, finance, tech"
                className="bg-background border-border"
              />
            </div>
          )}

          {/* Context/Content (Location and InterpretationToken) */}
          {(nodeType === 'location' || nodeType === 'interpretationToken') && (
            <div className="space-y-2">
              <Label htmlFor="context">
                {nodeType === 'location' ? (
                  <span className="flex items-center gap-1">
                    Content
                    <span title="Wrap law tokens in curly braces: {token}">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </span>
                ) : 'Context'}
              </Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={
                  nodeType === 'location'
                    ? 'Enter content... Wrap law tokens in {curly braces}'
                    : 'Enter context or description...'
                }
                rows={4}
                className="bg-background border-border"
              />
              {nodeType === 'location' && (
                <p className="text-xs text-muted-foreground">
                  Law tokens will be auto-extracted from text wrapped in {'{'} {'}'} braces.
                </p>
              )}
            </div>
          )}

          {/* Parent Selection (Swarm → Curation, Location → Swarm) */}
          {(nodeType === 'swarm' || nodeType === 'location') && (
            <div className="space-y-2">
              <Label>
                {nodeType === 'swarm' ? 'Parent Curation' : 'Parent Swarm'}
              </Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={`Select ${nodeType === 'swarm' ? 'curation' : 'swarm'}...`} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Interpretation Token Fields */}
          {nodeType === 'interpretationToken' && (
            <>
              {/* From Token */}
              <div className="space-y-2">
                <Label>From Node</Label>
                <div className="relative">
                  <Input
                    ref={fromTokenInputRef}
                    value={fromTokenInput}
                    onChange={(e) => {
                      setFromTokenInput(e.target.value);
                      setFromTokenDropdownOpen(true);
                      setFromTokenSelectedIndex(-1);
                      if (!e.target.value) setParentId('');
                    }}
                    onFocus={() => setFromTokenDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setFromTokenDropdownOpen(false), 150)}
                    onKeyDown={handleFromTokenKeyDown}
                    placeholder="Search locations, law tokens, interpretation tokens..."
                    className="bg-background border-border pr-8"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {fromTokenDropdownOpen && filteredFromOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredFromOptions.map((option, index) => (
                        <div
                          key={option.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                            index === fromTokenSelectedIndex ? 'bg-accent text-accent-foreground' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setParentId(option.id);
                            setFromTokenInput(getNodeName(option));
                            setFromTokenDropdownOpen(false);
                            setFromTokenSelectedIndex(-1);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isExtendedOption(option) && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono flex-shrink-0">
                                {getNodeTypeLabel(option.type)}
                              </span>
                            )}
                            <span className="text-sm font-medium">{getNodeName(option)}</span>
                          </div>
                          {isExtendedOption(option) && getNodePath(option) && (
                            <div className="text-xs text-muted-foreground mt-0.5 ml-0">
                              {getNodePath(option)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* From Relationship Type */}
              <div className="space-y-2">
                <Label>From Relationship Type</Label>
                <div className="relative">
                  <Input
                    ref={fromRelationTypeInputRef}
                    value={fromRelationType}
                    onChange={(e) => {
                      setFromRelationType(e.target.value);
                      setFromRelationTypeDropdownOpen(true);
                      setFromRelationTypeSelectedIndex(-1);
                    }}
                    onFocus={() => setFromRelationTypeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setFromRelationTypeDropdownOpen(false), 150)}
                    onKeyDown={handleFromRelationTypeKeyDown}
                    placeholder="e.g. isA, partOf, relatedTo..."
                    className="bg-background border-border"
                  />
                  {fromRelationTypeDropdownOpen && filteredFromRelationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                      {filteredFromRelationSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground ${
                            index === fromRelationTypeSelectedIndex ? 'bg-accent text-accent-foreground' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFromRelationType(suggestion);
                            setFromRelationTypeDropdownOpen(false);
                            setFromRelationTypeSelectedIndex(-1);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* From Directionality */}
              <div className="space-y-2">
                <Label>From Directionality</Label>
                <Select
                  value={fromDirectionality}
                  onValueChange={(v) => setFromDirectionality(v as Directionality)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value={Directionality.unidirectional}>Unidirectional</SelectItem>
                    <SelectItem value={Directionality.bidirectional}>Bidirectional</SelectItem>
                    <SelectItem value={Directionality.none}>None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* To Node */}
              <div className="space-y-2">
                <Label>To Node</Label>
                <div className="relative">
                  <Input
                    ref={toNodeInputRef}
                    value={toNodeInput}
                    onChange={(e) => {
                      setToNodeInput(e.target.value);
                      setToNodeDropdownOpen(true);
                      setToNodeSelectedIndex(-1);
                      if (!e.target.value) setToNodeId('');
                    }}
                    onFocus={() => setToNodeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setToNodeDropdownOpen(false), 150)}
                    onKeyDown={handleToNodeKeyDown}
                    placeholder="Search locations, law tokens, interpretation tokens..."
                    className="bg-background border-border pr-8"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {toNodeDropdownOpen && filteredToOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                      {filteredToOptions.map((option, index) => (
                        <div
                          key={option.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                            index === toNodeSelectedIndex ? 'bg-accent text-accent-foreground' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setToNodeId(option.id);
                            setToNodeInput(getNodeName(option));
                            setToNodeDropdownOpen(false);
                            setToNodeSelectedIndex(-1);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono flex-shrink-0">
                              {getNodeTypeLabel(option.type)}
                            </span>
                            <span className="text-sm font-medium">{getNodeName(option)}</span>
                          </div>
                          {getNodePath(option) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {getNodePath(option)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* To Relationship Type */}
              <div className="space-y-2">
                <Label>To Relationship Type</Label>
                <div className="relative">
                  <Input
                    ref={toRelationTypeInputRef}
                    value={toRelationType}
                    onChange={(e) => {
                      setToRelationType(e.target.value);
                      setToRelationTypeDropdownOpen(true);
                      setToRelationTypeSelectedIndex(-1);
                    }}
                    onFocus={() => setToRelationTypeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setToRelationTypeDropdownOpen(false), 150)}
                    onKeyDown={handleToRelationTypeKeyDown}
                    placeholder="e.g. isA, partOf, relatedTo..."
                    className="bg-background border-border"
                  />
                  {toRelationTypeDropdownOpen && filteredToRelationSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                      {filteredToRelationSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className={`px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground ${
                            index === toRelationTypeSelectedIndex ? 'bg-accent text-accent-foreground' : ''
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setToRelationType(suggestion);
                            setToRelationTypeDropdownOpen(false);
                            setToRelationTypeSelectedIndex(-1);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* To Directionality */}
              <div className="space-y-2">
                <Label>To Directionality</Label>
                <Select
                  value={toDirectionality}
                  onValueChange={(v) => setToDirectionality(v as Directionality)}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value={Directionality.unidirectional}>Unidirectional</SelectItem>
                    <SelectItem value={Directionality.bidirectional}>Bidirectional</SelectItem>
                    <SelectItem value={Directionality.none}>None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Custom Attributes (Location and InterpretationToken) */}
          {(nodeType === 'location' || nodeType === 'interpretationToken') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Attributes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddAttribute}
                  className="h-7 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {customAttributes.map((attr, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={attr.key}
                      onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                      placeholder="Key"
                      className="flex-1 bg-background border-border"
                    />
                    <Input
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-background border-border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttribute(index)}
                      disabled={customAttributes.length === 1}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
