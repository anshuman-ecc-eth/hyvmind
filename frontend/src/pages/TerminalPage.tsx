import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { parseCommand } from '../utils/terminalParser';
import { executeCommand } from '../utils/terminalCommands';
import {
  useCreateCuration,
  useCreateSwarm,
  useCreateLocation,
  useCreateInterpretationToken,
  useGetGraphData,
} from '../hooks/useQueries';
import { resolveNodeReference, type ResolvedNode } from '../utils/terminalNameResolution';
import { formatGraphNotLoadedError, formatNodeNotFoundError, formatHelpText, formatFindResults, formatNoMatchesFound, formatOntCommandMissingNameError, formatFilterResults, formatFilterMissingNameError } from '../utils/terminalMessages';
import TerminalDisambiguationPicker from '../components/TerminalDisambiguationPicker';
import { saveTerminalSession, loadTerminalSession, clearTerminalSession } from '../utils/terminalSession';
import { generateOntologyTurtle } from '../utils/terminalOntologyTurtle';
import { convertTTLToMermaid } from '../utils/ttlToMermaid';
import TerminalOntologyOutput from '../components/TerminalOntologyOutput';
import type { GraphData } from '../backend';
import { useQueryClient } from '@tanstack/react-query';
import { formatTerminalOutput, getMessageTypeEmoji } from '../utils/terminalOutputFormatting';

export interface TerminalMessage {
  type: 'command' | 'success' | 'error' | 'example' | 'ontology';
  text: string;
  timestamp: number;
  ontologyData?: {
    turtle: string;
    mermaid: string | null;
    mermaidError?: string;
  };
}

interface PendingExecution {
  command: string;
  fields: Record<string, string | string[]>;
  ambiguousField: string;
  candidates: ResolvedNode[];
  originalInput: string;
}

const DEFAULT_MESSAGE: TerminalMessage = {
  type: 'success',
  text: 'Terminal ready. Type /help for list of commands.',
  timestamp: Date.now(),
};

