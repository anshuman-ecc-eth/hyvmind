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

  // Helper function to build hierarchical path for a node (same as GraphView)
  const buildNodePath = (nodeId: string): string => {
    if (!graphData) return '';

    const pathParts: string[] = [];

    // Find the node and build path based on type
    const curation = graphData.curations.find(c => c.id === nodeId);
    if (curation) {
      return ''; // Curations have no parent path
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
      // Build path from origin token
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
          // Filter out empty attributes
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
      
      // Provide user-friendly error messages
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
        // Include Locations, Law Tokens, and Interpretation Tokens (per backend validation)
        const options: ExtendedOption[] = [];
        
        // Add all locations with parent context paths
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
        
        // Add all law tokens with parent context paths
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
        
        // Add all interpretation tokens with parent context paths
        graphData.interpretationTokens.forEach((i) => {
          const path = buildNodePath(i.id);
          options.push({ 
            id: i.id, 
            label: i.title, 
            type: 'interpretationToken', 
            path,
            name: i.title 
          });
        });
        
        return options;
      }
      default:
        return [];
    }
  };

  // Get available nodes for "To Node" selection (Locations, Law Tokens, and Interpretation Tokens per backend validation)
  const getToNodeOptions = (): ExtendedOption[] => {
    if (!graphData) return [];

    const allNodes: ExtendedOption[] = [];

    // Add all locations with parent context paths
    graphData.locations.forEach((l) => {
      const path = buildNodePath(l.id);
      allNodes.push({ 
        id: l.id, 
        label: l.title, 
        type: 'location', 
        path,
        name: l.title 
      });
    });

    // Add all law tokens with parent context paths
    graphData.lawTokens.forEach((t) => {
      const path = buildNodePath(t.id);
      allNodes.push({ 
        id: t.id, 
        label: t.tokenLabel, 
        type: 'lawToken', 
        path,
        name: t.tokenLabel 
      });
    });

    // Add all interpretation tokens with parent context paths
    graphData.interpretationTokens.forEach((i) => {
      const path = buildNodePath(i.id);
      allNodes.push({ 
        id: i.id, 
        label: i.title, 
        type: 'interpretationToken', 
        path,
        name: i.title 
      });
    });

    return allNodes;
  };

  // Get all existing relationship types from interpretation tokens
  const getExistingRelationshipTypes = (): string[] => {
    if (!graphData) return [];

    const relationshipTypes = new Set<string>();

    graphData.interpretationTokens.forEach((token) => {
      if (token.fromRelationshipType.trim()) {
        relationshipTypes.add(token.fromRelationshipType.trim());
      }
      if (token.toRelationshipType.trim()) {
        relationshipTypes.add(token.toRelationshipType.trim());
      }
    });

    return Array.from(relationshipTypes).sort();
  };

  const parentOptions = getParentOptions();
  const toNodeOptions = getToNodeOptions();
  const existingRelationshipTypes = getExistingRelationshipTypes();
  const needsParent = nodeType !== 'curation';

  // Filter options based on input - search only by node name, not path
  const filteredFromTokenOptions = parentOptions.filter((option) => {
    const nodeName = getNodeName(option);
    return nodeName.toLowerCase().includes(fromTokenInput.toLowerCase());
  });

  const filteredToNodeOptions = toNodeOptions.filter((option) => {
    const nodeName = getNodeName(option);
    return nodeName.toLowerCase().includes(toNodeInput.toLowerCase());
  });

  const filteredFromRelationTypes = existingRelationshipTypes.filter((type) =>
    type.toLowerCase().includes(fromRelationType.toLowerCase())
  );

  const filteredToRelationTypes = existingRelationshipTypes.filter((type) =>
    type.toLowerCase().includes(toRelationType.toLowerCase())
  );

  // Get selected option names for display (name only, without type)
  const getSelectedFromTokenName = (): string => {
    const selected = parentOptions.find((opt) => opt.id === parentId);
    return selected ? getNodeName(selected) : '';
  };

  const getSelectedToNodeName = (): string => {
    const selected = toNodeOptions.find((opt) => opt.id === toNodeId);
    return selected ? getNodeName(selected) : '';
  };

  // Handle From Token input changes
  const handleFromTokenInputChange = (value: string) => {
    setFromTokenInput(value);
    setFromTokenDropdownOpen(true);
    setFromTokenSelectedIndex(-1);
    
    // Clear selection if input doesn't match
    if (parentId) {
      const selected = parentOptions.find((opt) => opt.id === parentId);
      const selectedName = selected ? getNodeName(selected) : '';
      if (selectedName !== value) {
        setParentId('');
      }
    }
  };

  // Handle To Node input changes
  const handleToNodeInputChange = (value: string) => {
    setToNodeInput(value);
    setToNodeDropdownOpen(true);
    setToNodeSelectedIndex(-1);
    
    // Clear selection if input doesn't match
    if (toNodeId) {
      const selected = toNodeOptions.find((opt) => opt.id === toNodeId);
      const selectedName = selected ? getNodeName(selected) : '';
      if (selectedName !== value) {
        setToNodeId('');
      }
    }
  };

  // Handle From Relationship Type input changes
  const handleFromRelationTypeInputChange = (value: string) => {
    setFromRelationType(value);
    setFromRelationTypeDropdownOpen(true);
    setFromRelationTypeSelectedIndex(-1);
  };

  // Handle To Relationship Type input changes
  const handleToRelationTypeInputChange = (value: string) => {
    setToRelationType(value);
    setToRelationTypeDropdownOpen(true);
    setToRelationTypeSelectedIndex(-1);
  };

  // Handle From Token keyboard navigation
  const handleFromTokenKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!fromTokenDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setFromTokenDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFromTokenSelectedIndex((prev) =>
          prev < filteredFromTokenOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFromTokenSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (fromTokenSelectedIndex >= 0 && fromTokenSelectedIndex < filteredFromTokenOptions.length) {
          const selected = filteredFromTokenOptions[fromTokenSelectedIndex];
          setParentId(selected.id);
          // Set only the name without type label
          const nodeName = getNodeName(selected);
          setFromTokenInput(nodeName);
          setFromTokenDropdownOpen(false);
          setFromTokenSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setFromTokenDropdownOpen(false);
        setFromTokenSelectedIndex(-1);
        break;
    }
  };

  // Handle To Node keyboard navigation
  const handleToNodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!toNodeDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setToNodeDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setToNodeSelectedIndex((prev) =>
          prev < filteredToNodeOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setToNodeSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (toNodeSelectedIndex >= 0 && toNodeSelectedIndex < filteredToNodeOptions.length) {
          const selected = filteredToNodeOptions[toNodeSelectedIndex];
          setToNodeId(selected.id);
          // Set only the name without type label
          const nodeName = getNodeName(selected);
          setToNodeInput(nodeName);
          setToNodeDropdownOpen(false);
          setToNodeSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setToNodeDropdownOpen(false);
        setToNodeSelectedIndex(-1);
        break;
    }
  };

  // Handle From Relationship Type keyboard navigation
  const handleFromRelationTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!fromRelationTypeDropdownOpen || filteredFromRelationTypes.length === 0) {
      if (e.key === 'ArrowDown' && filteredFromRelationTypes.length > 0) {
        setFromRelationTypeDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFromRelationTypeSelectedIndex((prev) =>
          prev < filteredFromRelationTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFromRelationTypeSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (fromRelationTypeSelectedIndex >= 0 && fromRelationTypeSelectedIndex < filteredFromRelationTypes.length) {
          const selected = filteredFromRelationTypes[fromRelationTypeSelectedIndex];
          setFromRelationType(selected);
          setFromRelationTypeDropdownOpen(false);
          setFromRelationTypeSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setFromRelationTypeDropdownOpen(false);
        setFromRelationTypeSelectedIndex(-1);
        break;
    }
  };

  // Handle To Relationship Type keyboard navigation
  const handleToRelationTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!toRelationTypeDropdownOpen || filteredToRelationTypes.length === 0) {
      if (e.key === 'ArrowDown' && filteredToRelationTypes.length > 0) {
        setToRelationTypeDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setToRelationTypeSelectedIndex((prev) =>
          prev < filteredToRelationTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setToRelationTypeSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (toRelationTypeSelectedIndex >= 0 && toRelationTypeSelectedIndex < filteredToRelationTypes.length) {
          const selected = filteredToRelationTypes[toRelationTypeSelectedIndex];
          setToRelationType(selected);
          setToRelationTypeDropdownOpen(false);
          setToRelationTypeSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setToRelationTypeDropdownOpen(false);
        setToRelationTypeSelectedIndex(-1);
        break;
    }
  };

  // Update input when selection changes externally
  useEffect(() => {
    if (parentId && nodeType === 'interpretationToken') {
      const name = getSelectedFromTokenName();
      if (name && name !== fromTokenInput) {
        setFromTokenInput(name);
      }
    }
  }, [parentId, nodeType]);

  useEffect(() => {
    if (toNodeId) {
      const name = getSelectedToNodeName();
      if (name && name !== toNodeInput) {
        setToNodeInput(name);
      }
    }
  }, [toNodeId]);

  const getParentLabel = () => {
    switch (nodeType) {
      case 'swarm':
        return 'Curation';
      case 'location':
        return 'Swarm';
      case 'interpretationToken':
        return 'From Token';
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
        // Path can be from Location, Law Token, or Interpretation Token
        const location = graphData.locations.find(l => l.id === parentId);
        if (location) {
          // Path: Curation → Swarm → Location
          const swarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
          if (swarm) {
            const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
            if (curation) path.push(curation.name);
            path.push(swarm.name);
          }
          path.push(location.title);
        } else {
          const lawToken = graphData.lawTokens.find(t => t.id === parentId);
          if (lawToken) {
            // Path: Curation → Swarm → Location → Law Token
            const parentLocation = graphData.locations.find(l => l.id === lawToken.parentLocationId);
            if (parentLocation) {
              const swarm = graphData.swarms.find(s => s.id === parentLocation.parentSwarmId);
              if (swarm) {
                const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
                if (curation) path.push(curation.name);
                path.push(swarm.name);
              }
              path.push(parentLocation.title);
            }
            path.push(lawToken.tokenLabel);
          } else {
            // Check if it's an interpretation token
            const interpretationToken = graphData.interpretationTokens.find(i => i.id === parentId);
            if (interpretationToken) {
              // Recursively build path for interpretation token origin
              const buildInterpretationPath = (tokenId: NodeId): void => {
                const token = graphData.interpretationTokens.find(i => i.id === tokenId);
                if (token) {
                  // Check if origin is a location
                  const originLocation = graphData.locations.find(l => l.id === token.fromTokenId);
                  if (originLocation) {
                    const swarm = graphData.swarms.find(s => s.id === originLocation.parentSwarmId);
                    if (swarm) {
                      const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
                      if (curation) path.push(curation.name);
                      path.push(swarm.name);
                    }
                    path.push(originLocation.title);
                  } else {
                    // Check if origin is a law token
                    const originLawToken = graphData.lawTokens.find(t => t.id === token.fromTokenId);
                    if (originLawToken) {
                      const parentLocation = graphData.locations.find(l => l.id === originLawToken.parentLocationId);
                      if (parentLocation) {
                        const swarm = graphData.swarms.find(s => s.id === parentLocation.parentSwarmId);
                        if (swarm) {
                          const curation = graphData.curations.find(c => c.id === swarm.parentCurationId);
                          if (curation) path.push(curation.name);
                          path.push(swarm.name);
                        }
                        path.push(parentLocation.title);
                      }
                      path.push(originLawToken.tokenLabel);
                    } else {
                      // Origin is another interpretation token
                      buildInterpretationPath(token.fromTokenId);
                    }
                  }
                  path.push(token.title);
                }
              };
              buildInterpretationPath(parentId);
            }
          }
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
                setFromDirectionality(Directionality.unidirectional);
                setToNodeId('');
                setToRelationType('');
                setToDirectionality(Directionality.unidirectional);
                setFromTokenInput('');
                setToNodeInput('');
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

          {needsParent && nodeType !== 'interpretationToken' && (
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
                <Label htmlFor="fromToken">From Token</Label>
                <div className="relative">
                  <Input
                    ref={fromTokenInputRef}
                    id="fromToken"
                    value={fromTokenInput}
                    onChange={(e) => handleFromTokenInputChange(e.target.value)}
                    onKeyDown={handleFromTokenKeyDown}
                    onFocus={() => setFromTokenDropdownOpen(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setFromTokenDropdownOpen(false), 200);
                    }}
                    placeholder="Type to search tokens..."
                    disabled={!!defaultParentId || isPending}
                    className="pr-8"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {fromTokenDropdownOpen && filteredFromTokenOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                      <ScrollArea className="max-h-[300px]">
                        <div className="p-1 bg-popover">
                          {filteredFromTokenOptions.map((option, index) => {
                            const nodeName = getNodeName(option);
                            const nodePath = getNodePath(option);
                            const nodeType = isExtendedOption(option) ? getNodeTypeLabel(option.type) : '';
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setParentId(option.id);
                                  // Set only the name without type label
                                  setFromTokenInput(nodeName);
                                  setFromTokenDropdownOpen(false);
                                  setFromTokenSelectedIndex(-1);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors bg-popover ${
                                  index === fromTokenSelectedIndex ? 'bg-accent' : ''
                                } ${parentId === option.id ? 'bg-accent/50' : ''}`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{nodeName}</span>
                                    {nodeType && (
                                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                        {nodeType}
                                      </span>
                                    )}
                                  </div>
                                  {nodePath && (
                                    <span className="text-xs text-muted-foreground">
                                      {nodePath}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a Location, Law Token, or Interpretation Token
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor="fromRelationType">From Relationship Type</Label>
                  </div>
                  <div className="w-40">
                    <Label htmlFor="fromDirectionality" className="text-xs text-muted-foreground">Directionality</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={fromRelationTypeInputRef}
                      id="fromRelationType"
                      placeholder="e.g., defines, exemplifies..."
                      value={fromRelationType}
                      onChange={(e) => handleFromRelationTypeInputChange(e.target.value)}
                      onKeyDown={handleFromRelationTypeKeyDown}
                      onFocus={() => {
                        if (filteredFromRelationTypes.length > 0) {
                          setFromRelationTypeDropdownOpen(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setFromRelationTypeDropdownOpen(false), 200);
                      }}
                      disabled={isPending}
                      className="pr-8"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    {fromRelationTypeDropdownOpen && filteredFromRelationTypes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                        <ScrollArea className="max-h-[200px]">
                          <div className="p-1 bg-popover">
                            {filteredFromRelationTypes.map((type, index) => (
                              <button
                                key={type}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFromRelationType(type);
                                  setFromRelationTypeDropdownOpen(false);
                                  setFromRelationTypeSelectedIndex(-1);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors bg-popover ${
                                  index === fromRelationTypeSelectedIndex ? 'bg-accent' : ''
                                } ${fromRelationType === type ? 'bg-accent/50' : ''}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                  <Select 
                    value={fromDirectionality} 
                    onValueChange={(value) => setFromDirectionality(value as Directionality)} 
                    disabled={isPending}
                  >
                    <SelectTrigger id="fromDirectionality" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Directionality.none}>No Direction</SelectItem>
                      <SelectItem value={Directionality.unidirectional}>Unidirectional</SelectItem>
                      <SelectItem value={Directionality.bidirectional}>Bidirectional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe how this interpretation relates to the origin token
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toNode">To Node</Label>
                <div className="relative">
                  <Input
                    ref={toNodeInputRef}
                    id="toNode"
                    value={toNodeInput}
                    onChange={(e) => handleToNodeInputChange(e.target.value)}
                    onKeyDown={handleToNodeKeyDown}
                    onFocus={() => setToNodeDropdownOpen(true)}
                    onBlur={() => {
                      // Delay to allow click on dropdown item
                      setTimeout(() => setToNodeDropdownOpen(false), 200);
                    }}
                    placeholder="Type to search nodes..."
                    disabled={isPending}
                    className="pr-8"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  {toNodeDropdownOpen && filteredToNodeOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                      <ScrollArea className="max-h-[300px]">
                        <div className="p-1 bg-popover">
                          {filteredToNodeOptions.map((option, index) => {
                            const nodeName = getNodeName(option);
                            const nodePath = getNodePath(option);
                            const nodeType = getNodeTypeLabel(option.type);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setToNodeId(option.id);
                                  // Set only the name without type label
                                  setToNodeInput(nodeName);
                                  setToNodeDropdownOpen(false);
                                  setToNodeSelectedIndex(-1);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors bg-popover ${
                                  index === toNodeSelectedIndex ? 'bg-accent' : ''
                                } ${toNodeId === option.id ? 'bg-accent/50' : ''}`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{nodeName}</span>
                                    <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                      {nodeType}
                                    </span>
                                  </div>
                                  {nodePath && (
                                    <span className="text-xs text-muted-foreground">
                                      {nodePath}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a Location, Law Token, or Interpretation Token
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor="toRelationType">To Relationship Type</Label>
                  </div>
                  <div className="w-40">
                    <Label htmlFor="toDirectionality" className="text-xs text-muted-foreground">Directionality</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={toRelationTypeInputRef}
                      id="toRelationType"
                      placeholder="e.g., references, applies to..."
                      value={toRelationType}
                      onChange={(e) => handleToRelationTypeInputChange(e.target.value)}
                      onKeyDown={handleToRelationTypeKeyDown}
                      onFocus={() => {
                        if (filteredToRelationTypes.length > 0) {
                          setToRelationTypeDropdownOpen(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setToRelationTypeDropdownOpen(false), 200);
                      }}
                      disabled={isPending}
                      className="pr-8"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    {toRelationTypeDropdownOpen && filteredToRelationTypes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                        <ScrollArea className="max-h-[200px]">
                          <div className="p-1 bg-popover">
                            {filteredToRelationTypes.map((type, index) => (
                              <button
                                key={type}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setToRelationType(type);
                                  setToRelationTypeDropdownOpen(false);
                                  setToRelationTypeSelectedIndex(-1);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors bg-popover ${
                                  index === toRelationTypeSelectedIndex ? 'bg-accent' : ''
                                } ${toRelationType === type ? 'bg-accent/50' : ''}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                  <Select 
                    value={toDirectionality} 
                    onValueChange={(value) => setToDirectionality(value as Directionality)} 
                    disabled={isPending}
                  >
                    <SelectTrigger id="toDirectionality" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Directionality.none}>No Direction</SelectItem>
                      <SelectItem value={Directionality.unidirectional}>Unidirectional</SelectItem>
                      <SelectItem value={Directionality.bidirectional}>Bidirectional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
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
