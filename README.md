# Hyvmind

A research 2 earn (R2E) architecture for legal annotations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Graph Visualization](#graph-visualization)
4. [Core Concepts](#core-concepts)
5. [Node Hierarchy](#node-hierarchy)
6. [Frontend Pages](#frontend-pages)
7. [Core Hooks](#core-hooks)
8. [Key Components](#key-components)
9. [BUZZ Points System](#buzz-points-system)
10. [Voting System](#voting-system)
11. [Swarm Membership](#swarm-membership)

---

## Overview

Hyvmind is a decentralized knowledge management application built on the Internet Computer Protocol (ICP). It enables users to create and organize hierarchical legal annotations in a five-level structure, with collaborative swarm functionality and a BUZZ points reputation system that rewards contributors for creating valuable content.

The application features interactive graph and tree visualizations, allowing users to navigate complex legal knowledge graphs, vote on content quality, and earn BUZZ points based on community engagement.

---

## Architecture

### Backend (Motoko)

The backend is built using Motoko, a programming language designed for the Internet Computer. It consists of three main modules:

- **main.mo**: Contains the core canister logic for node management, voting, BUZZ points, swarm membership, and data queries
- **authorization/access-control.mo**: Handles admin authentication and access control policies
- **user-approval/approval.mo**: Manages swarm membership request and approval workflows

### Frontend (React + TypeScript)

The frontend is built with React and TypeScript, using:

- **React Query (TanStack Query)**: For data fetching and caching
- **React Context**: For authentication state management
- **SVG-based Graph Visualization**: Custom interactive graph rendering with pan, zoom, and node manipulation
- **Canvas-based Voronoi Diagram**: For landing page visualization
- **Internet Identity**: For authentication

### Graph Visualization

Hyvmind's graph visualization is built with a custom SVG-based renderer designed for performance and stability:

- **SVG-based Rendering**: Uses native SVG elements for nodes, edges, and labels
- **Custom Layout Algorithms**: Four built-in layout options (Grid, Circle, Concentric, Breadthfirst)
- **Pan and Zoom**: Smooth canvas navigation with mouse drag and scroll wheel
- **Node Dragging**: Move nodes while connected nodes follow to maintain link distances
- **Vote-Based Filtering**: Nodes with more downvotes than upvotes are automatically hidden
- **Focus Mode**: Click a node to dim unrelated nodes and highlight direct connections
- **Type Filtering**: Toggle visibility of specific node types (Curation, Swarm, Location, Law Token, Interpretation Token)
- **Edge Labels**: Displays relationship types for interpretation token connections
- **Theme Adaptation**: Colors adjust automatically to light/dark mode
- **Collapsible Control Panels**: Legend/filters and visualization controls can be minimized
- **Session Persistence**: User preferences (layout, filters, zoom) are saved to sessionStorage

**Node Colors by Type and Theme**:

| Node Type | Light Mode | Dark Mode |
|-----------|------------|-----------|
| Curation | #D32F2F (Deep Red) | #FF7043 (Light Coral) |
| Swarm | #1976D2 (Strong Blue) | #42A5F5 (Light Blue) |
| Location | #388E3C (Forest Green) | #66BB6A (Light Green) |
| Law Token | #7B1FA2 (Deep Purple) | #BA68C8 (Light Purple) |
| Interpretation Token | #F57C00 (Dark Orange) | #FFB74D (Light Amber) |

---

## Core Concepts

### Hierarchical Node System

Hyvmind organizes content through a five-level hierarchy. Each level serves a specific purpose in the legal annotation workflow:

| Level | Node Type | Description |
|-------|-----------|-------------|
| 1 | Curation | Top-level legal jurisdiction or area of law (e.g., "Indian Arbitration Law") |
| 2 | Swarm | Research topics or collaborative containers (e.g., "Key Definitions") |
| 3 | Location | References to specific legal provisions (e.g., "Section 123 of Act ABC") |
| 4 | Law Token | Extracted legal concepts from location content (auto-generated) |
| 5 | Interpretation Token | User annotations and interpretations of law tokens |

### Node Relationships

Nodes form a parent-child hierarchy:

- **Curation** → **Swarm**: Any authenticated user can create swarms under any curation
- **Swarm** → **Location**: Only swarm creators and approved members can create locations
- **Location** → **Law Token**: Automatically extracted from curly-bracketed text in location content
- **Law Token** → **Interpretation Token**: Only swarm creators and approved members can create interpretations

### Universal Read Access

All nodes are visible to every authenticated user. Write permissions vary by node type and relationship.

---

## Node Hierarchy

### 1. Curation (Top Level)

Curations represent top-level legal categories or jurisdictions. Each curation has:

- **Name**: A descriptive title (e.g., "Indian Arbitration Law")
- **Jurisdiction**: ISO 3166-1 alpha-3 country code (e.g., "IND", "USA", "GBR")

**Who can create**: Any authenticated user

### 2. Swarm

Swarms are collaborative research containers for organizing related annotations. Each swarm has:

- **Name**: A descriptive title (e.g., "Key Definitions", "Important Caselaws")
- **Tags**: Comma-separated keywords for discovery
- **Parent Curation**: Reference to the parent curation

**Naming**: Swarms use global postfix-based naming to ensure uniqueness. If multiple swarms share the same base name across different curations, they receive suffixes (_1, _2, _3, etc.).

**Who can create**: Any authenticated user can create swarms under any curation

### 3. Location

Locations point to specific chunks of positive law. Each location has:

- **Title**: A descriptive name (e.g., "Section 123 - Definition of Appropriate Authority")
- **Content**: The legal text, with curly-bracketed sections auto-extracted as law tokens
- **Custom Attributes**: Key-value pairs for additional metadata

**Law Token Extraction**: When you wrap text in curly brackets like `{definition}` or `{means}`, the system automatically creates Law Token nodes.

**Version Control**: If you create a location with the same title as an existing location in the same swarm, it is automatically renamed with a version suffix (e.g., "Section 123 (v2)").

**Who can create**: Only swarm creators and approved members

### 4. Law Token

Law Tokens are automatically generated from curly-bracketed text in location content. They represent extracted legal concepts:

- **Token Label**: The text inside curly brackets (e.g., "appropriate authority")
- **Parent Location**: The location that contains this token

**Sharing**: A single Law Token can be referenced by multiple locations within the same swarm, creating a shared concept graph.

**Who creates**: Automatically extracted by the system when locations are created or updated

### 5. Interpretation Token

Interpretation Tokens are user annotations that provide context and analysis for law tokens. Each interpretation has:

- **Title**: A descriptive title for the interpretation
- **Context**: Detailed explanation or analysis
- **From Law Token**: Reference to the parent law token with a relationship type (e.g., "defines", "exemplifies")
- **To Node**: Reference to any node in the system with a relationship type (e.g., "references", "applies to")
- **Custom Attributes**: Additional metadata

**Bidirectional Relationships**: Interpretations store both "from" relationships (to law tokens) and "to" relationships (to any node type).

**Who can create**: Only swarm creators and approved members

---

## Frontend Pages

### GraphView (`GraphView.tsx`)

The GraphView displays the knowledge graph as an interactive SVG visualization. It uses a custom SVG-based renderer built for stability and performance.

**Key Features**:
- **Pan and Zoom**: Click and drag to pan, scroll to zoom (10%-400% range)
- **Node Selection**: Click a node to see details in a side panel (shows ID, label, level, connections, and for Locations, the original law token sequence)
- **Node Filtering**: Toggle visibility of specific node types using checkboxes in the Legend panel
- **Layout Options**: Choose from four layout algorithms:
  - **Grid**: Arranges nodes in a rectangular grid pattern
  - **Circle**: Places nodes in a circle around the center
  - **Concentric**: Groups nodes by hierarchy level, with inner levels closer to center
  - **Breadthfirst**: Organizes nodes in rows by hierarchy level (tree-like)
- **Link Distance**: Slider to adjust spacing between connected nodes (50-300 pixels, disabled for Circle and Breadthfirst layouts)
- **Node Size**: Slider to scale node circles (10-40 pixels)
- **Edge Thickness**: Slider to adjust connection line thickness (1-6 pixels)
- **Focus Mode**: Click a node to highlight only its direct connections; click background to reset
- **Node Dragging**: Drag any node to reposition it; connected nodes move together to maintain link distances
- **Vote-Based Filtering**: Nodes with more downvotes than upvotes are automatically hidden from the visualization
- **Collapsible Panels**: Both the Legend/Filters panel and Visualization Controls panel can be collapsed

**Logic Flow**:
1. Fetch graph data using `useGetGraphData()`
2. Fetch vote data for all nodes to determine visibility
3. Filter out discarded nodes (downvotes > upvotes)
4. Build node and link arrays from hierarchical data
5. Apply selected layout algorithm to calculate node positions
6. Render SVG elements:
   - `<line>` elements for edges/relationships
   - `<text>` elements for edge labels (interpretation token relationships)
   - `<circle>` elements for nodes (color-coded by type)
   - `<text>` elements for node labels
7. Handle user interactions:
   - `mousedown`/`mousemove`/`mouseup` for pan and node drag
   - `wheel` for zoom
   - `click` for node selection and focus
8. Persist preferences (filters, layout, controls) to sessionStorage

**SVG Structure**:
```svg
<svg>
  <g transform="translate(pan.x, pan.y) scale(zoom)">
    <!-- Edges layer -->
    <g>{links.map(link => <line />)}</g>
    <!-- Edge labels layer -->
    <g>{links.map(link => <g><rect/><text/></g>)}</g>
    <!-- Nodes layer -->
    <g>{nodes.map(node => <g><circle/><text/></g>)}</g>
  </g>
</svg>
```

### TreeView (`TreeView.tsx`)

The TreeView displays the hierarchical structure in an expandable tree format.

**Key Features**:
- **Hierarchical Navigation**: Expand/collapse nodes at any level
- **Inline Creation**: Quick-create child nodes from any parent
- **Vote Display**: See upvote/downvote counts next to each node
- **Discarded Section**: Collapsible section for nodes with more downvotes than upvotes
- **Export**: Download tree data as JSON
- **Shared Law Token Indicators**: Highlight law tokens used by multiple locations

**Logic Flow**:
1. Fetch graph data and all vote data
2. Filter nodes based on vote counts (hide discarded nodes from main tree)
3. Build parent-child relationship maps
4. Render recursive TreeNode components
5. Handle export by serializing graph data to JSON

### BuzzLeaderboard (`BuzzLeaderboard.tsx`)

The BuzzLeaderboard displays user rankings based on BUZZ points earned.

**Key Features**:
- **Ranked Table**: Users sorted by BUZZ score in descending order
- **Rank Icons**: Trophy, medal, and award icons for top 3 positions
- **Profile Names**: Display user profile names when available
- **Point Breakdown**: Explanation of how points are earned and lost

**Logic Flow**:
1. Fetch leaderboard data using `useGetBuzzLeaderboard()`
2. Render table with rank, user info, and score columns
3. Apply conditional styling for top 3 positions

### OntologiesView (`OntologiesView.tsx`)

The OntologiesView displays the RDF/OWL ontology specifications for the system.

**Key Features**:
- **Core Ontology**: Collapsible section showing the base ontological model
- **Swarm-Specific Ontologies**: Dynamic panels for each swarm showing its extended ontology
- **RDF Triple Display**: Shows classes, properties, and individuals in Turtle syntax
- **Download Functionality**: Export ontology as Turtle (.ttl) files

---

## Core Hooks

### Profile Management

#### `useGetCallerUserProfile()`

Fetches the current user's profile information.

**Returns**: User profile data including profile name and social URL, or null if no profile exists.

**Logic**:
- Queries the backend for the authenticated user's profile
- Returns loading state during fetch
- Caches result for subsequent access

#### `useSaveCallerUserProfile()`

Creates or updates the current user's profile.

**Parameters**: Profile object with name and optional social URL.

**Logic**:
- Sends profile data to backend for storage
- Invalidates profile cache on success
- Triggers leaderboard refresh

### Graph Data Queries

#### `useGetGraphData()`

Fetches the complete graph data for authenticated users.

**Returns**: All curations, swarms, locations, law tokens, interpretation tokens, and edges.

**Logic**:
- Queries backend for full graph structure
- Disables automatic refetching (manual refresh only)
- Caches data indefinitely until manually invalidated
- Used by GraphView and TreeView

#### `useGetPublicGraphData()`

Fetches graph data without authentication (for public access).

**Returns**: Same structure as `useGetGraphData()` but accessible without login.

**Logic**:
- Creates anonymous actor without identity
- Used by VoronoiDiagram for public landing page
- Includes 1-minute stale time for caching

### Node Creation Mutations

#### `useCreateCuration()`

Creates a new top-level curation.

**Parameters**: `{ name: string; jurisdiction: string }`

**Logic**:
- Validates input before submission
- Invalidates graph data on success
- Displays toast notification on completion

#### `useCreateSwarm()`

Creates a new swarm under a curation.

**Parameters**: `{ name: string; tags: string[]; parentCurationId: string }`

**Logic**:
- Parses comma-separated tags into array
- Backend handles global postfix naming for uniqueness
- Invalidates graph data and swarms-by-creator cache

#### `useCreateLocation()`

Creates a new location under a swarm.

**Parameters**: `{ title: string; content: string; customAttributes: CustomAttribute[]; parentSwarmId: string }`

**Logic**:
- Validates curly bracket syntax before submission
- Extracts law token sequence from content
- Automatically creates Law Token nodes from `{...}` patterns
- Implements version control (appends (v2), (v3), etc. for duplicates)
- Waits 500ms after creation for law token propagation
- Invalidates all related caches on success

#### `useCreateInterpretationToken()`

Creates a new interpretation token under a law token.

**Parameters**: `{ title: string; context: string; fromLawTokenId: string; fromRelationshipType: string; toNodeId: string; toRelationshipType: string; customAttributes: CustomAttribute[] }`

**Logic**:
- Validates all required fields before submission
- Creates bidirectional relationships (from law token, to target node)
- Invalidates graph and leaderboard caches

### Voting Queries and Mutations

#### `useGetVoteData(nodeId)`

Fetches upvote and downvote counts for a specific node.

**Returns**: `{ upvotes: bigint; downvotes: bigint }`

**Logic**:
- Always fetches fresh data (no caching)
- Returns 0/0 if vote data doesn't exist

#### `useHasUserVoted(nodeId)`

Checks if the current user has voted on a node.

**Returns**: `boolean` or `null` (null = haven't voted, true = upvoted, false = downvoted)

**Logic**:
- Used to disable voting buttons after user has voted
- Returns null for unauthenticated or unvoted state

#### `useUpvoteNode()`

Records an upvote for a node.

**Parameters**: `nodeId: string`

**Logic**:
- Triggers backend upvote function
- Invalidates all vote-related caches for global sync
- Updates BUZZ leaderboard cache
- One-time vote per user per node

#### `useDownvoteNode()`

Records a downvote for a node.

**Parameters**: `nodeId: string`

**Logic**:
- Identical to upvote but decrements BUZZ points
- Same one-time voting restriction

### Swarm Membership Hooks

#### `useGetSwarmMembers(swarmId)`

Fetches the list of approved members for a swarm.

**Returns**: Array of principal IDs for approved members

**Logic**:
- Used to check if current user has write access
- Cached by swarm ID

#### `useGetSwarmMembershipRequests(swarmId)`

Fetches pending membership requests for a swarm.

**Returns**: Array of `MembershipInfo` objects with requester details

**Logic**:
- Only swarm creators can view requests
- Used by SwarmMembershipManager

#### `useRequestToJoinSwarm()`

Submits a membership request to a swarm.

**Parameters**: `swarmId: string`

**Logic**:
- Creates pending request for swarm creator review
- Invalidates membership caches

#### `useApproveJoinRequest()`

Approves a pending membership request.

**Parameters**: `{ swarmId: string; member: Principal }`

**Logic**:
- Only swarm creators can approve
- Converts various principal formats to proper Principal object
- Invalidates member list and request caches

### BUZZ Leaderboard

#### `useGetBuzzLeaderboard()`

Fetches the user reputation rankings.

**Returns**: Array of `{ principal: Principal; score: bigint; profileName: string | null }`

**Logic**:
- Sorted by BUZZ score descending
- Refreshes on window focus
- 30-second stale time

### Custom Attribute Search

#### `useGetAllCustomAttributeKeys()`

Fetches all unique attribute keys used in the system.

**Returns**: Array of string keys

**Logic**:
- Used by SearchModal for autocomplete dropdown
- Cached for 1 minute

#### `useGetAttributeValuesForKey(key)`

Fetches all values for a specific attribute key.

**Returns**: Array of string values

**Logic**:
- Enables value autocomplete after key selection

---

## Key Components

### CreateNodeDialog (`CreateNodeDialog.tsx`)

A multi-step dialog for creating any node type in the hierarchy.

**Key Features**:
- **Type Selection**: Dropdown to choose node type
- **Parent Selection**: Context-aware parent picker (Curation for Swarm, Swarm for Location, etc.)
- **Current Path Display**: Shows full hierarchy path (e.g., "Indian Arbitration Law → Key Definitions → Section 123")
- **Dynamic Form Fields**: Different fields for each node type
- **ISO Country Selector**: Dropdown with all ISO 3166-1 alpha-3 codes for curation jurisdiction
- **Tag Input**: Comma-separated tags for swarm discovery
- **Custom Attributes**: Dynamic key-value pairs with add/remove functionality
- **Law Token Info**: Helper text explaining curly bracket syntax for location content
- **Validation**: Real-time validation before submission
- **Error Handling**: User-friendly error messages for common failures

**Logic Flow**:
1. User selects node type from dropdown
2. Form updates to show relevant fields
3. Parent dropdown populates with valid options
4. User fills in required fields
5. Validation runs on submit attempt
6. Mutation creates node and invalidates caches
7. Form resets and dialog closes on success

### VoronoiDiagram (`VoronoiDiagram.tsx`)

A canvas-based visualization displayed on the landing page for unauthenticated users.

**Key Features**:
- **Voronoi Tessellation**: Each region contains nodes of a single type
- **24-Hour Caching**: Stores graph data in localStorage for 24 hours
- **Theme Adaptation**: Colors adjust to light/dark mode
- **Seed-Based Positioning**: Node positions are deterministically generated from node IDs
- **Antialiased Edges**: Smooth boundaries between regions
- **Interactive Tooltips**: Hover over seed points to see node info
- **Fallback Mode**: Uses cached data when network is unavailable

**Logic Flow**:
1. Check localStorage for cached data with timestamp
2. If cache valid (< 24 hours), use cached data immediately
3. If cache invalid, fetch fresh data from anonymous actor
4. Store fresh data in localStorage with timestamp
5. Generate normalized (0-1) coordinates using seeded random from node ID
6. Render Voronoi diagram using pixel-by-pixel approach
7. Handle mouse move for tooltip positioning

### VotingButtons (`VotingButtons.tsx`)

A component for displaying and recording votes on nodes.

**Key Features**:
- **Vote Counts**: Shows upvote and downvote numbers
- **One-Time Voting**: Buttons disable after user votes
- **Creator Auto-Upvote**: Nodes automatically receive an upvote from creator
- **Three Display Modes**: Compact interactive, compact non-interactive, full interactive
- **Loading State**: Spinner while vote data loads
- **Disabled State**: Greyed out after voting

**Logic Flow**:
1. Fetch vote data and user's voting status
2. Render buttons with current counts
3. On click, call appropriate mutation (upvote/downvote)
4. Disable buttons after successful vote
5. Show toast notification on success/error

### SwarmMembershipButton (`SwarmMembershipButton.tsx`)

A button that handles swarm membership requests.

**Key Features**:
- **Join/Requested/Joined States**: Shows different button text based on membership status
- **One-Click Request**: Simple request submission
- **Visual Feedback**: Loading states and toast notifications

**Logic Flow**:
1. Check current user's membership status
2. Render appropriate button state
3. On click, call request or show membership info

### SwarmMembershipManager (`SwarmMembershipManager.tsx`)

A management interface for swarm creators to handle membership requests.

**Key Features**:
- **Pending Requests List**: Shows all pending requests with profile names
- **Approve Actions**: One-click approval for requests
- **Member List**: View all approved members
- **Profile Integration**: Shows requester's profile name when available

### Header (`Header.tsx`)

The main navigation header with view tabs and user controls.

**Key Features**:
- **View Switching**: Graph, Tree, Membership, Ontologies, and BUZZ tabs
- **Create Node Button**: Opens CreateNodeDialog
- **Theme Toggle**: Light/dark mode switch
- **User Menu**: Profile settings and logout

### SearchModal (`SearchModal.tsx`)

A modal for searching nodes by custom attributes.

**Key Features**:
- **Key Autocomplete**: Dropdown of existing attribute keys
- **Value Autocomplete**: Dropdown of values for selected key
- **Results List**: Clickable search results with node info
- **Keyboard Navigation**: Tab-based form navigation

### DataResetDialog (`DataResetDialog.tsx`)

An admin-only dialog for resetting all application data.

**Key Features**:
- **Confirmation Dialog**: Prevents accidental resets
- **Full Data Clear**: Removes all nodes, memberships, profiles, and scores

---

## BUZZ Points System

BUZZ is Hyvmind's internal reputation and reward system. Users earn BUZZ for creating valuable content and receiving positive votes.

### Earning BUZZ

| Action | BUZZ Earned |
|--------|-------------|
| Create a Law Token | +3 BUZZ |
| Create an Interpretation Token | +5 BUZZ |
| Receive an upvote on your Law Token | +1 BUZZ |
| Receive an upvote on your Interpretation Token | +2 BUZZ |

### Losing BUZZ

| Action | BUZZ Lost |
|--------|-----------|
| Receive a downvote on your Law Token | -1 BUZZ |
| Receive a downvote on your Interpretation Token | -2 BUZZ |

### Leaderboard

The BUZZ Leaderboard displays users ranked by their total BUZZ score. Scores can be negative if a user receives more downvotes than upvotes.

---

## Voting System

### How Voting Works

1. **Automatic Creator Upvote**: When a user creates any node (except Curations), they automatically upvote it
2. **One Vote Per User**: Each user can vote only once per node (up or down)
3. **Irreversible**: Votes cannot be changed or removed once cast
4. **Global State**: Vote counts are synchronized across all users

### Vote-Based Visibility

Nodes with more downvotes than upvotes are:
- **Hidden from GraphView**: Not displayed in the graph visualization
- **Moved to Discarded Section**: Appear in a collapsed "Discarded" section in TreeView

Nodes with equal or more upvotes than upvotes remain visible in both views.

### Voting Restrictions

- **Curations**: Cannot be voted on (no voting buttons displayed)
- **Read-Only Mode**: Voting disabled in public/unauthenticated view
- **Non-Members**: Cannot vote on nodes in swarms they don't belong to

---

## Swarm Membership

### Membership Levels

1. **Creator**: The user who created the swarm (full access)
2. **Approved Member**: Users who requested and received approval (full access)
3. **Pending Request**: Users who requested but awaiting approval (no access)
4. **Non-Member**: Users with no relationship to the swarm (no access)

### Access Control

| Node Type | Creator | Approved Member | Non-Member |
|-----------|---------|-----------------|------------|
| Create Swarm | Yes (under any curation) | Yes | Yes |
| Create Location | Yes | Yes | No |
| Create Interpretation Token | Yes | Yes | No |
| View Nodes | Yes (all users) | Yes (all users) | Yes (all users) |

### Membership Workflow

1. User sees a swarm and clicks "Join Swarm"
2. Request is submitted to swarm creator
3. Creator sees request in SwarmMembershipManager
4. Creator approves the request
5. User becomes approved member with full access

---

## Summary

Hyvmind combines hierarchical knowledge organization with incentive-based contribution to create a collaborative legal research platform. The five-level node structure (Curation → Swarm → Location → Law Token → Interpretation Token) enables structured legal annotation, while the BUZZ points system rewards contributors for creating valuable content. The voting system ensures quality control through community curation, and the swarm membership model enables collaborative research within controlled access groups.

---

## License

Copyright (c) Anshuman Singh, 2026. Licensed under CC-BY-SA 4.0.

See [LICENSE](LICENSE) and [NOTICE](NOTICE) for full license and attribution details.