export default function TerminalPage() {
  const [messages, setMessages] = useState<TerminalMessage[]>(() => {
    const loaded = loadTerminalSession();
    return loaded && loaded.length > 0 ? loaded : [DEFAULT_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [pendingExecution, setPendingExecution] = useState<PendingExecution | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createCuration = useCreateCuration();
  const createSwarm = useCreateSwarm();
  const createLocation = useCreateLocation();
  const createInterpretationToken = useCreateInterpretationToken();
  const { data: graphData } = useGetGraphData();
  const queryClient = useQueryClient();

  // Persist messages whenever they change
  useEffect(() => {
    saveTerminalSession(messages);
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, pendingExecution]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (type: 'command' | 'success' | 'error' | 'example' | 'ontology', text: string, ontologyData?: { turtle: string; mermaid: string | null; mermaidError?: string }) => {
    setMessages((prev) => [...prev, { type, text, timestamp: Date.now(), ontologyData }]);
  };

  const clearMessages = () => {
    setMessages([]);
    clearTerminalSession();
  };

  const handleHelp = () => {
    const helpText = formatHelpText();
    addMessage('success', helpText);
  };

  const handleClear = () => {
    clearMessages();
  };

  const handleFind = (searchTerm: string) => {
    if (!graphData) {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    const matches: Array<{ id: string; type: string; name: string; parentContext?: string }> = [];

    // Search curations
    for (const curation of graphData.curations) {
      if (curation.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push({
          id: curation.id,
          type: 'Curation',
          name: curation.name,
        });
      }
    }

    // Search swarms
    for (const swarm of graphData.swarms) {
      if (swarm.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        const parentCuration = graphData.curations.find(c => c.id === swarm.parentCurationId);
        matches.push({
          id: swarm.id,
          type: 'Swarm',
          name: swarm.name,
          parentContext: parentCuration?.name,
        });
      }
    }

    // Search locations
    for (const location of graphData.locations) {
      if (location.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        const parentSwarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
        matches.push({
          id: location.id,
          type: 'Location',
          name: location.title,
          parentContext: parentSwarm?.name,
        });
      }
    }

    // Search law tokens
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.tokenLabel.toLowerCase().includes(searchTerm.toLowerCase())) {
        const parentLocation = graphData.locations.find(l => l.id === lawToken.parentLocationId);
        matches.push({
          id: lawToken.id,
          type: 'Law Token',
          name: lawToken.tokenLabel,
          parentContext: parentLocation?.title,
        });
      }
    }

    // Search interpretation tokens
    for (const interpretationToken of graphData.interpretationTokens) {
      if (interpretationToken.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        const fromNode = 
          graphData.locations.find(l => l.id === interpretationToken.fromTokenId) ||
          graphData.lawTokens.find(lt => lt.id === interpretationToken.fromTokenId) ||
          graphData.interpretationTokens.find(it => it.id === interpretationToken.fromTokenId);
        
        let parentContext: string | undefined;
        if (fromNode) {
          if ('title' in fromNode) {
            parentContext = fromNode.title;
          } else if ('tokenLabel' in fromNode) {
            parentContext = fromNode.tokenLabel;
          }
        }

        matches.push({
          id: interpretationToken.id,
          type: 'Interpretation Token',
          name: interpretationToken.title,
          parentContext,
        });
      }
    }

    if (matches.length === 0) {
      addMessage('error', formatNoMatchesFound(searchTerm));
    } else {
      const resultText = formatFindResults(matches);
      addMessage('success', resultText);
    }
  };

  const handleOnt = (nodeName: string) => {
    if (!graphData) {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    if (!nodeName) {
      addMessage('error', formatOntCommandMissingNameError());
      return;
    }

    // Resolve node by name (use normalized command identifier)
    const resolution = resolveNodeReference(nodeName, 'ont', 'name', graphData);

    if (resolution.status === 'not-found') {
      addMessage('error', formatNodeNotFoundError(nodeName, 'node'));
      return;
    }

    if (resolution.status === 'ambiguous') {
      // Show disambiguation picker
      setPendingExecution({
        command: '/ont',
        fields: { name: nodeName },
        ambiguousField: 'name',
        candidates: resolution.candidates,
        originalInput: `/ont name=${nodeName}`,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolution.status !== 'resolved') {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    // Generate Turtle
    const turtleText = generateOntologyTurtle(resolution.id, graphData);

    // Derive Mermaid from Turtle
    const { mermaidText, mermaidError } = convertTTLToMermaid(turtleText, graphData);

    // Find node name for display
    const nodeInfo = findNodeById(resolution.id, graphData);
    const displayName = nodeInfo?.name || nodeName;

    // Add ontology message with both Turtle and Mermaid
    addMessage('ontology', `Ontology for: ${displayName}`, {
      turtle: turtleText,
      mermaid: mermaidText,
      mermaidError,
    });
  };

  const handleFilter = (nodeName: string, parentName?: string, childName?: string) => {
    if (!graphData) {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    if (!nodeName) {
      addMessage('error', formatFilterMissingNameError());
      return;
    }

    // Resolve node by name (use normalized command identifier)
    const resolution = resolveNodeReference(nodeName, 'filter', 'name', graphData);

    if (resolution.status === 'not-found') {
      addMessage('error', formatNodeNotFoundError(nodeName, 'node'));
      return;
    }

    if (resolution.status === 'ambiguous') {
      // Show disambiguation picker
      setPendingExecution({
        command: '/filter',
        fields: { name: nodeName, parent: parentName || '', child: childName || '' },
        ambiguousField: 'name',
        candidates: resolution.candidates,
        originalInput: `/filter name=${nodeName}${parentName ? ` parent=${parentName}` : ''}${childName ? ` child=${childName}` : ''}`,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolution.status !== 'resolved') {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    // Apply parent/child filters
    let filteredResults: Array<{ id: string; type: string; name: string; parentContext?: string }> = [];

    if (parentName) {
      // Find all nodes with this parent
      const parentResolution = resolveNodeReference(parentName, 'filter', 'parent', graphData);
      if (parentResolution.status === 'resolved') {
        // Find children of this parent
        const children = findChildrenOfNode(parentResolution.id, graphData);
        filteredResults = children.filter(child => 
          child.name.toLowerCase().includes(nodeName.toLowerCase())
        );
      }
    } else if (childName) {
      // Find all nodes that have this child
      const childResolution = resolveNodeReference(childName, 'filter', 'child', graphData);
      if (childResolution.status === 'resolved') {
        // Find parents of this child
        const parents = findParentsOfNode(childResolution.id, graphData);
        filteredResults = parents.filter(parent => 
          parent.name.toLowerCase().includes(nodeName.toLowerCase())
        );
      }
    } else {
      // No parent/child filter, just return the resolved node
      const nodeInfo = findNodeById(resolution.id, graphData);
      if (nodeInfo) {
        filteredResults = [{
          id: resolution.id,
          type: nodeInfo.type,
          name: nodeInfo.name,
        }];
      }
    }

    if (filteredResults.length === 0) {
      addMessage('error', formatNoMatchesFound(nodeName));
    } else {
      const resultText = formatFilterResults(filteredResults);
      addMessage('success', resultText);
    }
  };

  const findNodeById = (nodeId: string, graphData: GraphData): { id: string; name: string; type: string } | null => {
    // Check curations
    for (const curation of graphData.curations) {
      if (curation.id === nodeId) {
        return { id: curation.id, name: curation.name, type: 'Curation' };
      }
    }
    
    // Check swarms
    for (const swarm of graphData.swarms) {
      if (swarm.id === nodeId) {
        return { id: swarm.id, name: swarm.name, type: 'Swarm' };
      }
    }
    
    // Check locations
    for (const location of graphData.locations) {
      if (location.id === nodeId) {
        return { id: location.id, name: location.title, type: 'Location' };
      }
    }
    
    // Check law tokens
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.id === nodeId) {
        return { id: lawToken.id, name: lawToken.tokenLabel, type: 'Law Token' };
      }
    }
    
    // Check interpretation tokens
    for (const interpretationToken of graphData.interpretationTokens) {
      if (interpretationToken.id === nodeId) {
        return { id: interpretationToken.id, name: interpretationToken.title, type: 'Interpretation Token' };
      }
    }
    
    return null;
  };

  const findChildrenOfNode = (nodeId: string, graphData: GraphData): Array<{ id: string; type: string; name: string; parentContext?: string }> => {
    const children: Array<{ id: string; type: string; name: string; parentContext?: string }> = [];
    
    // Check if this is a curation (children are swarms)
    for (const swarm of graphData.swarms) {
      if (swarm.parentCurationId === nodeId) {
        children.push({
          id: swarm.id,
          type: 'Swarm',
          name: swarm.name,
        });
      }
    }
    
    // Check if this is a swarm (children are locations)
    for (const location of graphData.locations) {
      if (location.parentSwarmId === nodeId) {
        children.push({
          id: location.id,
          type: 'Location',
          name: location.title,
        });
      }
    }
    
    // Check if this is a location (children are law tokens)
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.parentLocationId === nodeId) {
        children.push({
          id: lawToken.id,
          type: 'Law Token',
          name: lawToken.tokenLabel,
        });
      }
    }
    
    return children;
  };

  const findParentsOfNode = (nodeId: string, graphData: GraphData): Array<{ id: string; type: string; name: string; parentContext?: string }> => {
    const parents: Array<{ id: string; type: string; name: string; parentContext?: string }> = [];
    
    // Check if this is a swarm (parent is curation)
    for (const swarm of graphData.swarms) {
      if (swarm.id === nodeId) {
        const parentCuration = graphData.curations.find(c => c.id === swarm.parentCurationId);
        if (parentCuration) {
          parents.push({
            id: parentCuration.id,
            type: 'Curation',
            name: parentCuration.name,
          });
        }
      }
    }
    
    // Check if this is a location (parent is swarm)
    for (const location of graphData.locations) {
      if (location.id === nodeId) {
        const parentSwarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
        if (parentSwarm) {
          parents.push({
            id: parentSwarm.id,
            type: 'Swarm',
            name: parentSwarm.name,
          });
        }
      }
    }
    
    // Check if this is a law token (parent is location)
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.id === nodeId) {
        const parentLocation = graphData.locations.find(l => l.id === lawToken.parentLocationId);
        if (parentLocation) {
          parents.push({
            id: parentLocation.id,
            type: 'Location',
            name: parentLocation.title,
          });
        }
      }
    }
    
    return parents;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Echo command
    addMessage('command', input);

    // Parse command
    const parsed = parseCommand(input);

    if (!parsed.success) {
      addMessage('error', parsed.error || 'Invalid command');
      setInput('');
      return;
    }

    const { command, fields, argument } = parsed;

    // Type guard: ensure command is defined
    if (!command) {
      addMessage('error', 'Error: Invalid command');
      setInput('');
      return;
    }

    // Handle built-in commands
    if (command === 'help') {
      handleHelp();
      setInput('');
      return;
    }

    if (command === 'clear') {
      handleClear();
      setInput('');
      return;
    }

    if (command === 'find') {
      if (!argument || argument.trim() === '') {
        addMessage('error', 'Error: /find requires a search term.\nUsage: /find <search term>');
      } else {
        handleFind(argument);
      }
      setInput('');
      return;
    }

    if (command === 'ont') {
      const nodeName = fields?.name as string;
      handleOnt(nodeName);
      setInput('');
      return;
    }

    if (command === 'filter') {
      const nodeName = fields?.name as string;
      const parentName = fields?.parent as string;
      const childName = fields?.child as string;
      handleFilter(nodeName, parentName, childName);
      setInput('');
      return;
    }

    // Handle create commands (c, s, l, i)
    if (['c', 's', 'l', 'i'].includes(command)) {
      if (!graphData) {
        addMessage('error', formatGraphNotLoadedError());
        setInput('');
        return;
      }

      // Resolve field references
      const resolvedFields = await resolveFieldsWithNames(command, fields || {}, graphData);

      if (resolvedFields.status === 'ambiguous') {
        // Show disambiguation picker
        setPendingExecution({
          command: `/${command}`,
          fields: fields || {},
          ambiguousField: resolvedFields.field,
          candidates: resolvedFields.candidates,
          originalInput: input,
        });
        setSelectedCandidateIndex(0);
        setInput('');
        return;
      }

      if (resolvedFields.status === 'error') {
        addMessage('error', resolvedFields.message);
        setInput('');
        return;
      }

      // Execute command with resolved fields
      try {
        const result = await executeCommand(
          command,
          resolvedFields.fields,
          createCuration,
          createSwarm,
          createLocation,
          createInterpretationToken
        );

        if (result.success) {
          addMessage('success', result.message);
          // Refetch graph data after successful creation
          queryClient.invalidateQueries({ queryKey: ['graphData'] });
        } else {
          addMessage('error', result.message);
        }
      } catch (error) {
        addMessage('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setInput('');
      return;
    }

    // Unknown command
    addMessage('error', `Error: Unknown command /${command}. Type /help for available commands.`);
    setInput('');
  };

  const resolveFieldsWithNames = async (
    command: string,
    fields: Record<string, string | string[]>,
    graphData: GraphData
  ): Promise<
    | { status: 'resolved'; fields: Record<string, string | string[]> }
    | { status: 'ambiguous'; field: string; candidates: ResolvedNode[] }
    | { status: 'error'; message: string }
  > => {
    const resolvedFields = { ...fields };

    // Determine which fields need resolution
    const fieldsToResolve: Array<{ key: string; value: string }> = [];

    if (command === 's' && fields.parent) {
      fieldsToResolve.push({ key: 'parent', value: fields.parent as string });
    }

    if (command === 'l' && fields.parent) {
      fieldsToResolve.push({ key: 'parent', value: fields.parent as string });
    }

    if (command === 'i') {
      if (fields.from) {
        fieldsToResolve.push({ key: 'from', value: fields.from as string });
      }
      if (fields.to) {
        fieldsToResolve.push({ key: 'to', value: fields.to as string });
      }
    }

    // Resolve each field
    for (const { key, value } of fieldsToResolve) {
      const resolution = resolveNodeReference(value, command, key, graphData);

      if (resolution.status === 'not-found') {
        return {
          status: 'error',
          message: formatNodeNotFoundError(value, key),
        };
      }

      if (resolution.status === 'ambiguous') {
        return {
          status: 'ambiguous',
          field: key,
          candidates: resolution.candidates,
        };
      }

      if (resolution.status === 'resolved') {
        resolvedFields[key] = resolution.id;
      }
    }

    return { status: 'resolved', fields: resolvedFields };
  };

  const handleDisambiguationConfirm = async (selected: ResolvedNode) => {
    if (!pendingExecution) return;

    // Update the ambiguous field with the selected ID
    const updatedFields = { ...pendingExecution.fields };
    updatedFields[pendingExecution.ambiguousField] = selected.id;

    // Clear disambiguation state
    setPendingExecution(null);
    setSelectedCandidateIndex(0);

    // Extract command identifier (remove leading slash)
    const commandId = pendingExecution.command.startsWith('/') 
      ? pendingExecution.command.substring(1) 
      : pendingExecution.command;

    // Handle ont and filter commands specially
    if (commandId === 'ont') {
      handleOnt(selected.name);
      return;
    }

    if (commandId === 'filter') {
      const parentName = updatedFields.parent as string;
      const childName = updatedFields.child as string;
      handleFilter(selected.name, parentName, childName);
      return;
    }

    // For create commands, continue with resolution
    if (!graphData) {
      addMessage('error', formatGraphNotLoadedError());
      return;
    }

    const resolvedFields = await resolveFieldsWithNames(commandId, updatedFields, graphData);

    if (resolvedFields.status === 'ambiguous') {
      // Another ambiguous field - show picker again
      setPendingExecution({
        command: pendingExecution.command,
        fields: updatedFields,
        ambiguousField: resolvedFields.field,
        candidates: resolvedFields.candidates,
        originalInput: pendingExecution.originalInput,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolvedFields.status === 'error') {
      addMessage('error', resolvedFields.message);
      return;
    }

    // Execute command
    try {
      const result = await executeCommand(
        commandId,
        resolvedFields.fields,
        createCuration,
        createSwarm,
        createLocation,
        createInterpretationToken
      );

      if (result.success) {
        addMessage('success', result.message);
        // Refetch graph data after successful creation
        queryClient.invalidateQueries({ queryKey: ['graphData'] });
      } else {
        addMessage('error', result.message);
      }
    } catch (error) {
      addMessage('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisambiguationCancel = () => {
    setPendingExecution(null);
    setSelectedCandidateIndex(0);
    addMessage('error', 'Command cancelled due to ambiguous reference.');
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-2 font-mono text-sm">
          {messages.map((msg, idx) => {
            const emoji = getMessageTypeEmoji(msg.type);
            
            if (msg.type === 'ontology' && msg.ontologyData) {
              return (
                <div key={idx} className="space-y-2">
                  {emoji && <span className="mr-2">{emoji}</span>}
                  <span className="font-medium">{msg.text}</span>
                  <TerminalOntologyOutput
                    turtleText={msg.ontologyData.turtle}
                    mermaidText={msg.ontologyData.mermaid}
                    mermaidError={msg.ontologyData.mermaidError}
                  />
                </div>
              );
            }

            const tokens = formatTerminalOutput(msg.text, msg.type);
            
            return (
              <div key={idx} className={`${msg.type === 'error' ? 'text-destructive' : ''}`}>
                {emoji && <span className="mr-2">{emoji}</span>}
                {tokens.map((token, tokenIdx) => {
                  const indentClass = token.indent === 0 ? '' : token.indent === 1 ? 'ml-4' : 'ml-8';
                  const typeClass = 
                    token.type === 'heading' ? 'font-semibold' :
                    token.type === 'command' ? 'text-primary' :
                    token.type === 'example' ? 'text-muted-foreground italic' :
                    token.type === 'result' ? 'text-accent-foreground' :
                    '';
                  
                  return (
                    <div key={tokenIdx} className={`${indentClass} ${typeClass}`}>
                      {token.text || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {pendingExecution && (
        <div className="border-t border-border p-4">
          <TerminalDisambiguationPicker
            candidates={pendingExecution.candidates}
            selectedIndex={selectedCandidateIndex}
            onSelect={setSelectedCandidateIndex}
            onConfirm={handleDisambiguationConfirm}
            onCancel={handleDisambiguationCancel}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          className="font-mono"
          disabled={!!pendingExecution}
        />
      </form>
    </div>
  );
}
