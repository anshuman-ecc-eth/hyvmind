# Hyvmind Latest Stable Build

## Overview
Hyvmind is a research-to-earn platform designed for lawyers to create and manage tokenized semantic annotations through source-text creation and legal domain specialization.

## Document Title and Meta Description
The application HTML document head configuration:
- **Document title**: The `<title>` tag in `frontend/index.html` should be set to `"hyvmind"`
- **Meta description**: The application meta description in `frontend/index.html` should be set to "hyvmind"

## Dynamic Favicon System
The application implements a dynamic favicon system that switches based on user's color scheme preference:
- **Light mode favicon**: Uses `hyvmind_logo black, transparent-1.png` from the `/assets` directory when user prefers light mode
- **Dark mode favicon**: Uses `hyvmind_logo white, transparent-1.png` from the `/assets` directory when user prefers dark mode
- **Dynamic switching**: Implemented via CSS media query with `prefers-color-scheme` or inline script to detect and switch favicon based on system theme preference
- **Proper asset referencing**: Both favicon files are correctly referenced from the `/assets` directory with proper path resolution

## Typography
The application uses a dual font system for optimal readability and branding:
- **Landing page**: **Alegreya Sans** font family applied exclusively to maintain the distinctive branding aesthetic
- **Internal application views**: **Inter** or **Open Sans** font family applied consistently across Dashboard, Graph View, Swarm Detail View, Account Settings, Ontology Builder, and all other internal components for improved legibility
- **Global font configuration**: The chosen sans-serif font (Inter or Open Sans) is configured globally in `index.css` and Tailwind theme configuration
- **Consistent typography**: Uniform sizing, spacing, and weight maintained across all internal components for a clean, unified reading experience
- **Smaller font sizes**: Maintained across all text elements for a compact, elegant appearance consistent with the current aesthetic

## Backend Build System and Module Structure
The backend implements a robust module architecture with proper import resolution and build validation exactly as specified in Draft 165:

### Core Module Organization
- **Main entry point**: `backend/main.mo` serves as the primary canister entry point with all public API endpoints
- **Storage module**: `backend/Storage.mo` contains all data type definitions, state management, and persistence logic
- **Migration module**: `backend/migration.mo` handles data migration and version management operations
- **Authorization module**: `backend/authorization.mo` manages access control, user permissions, and security validation
- **Blob storage module**: `backend/blob-storage.mo` handles file storage, image management, and binary data operations

### Import Path Resolution
- **Relative imports**: All backend modules use correct relative path imports (e.g., `import Storage "./Storage"`)
- **Standard library imports**: Proper references to Motoko standard library modules (e.g., `import Map "mo:base/HashMap"`)
- **Inter-module dependencies**: Clean dependency graph with no circular imports between modules
- **Build artifact generation**: Compiler correctly resolves all imports and generates proper deployment artifacts

### Module Dependency Validation
- **main.mo dependencies**: Correctly imports Storage, authorization, and blob-storage modules with proper path resolution
- **Storage.mo isolation**: Contains only data structures and state management without circular dependencies
- **migration.mo integration**: Properly references Storage module for data migration operations
- **authorization.mo integration**: Clean integration with main.mo for access control without circular references
- **blob-storage.mo integration**: Proper file handling integration with main canister logic

### Build Process Verification
- **Compiler validation**: All Motoko files compile successfully with resolved imports and dependencies
- **Deployment readiness**: Backend generates proper WebAssembly artifacts for Internet Computer deployment
- **Module linking**: All inter-module references resolve correctly during compilation
- **Path consistency**: Consistent use of relative paths and proper module naming conventions
- **Error-free compilation**: No unresolved imports, missing dependencies, or circular reference errors

## Complete Data Reset and Clean State Initialization
The application implements comprehensive data reset functionality with complete state clearing:
- **Backend reset execution**: The existing `resetAllData()` admin function is executed to completely clear all stored user profiles, swarms, annotations, approvals, access control state, locations, digital assets, frames, and tokens
- **Counter reset**: All counters like nextSwarmId, nextAnnotationId, nextLocationId, nextAssetId, nextFrameId, and nextTokenId are reset back to zero
- **Access control reinitialization**: adminAssigned is reset to false to allow fresh admin assignment on next initialization
- **Frontend state clearing**: All cached user data, authentication state, session information, and local storage is completely cleared
- **Clean authentication flow**: Users must authenticate with fresh Internet Identity logins using new principal IDs
- **Empty state preloading**: The application loads with zero data everywhere - empty dashboard, no annotations, no swarms, no properties, no user profiles, no locations, no digital assets, no frames, no tokens
- **Fresh user experience**: All users are treated as first-time users requiring new profile setup through ProfileSetupModal
- **Clean canister state**: The backend canister returns to its initial empty state with no historical data
- **Local storage clearing**: All browser local storage, session storage, and cached data is cleared before reinitializing user profiles
- **Session corruption prevention**: Complete clearing of residual session data to prevent authentication issues

## Authentication - Simplified Single-Step Implementation
The application uses Internet Identity with a streamlined, single-step authentication architecture:

- **useInternetIdentity Hook**: Manages only authentication state including `principal`, `isAuthenticated`, `isInitializing`, and `reconnect` function without direct backend actor initialization
- **Single authentication step**: Users authenticate once via Internet Identity with clean, reliable login flow
- **Automatic session restoration**: On application load, automatically attempts to restore existing Internet Identity sessions with proper timeout handling
- **Clean recovery cycle**: If session restoration fails after timeout, performs a clean logout/login reset cycle without infinite retry loops
- **Principal-based identity mapping**: User identity mappings are based on Internet Identity principal IDs, ensuring consistent profile retrieval across login sessions
- **First-time user flow**: All users without existing profiles are prompted to create a username through the ProfileSetupModal during their first session since all data has been reset
- **Data preservation**: All existing data in the canister is maintained safely with no deletions during normal operation, but completely cleared during reset
- **Session persistence**: Authenticated principal and profile data are stored securely and persist across navigation and browser reloads within the same session
- **Direct dashboard navigation**: After successful login and profile setup, users are redirected directly to the Dashboard view
- **No initialization loops**: Authentication completes cleanly without "Initializing" states or loading loops
- **Stable session management**: Authentication state is maintained reliably without reauthentication requirements within the session
- **Clean logout**: Users can logout through the Account Settings dialog, clearing session state and returning to landing page
- **Simplified connection message**: Displays only "Connecting to backend…" during actor initialization without retry loops
- **Immediate actor verification**: Actor creation is verified immediately after successful authentication
- **Clean logout handling**: Proper session cleanup and state clearing for future login reliability

## Actor Connection Management - Simplified Implementation
The application implements streamlined actor connection management with clear separation of concerns:

- **useActor Hook**: Handles backend actor creation, identity change detection, and React Query cache clearing with simplified functionality
- **Single actor creation**: Backend actor is created exactly once per session and used consistently across all dashboard views
- **Identity change detection**: Actor automatically detects principal changes and clears React Query cache appropriately
- **Stable backend connectivity**: Actor connection remains stable throughout the session without redundant reconnection attempts
- **Cache management**: React Query cache is cleared only when necessary (identity changes) to maintain data consistency
- **Clean state management**: Actor state is managed independently from authentication state for clear separation of concerns
- **Consistent actor usage**: Same actor instance is used across all backend operations within a session
- **Reliable connection**: Actor connection is established once and maintained reliably without frequent re-initialization
- **Simplified backend binding**: After Internet Identity authentication, the app waits exactly once for actor initialization and proceeds immediately when ready
- **Single interim message**: Displays "Connecting to backend…" during backend binding instead of repeated reconnect attempts
- **No redundant retries**: Removes redundant readiness checks and asynchronous retries from actor creation logic
- **Immediate verification**: Actor readiness is verified immediately after creation without delay loops

## App Architecture - Simplified Implementation
The application implements simplified app architecture for stable operation:

- **App.tsx Simplification**: Waits for `isAuthenticated && isActorReady` before rendering main app content
- **Clean conditional rendering**: Main application content only renders when both authentication and actor are ready
- **Stable loading states**: Clear loading indicators while waiting for authentication and actor readiness
- **Direct content access**: Once ready conditions are met, users have direct access to all application features
- **Consistent state checking**: All components can rely on both authentication and actor being ready when app content is rendered
- **Frontend re-render protection**: Prevents frontend re-renders (including those from the D3.js graph) from re-triggering authentication
- **Local storage clearing**: Complete clearing of browser storage before initializing new user sessions
- **Session corruption prevention**: Comprehensive cleanup of cached data to ensure clean authentication flow

## Navigation
The application includes a persistent header navigation component with:
- **Home icon positioned in the top-left area of the navigation bar that navigates directly to the Dashboard view when clicked**
- **Minimal line-based three-node knowledge graph icon button positioned next to the Home icon in the top navigation that links directly to the Graph view with consistent spacing and hover effects using the same style as other top-bar buttons, featuring a visually consistent design with the same stroke width, outline weight, and size as the home icon, monochrome and theme-aware with black at 80% opacity in light mode and white at 90% opacity in dark mode for balance, with proper spacing and alignment so both icons appear visually centered and stylistically consistent**
- **Ontology Builder icon positioned next to the Graph icon in the top navigation that links directly to the Ontology Builder view with consistent spacing and hover effects using the same style as other top-bar buttons, featuring a visually consistent design with the same stroke width, outline weight, and size as the home and graph icons, monochrome and theme-aware with black at 80% opacity in light mode and white at 90% opacity in dark mode for balance**
- **Account circular icon positioned to the right of the hamburger menu icon in the top right corner**
- Hamburger menu icon containing "Graph" and "Ontology Builder" navigation options (Explore removed)
- **Enhanced navigation button sizing with increased padding, icon dimensions, and font size for improved visibility and accessibility across all interactive elements in the header**
- **Proportionally scaled home button, graph button, ontology builder button, theme toggle, hamburger menu, and account/settings button maintaining balanced spacing and visual harmony**
- **Consistent larger sizing adjustments that preserve existing styling, positioning, and icons while improving user interaction without disrupting layout alignment or responsiveness**
- Navigation buttons styled consistently with minimalist grayscale design
- Subtle hover effects maintaining the monochrome aesthetic
- Login state preserved when navigating between views

## Account Settings Access
- **Account circular icon in header opens a compact dropdown or modal**
- **Account dropdown/modal contains all account-specific settings:**
  - **Dashboard navigation item that redirects users to the main Dashboard view**
  - **Identity Management tab with Internet Identity management, username creation/editing, linked credentials, and profile information**
  - **Asset Management tab with crypto wallet connections using Push Wallet integration, user's total credits display, and list of approved annotations with scrollable content area to prevent overflow when many items or credits are shown**
  - **Logout button positioned within the Account Settings dialog for centralized account management**
- **Settings functionality remains fully accessible through Account icon menu**
- **Account dropdown/modal styled consistently with application's minimalist grayscale design**
- **Username field automatically preloads current user profile data when Account Settings opens, using getCallerUserProfile endpoint or creating new profile if none exists**
- **Username update operations only execute after actor and user profile are fully initialized and loaded**
- **Proper loading states displayed during profile data retrieval and username updates with save button disabled during operations**
- **Comprehensive error handling with fallback mechanisms to prevent null actor or profile references**
- **Success toast notification or visual confirmation displayed immediately after successful username updates**
- **Profile state refreshes automatically upon successful username updates with persistent backend storage**
- **Username changes are immediately synchronized with backend and reflected in all frontend components**
- **Edit Name button functionality in Profile Information section is fully interactive and not greyed out, correctly opens editable input field and properly saves updated usernames using the existing useUpdateCallerUsername hook**

## Main Application Views

### Dashboard View
Central user profile view displayed after successful authentication with **notebook manager interface design**, **collapsible right sidebar**, and **left sidebar Control Panel**:
- **Dashboard page heading displays "Dashboard" without any accompanying description text**
- **Left sidebar Control Panel with collapsible functionality:**
  - **"My Annotations" section displaying all annotations created by the current user**
  - **"My Locations" section displaying all locations created by the current user**
  - **Each annotation item shows content preview and current visibility status (public/private)**
  - **Each location item shows title and creation date**
  - **Edit and Delete buttons beside each annotation and location item**
  - **Visibility toggle button for each annotation to switch between public and private**
  - **Edit restrictions: annotations that are public and have been approved by other users show "Fork" button instead of "Edit" button**
  - **Fork functionality creates a new annotation with identical content but new ID and current user as creator**
  - **Collapsible sections within the Control Panel for better organization**
  - **Sidebar toggle functionality allowing users to collapse and expand the left Control Panel**
  - **Consistent styling with application's minimalist grayscale design and theme compatibility**
- **My Swarms displayed as fully interactive notebook cards**: Each swarm appears as a distinct notebook card that is renameable and visually distinct by color or icon, resembling physical notebook covers in a notebook manager interface with full click functionality to open or expand details
- **Interactive notebook card behavior**: Notebook cards are fully clickable and responsive to hover and click events, allowing users to interact with them to view details or expand content while remaining within the Dashboard context
- **Accurate annotation count display**: Each notebook card displays the correct number of annotations tied to that specific swarm, with counts updating dynamically using existing query hooks to reflect real-time data
- **Notebook card customization**: Each notebook card includes a **colour palette button** that opens a clean popover menu displaying a set of selectable colour options for users to customize the notebook card's background or accent colour
- **Colour selection functionality**: Users can select a colour from the popover menu to instantly update the notebook card's appearance, with the chosen colour persisting in the frontend state per session
- **My Annotations displayed as pages within notebooks**: Each annotation appears as a page within its corresponding swarm notebook, visually grouped under the appropriate swarm card to show the hierarchical relationship between swarms (notebooks) and annotations (pages)
- **Notebook-style layout**: Overall page design evokes a notebook browsing and management interface with visual cues that make swarms feel like individual notebooks and annotations like pages within those notebooks
- **Notebook cards display "Annotations" instead of "Pages" in all text labels (e.g., "Annotations (0)" instead of "Pages (0)" and "No annotations yet" instead of "No pages yet")**
- **Notebook card interactions remain within Dashboard context**: When users click on notebook cards, color palette selection, or annotation lists, they stay on the Dashboard page without being redirected to other views
- **Collapsible right sidebar with single section:**
  - **"Explore Public Swarms" section displaying buttons or cards showing all public swarms (reusing ExploreView logic) with balanced spacing and alignment adjustments to maintain visual harmony**
- **Sidebar toggle functionality allowing users to collapse and expand the right sidebar**
- Clean interface with minimal, solid background that matches the current theme
- Stable loading without initialization loops
- Direct access to other application views through navigation
- **Reliable data loading that waits for user identity confirmation before fetching and displaying user-specific content**
- **Empty state display**: When no swarms or annotations exist (after data reset), displays appropriate empty state messages like "No notebooks yet" and "Create your first notebook to get started"

### Graph View
Interactive visualization component accessible through hamburger menu and direct Graph icon button that displays:
- **D3GraphCanvas component with enhanced zoom, interaction behavior, and clustered hierarchical location tree:**
  - **D3.js-powered graph visualization embedded within a React component `D3GraphCanvas` that initializes and manages D3 logic within a `useEffect` hook attached to a `ref` instead of the React DOM tree**
  - **D3 rendering engine completely detached from React state changes aside from explicit props updates to avoid triggering authentication re-initialization**
  - **Component updates only when graph data or selected theme changes, preventing re-renders that could affect authentication**
  - **Modified zoom behavior: zooming occurs with Shift + Scroll instead of normal scroll, allowing normal page scrolling without interfering with graph zoom**
  - **Smooth interactive zoom and pan functionality implemented through D3.js with Shift+Scroll zoom control**
  - **Entity titles displayed as visible text labels positioned next to or within their corresponding circles for all entities, annotations, swarm nodes, and location nodes**
  - **Text labels styled consistently with theme colors and remain readable at different zoom levels**
  - **All entities, annotations, and locations are clickable, triggering highlight or selection events without affecting authentication or causing re-renders**
  - **Click interactions emit events to the right sidebar for displaying details while maintaining D3 performance isolation**
  - **Annotation circles (encapsulated tokens and relations) are interactive and clickable, displaying outline or selection state when clicked**
  - **Click interactions preserve existing zoom, pan (Shift + Drag), and Shift + Scroll functionality without interference**
- **Enhanced annotation visualization within swarms:**
  - **Each annotation within a swarm is rendered as a smaller circle encapsulating its tokens and relations inside the larger swarm boundary**
  - **Annotation circles maintain consistent theme colors and layout stability within swarm boundaries**
  - **Smaller annotation circles positioned within swarm encapsulation boundaries without overlapping or visual conflicts**
  - **Annotation titles displayed as visible text labels showing the token sequence**
- **All swarms represented as encapsulating circles or shells that visually contain their corresponding entities and relations inside them, rather than displaying swarms as standalone nodes**
- **Swarm encapsulating circles dynamically scale in size based on the number or spread of entities and relations they contain**
- **Swarm titles displayed as visible text labels positioned near or within the swarm boundaries**
- **Entities from annotations displayed as nodes within their respective swarm boundaries with size based on approval score**
- **Entity titles displayed as visible text labels positioned next to or within entity nodes**
- **Relations from annotations displayed as edges connecting entity nodes within swarm boundaries with thickness based on approval score**
- **Enhanced clustered hierarchical location tree visualization:**
  - **Locations displayed as independent nodes ALWAYS positioned outside swarm circles in a separate outer layer or peripheral orbit, distinct from swarm boundaries**
  - **Location titles displayed as visible text labels positioned next to or within location nodes**
  - **Locations organized in a clustered hierarchical tree structure that visually represents parent-child-sibling relationships with clear spatial grouping**
  - **Sibling locations clustered horizontally at the same hierarchical level with consistent spacing and alignment**
  - **Parent-child relationships displayed as directional "includes" edges connecting parent nodes to child nodes vertically**
  - **Hierarchical consistency enforcement: if entities A and B are siblings and C is a parent of B, the graph clearly shows C also as a parent of A through proper edge connections**
  - **Tree layout algorithm that maintains consistent hierarchical positioning with siblings grouped horizontally and parent-child links displayed vertically**
  - **Location node positioning algorithms ensure locations are placed in external positions, never inside swarm encapsulation boundaries, while maintaining the clustered hierarchical tree structure**
  - **Sibling relationship visualization through horizontal clustering and shared parent connections rather than direct sibling edges**
  - **Clear visual hierarchy with root locations at the top, intermediate levels in the middle, and leaf locations at the bottom of the tree structure**
- **Annotation-location links displayed as dashed purple edges connecting from annotation circles (inside swarms) outward to external location nodes**
- **Visual links from annotations to locations extend from the encapsulated circles inside swarms to the external location nodes with distinct dashed purple styling**
- **Enhanced visual quality with smoother node geometry, improved spacing, and clear color contrast that respects both dark and light modes**
- **Unified entity colors where all entity types (semantic annotation entities and location nodes) follow the selected color theme consistently with nodes using the same color shade per the current theme**
- **Text contrast automatically switches to black text in light mode and white text in dark mode for improved readability across all entity types**
- **Interactive functionality allowing users to hover over nodes to view annotation, swarm, or location details, drag nodes slightly for repositioning within boundaries, and click nodes to open related detail views**
- **Entity node click functionality that opens a collapsible right sidebar displaying all annotations associated with that entity**
- **Location node click functionality that opens a collapsible right sidebar displaying location details, hierarchy information, and linked annotations**
- **Right sidebar appears when an entity or location node is clicked and displays:**
  - **For entities: List of all annotations where the clicked entity appears**
  - **For locations: Location title, content, metadata, parent/child relationships, and all linked annotations**
  - **Compact scrollable list with token sequence formatting for each annotation**
  - **Clear display showing the tokens and linked entity for each annotation**
  - **Annotation properties displayed as compact key–value pairs below each annotation**
  - **Location metadata displayed as compact key–value pairs**
  - **Consistent design matching the Dashboard's right sidebar styling and theme compatibility**
  - **Collapsible behavior with toggle functionality**
  - **Automatic closure when clicking outside the sidebar or deselecting the entity/location**
- **Existing node and edge behaviors (colors, hover info, drag interactions) maintained within each swarm's encapsulating boundary**
- **Theme-aware styling and layout responsiveness preserved within the encapsulated design**
- **Filters button that opens a modal or dropdown allowing users to filter nodes by annotation entities, relations, jurisdiction, properties, and locations dynamically populated from the backend**
- **Graph filter modal with comprehensive filtering system:**
  - **Token dropdown dynamically populated by `getAllTokens` backend query showing all unique tokens from all annotations**
  - **Annotation Type dropdown with options for "Positive Law" and "Interpretation"**
  - **Jurisdiction dropdown dynamically populated by `getAllJurisdictions` backend query showing all unique jurisdictions from all swarms**
  - **Property Key dropdown dynamically populated by `getAllPropertiesKeys` backend query showing all unique property keys from all annotations**
  - **Property Value dropdown dynamically populated by `getAllPropertiesValues` backend query showing all unique property values from all annotations**
  - **Location dropdown dynamically populated by `getAllLocations` backend query showing all locations by title**
  - **Location Metadata Key dropdown dynamically populated showing all unique metadata keys from all locations**
  - **Location Metadata Value dropdown dynamically populated showing all unique metadata values from all locations**
  - **Property-based filtering that allows users to filter annotations by specific property keys and/or values**
  - **Location-based filtering that allows users to filter by location title, metadata keys, and metadata values**
  - **Selected filters correctly update the graph through the existing `getAnnotationsByFilters` query with support for jurisdiction, property, location, and annotation type filtering**
- **Three preset color themes for graph visualization:**
  - **Warm theme with amber and honey tones for nodes, relations, swarm boundaries, and location nodes**
  - **Cool theme with teal and indigo tones for nodes, relations, swarm boundaries, and location nodes**
  - **Neutral theme with grays and golden accents for nodes, relations, swarm boundaries, and location nodes**
- **Color theme selector positioned near graph view controls as a simple toggle or dropdown**
- **Dynamic theme switching that updates visualization colors without requiring graph reload**
- **Color accessibility ensuring sufficient contrast ratios for readability in both light and dark modes across all three themes**
- **Theme-specific color palettes that adjust node colors, relation edge colors, swarm encapsulation colors, and location node colors while maintaining visual hierarchy and approval score-based sizing**
- **Export functionality with Export button or dropdown menu positioned in the Graph View interface that does not overlap with the right sidebar or color theme selector**
- **Export scope options:**
  - **Full view export (entire dataset - all swarms, entities, relations, and locations)**
  - **Current view export (only data currently shown on screen after filters are applied)**
- **Export format options:**
  - **JSON format with structured graph data including nodes, edges, annotations, locations, and properties**
  - **JSON-LD (JSON Linked Data) format with appropriate context mappings for entities, relations, locations, and properties**
  - **CSV format with flattened key-value rows: tokens, annotation type, swarm, propertyKey, propertyValue, linkedLocationIds**
- **Dynamic file naming for downloads (e.g., hyvmind-graph-full.json, hyvmind-graph-filtered.jsonld, hyvmind-graph-current.csv)**
- **Export interface styled consistently with application's minimalist grayscale design and theme compatibility**
- **Export data retrieval using backend queries `getGraphDataForExport` for full dataset and `getFilteredGraphDataForExport` for current filtered view, both including location data**
- **Export data conversion handled by `lib/exportUtils.ts` utility functions for JSON, JSON-LD, and CSV format generation including location information**
- **File download functionality integrated with proper browser download handling and progress indicators**
- **Real-time graph updates that immediately display newly created locations as independent nodes in the correct external position outside swarms**
- **Dynamic graph refresh that automatically shows new locations after creation without requiring manual refresh, with locations appearing in the proper external layer**
- **Layout stabilization to prevent re-renders from affecting authentication or actor initialization**
- Real-time updates when new swarms, annotations, or locations are created
- Interactive navigation allowing users to explore connections
- Visual design inspired by Obsidian's graph view with smooth animations
- **Maintains performance and responsiveness while preserving the minimalist grayscale design aesthetic consistent with Hyvmind frontend**
- **Empty state display**: When no data exists (after reset), displays "No data to visualize yet" message with guidance to create first swarm, annotation, or location

### Ontology Builder View
Dedicated workspace for managing and composing digital assets accessible through navigation icon and hamburger menu:
- **Ontology Builder page heading displays "Ontology Builder" without any accompanying description text**
- **Asset workspace displaying all digital assets created or approved by the caller in categorized sections:**
  - **"My Tokens" section showing all token assets extracted from annotations created or approved by the user**
  - **"My Locations" section showing all location assets created or approved by the user**
  - **"My Properties" section showing all property key and property value assets created or approved by the user**
  - **"My Frames" section showing all frames created by the user**
- **Each asset displays name, asset type, creation date, and visibility status (private/public)**
- **Asset management controls for each asset:**
  - **Visibility toggle button to switch between private and public**
  - **Edit button for frames (assets are immutable once created except visibility)**
  - **Delete button for frames created by the user**
- **Frame creation interface:**
  - **"Create Frame" button that opens CreateFrameDialog**
  - **Frame composition workspace showing selected assets and their relationships**
  - **Frame preview showing the structured knowledge framework**
- **Asset selection interface for frame creation:**
  - **Dropdown selectors for tokens, locations, and properties**
  - **Multi-select functionality allowing users to compose frames from multiple assets**
  - **Asset reference system using asset IDs for frame composition**
- **Frame display cards showing:**
  - **Frame title and description**
  - **List of referenced assets within the frame**
  - **Frame visibility status and creation date**
  - **Edit and delete controls for user-created frames**
- **Consistent styling with application's minimalist grayscale design and theme compatibility**
- **Empty state display**: When no assets or frames exist, displays appropriate empty state messages with guidance to create first annotations or locations to generate assets

### Swarm Detail View
**Detailed view accessible via "View" button in Dashboard sidebar or through Graph view that displays:**
- **Complete swarm information including title, description, creator, creation date, jurisdiction, and swarm treasury credits total**
- **Full list of all annotations within the swarm with content preview, creators, creation dates, approval scores, and properties displayed as compact key–value pairs**
- **Complete member list showing all swarm participants and their roles**
- **Swarm statistics including total annotations, active members, and recent activity**
- **Navigation options to return to Dashboard view or join the swarm if not already a member**
- **"Back to Dashboard" navigation label instead of "Back to Explore" wherever it appears**
- **Consistent styling with application's minimalist grayscale design**

### Create Swarm Dialog
Modal dialog accessible via floating action button that allows users to create new research swarms with:
- **Dialog title displays "Create Notebook"**
- **Description text below title reads "A notebook is a collection of annotations."**
- Swarm title (required)
- Jurisdiction selection from dropdown with three-letter ISO country codes
- **"Create Swarm" toggle (renamed from "Public Swarm") with tooltip reading "a swarm is a public notebook, turn this on if you want others to contribute" that appears on hover**
- **Create Swarm button that is fully clickable and active when form validations pass and actor connection is ready, ensuring it is not greyed out inappropriately**
- **Button shows "Reconnecting…" state when actor connection issues occur, with automatic reconnection handling**

### Create Annotation Dialog
Modal dialog accessible via floating action button that enables annotation creation with:
- **Dialog title displays "Create Annotation"**
- **Description text explaining the unified annotation model: "Create annotations using markdown with {bracket tokens} for semantic markup. Positive Law requires only token sequences, Interpretation allows full markdown with optional tokens."**
- **Selection of target notebook (existing or newly created) with "Target Notebook" label and "Select a notebook" placeholder text**
- **Annotation Type selector with two options:**
  - **"Positive Law": accepts only bracket-based token sequences (e.g., `{this is} {an example}`)**
  - **"Interpretation": accepts plain markdown but can include bracketed tokens or sequences**
- **Unified markdown editor with live token parsing and autocomplete:**
  - **Single markdown editor field replacing the legacy subject-predicate-object fields**
  - **For Positive Law: validates that content contains only bracketed token sequences**
  - **For Interpretation: accepts markdown with optional bracketed tokens**
  - **Live autocomplete dropdown appears when typing inside brackets `{}` showing available tokens**
  - **Autocomplete suggestions differentiated by context (entity, relation, location) using color or icon hints**
  - **Token suggestions populated from existing registered tokens in the system**
  - **Backward compatibility rendering that automatically converts legacy `{subject} {predicate} {object}` forms into token sequences on display**
- **Link Location dropdown with multi-select functionality allowing users to associate the annotation with one or more existing locations**
- **Properties section with dynamic list of key–value property inputs:**
  - **Add Property button to create new property key–value pairs**
  - **Each property row contains a key field and value field with dropdown populated from registered property assets**
  - **Key field dropdown populated from registered property key assets**
  - **Value field dropdown populated from registered property value assets**
  - **Remove button for each property row to delete unwanted properties**
  - **Clean, minimal UI consistent with the dialog design**
  - **Fully editable property key and value input fields with proper state binding**
  - **Each input's value bound to the component's state array (properties) with onChange handlers that update the corresponding key/value dynamically**
  - **Focusable and responsive input fields that persist data in the created annotation**
  - **Functional Add Property button that adds empty editable rows**
  - **Functional remove (×) button that removes specific property rows**
- **Token registration integration that automatically creates digital assets for new tokens when annotations are created**
- **Validation to ensure proper annotation format based on selected type**
- **Annotations created within public swarms (notebooks) are automatically marked as public by default**
- **Annotations created within private notebooks maintain non-public visibility by default**
- **Empty state handling**: When no swarms exist (after reset), provides option to create new swarm directly from annotation dialog

### Create Location Dialog
Modal dialog accessible via floating action button that enables location creation with:
- **Dialog title displays "Create Location"**
- **Description text explaining that "locations organize and contextualize your research content"**
- **Title field for the location name with placeholder "e.g. section ABC of Act XYZ, para 123 of case 456" (required)**
- **Content field as rich text area or textarea for detailed location description with placeholder "the actual text of the location, for e.g. appropriate authority means authority mentioned under this Act"**
- **Metadata section with dynamic list of key–value metadata inputs:**
  - **Add Metadata button to create new metadata key–value pairs**
  - **Each metadata row contains a key field and value field with dropdown populated from registered property assets**
  - **Key field dropdown populated from existing location metadata keys and registered property key assets**
  - **Value field dropdown populated from existing location metadata values and registered property value assets**
  - **Remove button for each metadata row to delete unwanted metadata**
  - **Clean, minimal UI consistent with the dialog design**
- **Integrated hierarchical checkbox system that replaces separate Parent, Sibling, and Child location fields with one unified interface that visually displays available locations in an intuitive tree structure allowing users to select any combination of parent, child, or sibling relationships via nested checkboxes, with selected relationships mapping to parentIds, childIds, and siblingIds accordingly when saved**
- **Asset registration integration that automatically creates digital assets for location titles and metadata keys/values when locations are created**
- **Validation to ensure required title field is completed**
- **Create Location button that is fully clickable and active when form validations pass and actor connection is ready**
- **Button shows "Reconnecting…" state when actor connection issues occur, with automatic reconnection handling**
- **Empty state handling**: When no locations exist (after reset), allows creation of root-level locations without parent or sibling selection**

### Create Frame Dialog
Modal dialog accessible from Ontology Builder that enables frame creation with:
- **Dialog title displays "Create Frame"**
- **Description text explaining that "frames organize related assets into structured knowledge frameworks"**
- **Title field for the frame name (required)**
- **Description field for detailed frame description**
- **Asset selection section with multi-select dropdowns:**
  - **Token Assets dropdown populated from user's created or approved token assets**
  - **Location Assets dropdown populated from user's created or approved location assets**
  - **Property Assets dropdown populated from user's created or approved property key and value assets**
- **Selected assets preview showing chosen assets and their relationships**
- **Visibility toggle to set frame as private or public**
- **Create Frame button that validates form and creates the frame with selected asset references**
- **Cancel button to close without saving**
- **Consistent styling with application's minimalist grayscale design**

### Edit Annotation Dialog
Modal dialog accessible from the Dashboard Control Panel that enables editing of user-created annotations with:
- **Dialog title displays "Edit Annotation"**
- **Pre-populated fields with current annotation data: content, annotation type, properties, and linked locations**
- **Unified markdown editor with token-based content editing and autocomplete replacing legacy subject-predicate-object fields**
- **Same field structure and validation as Create Annotation Dialog including token-based content editing and autocomplete**
- **Backward compatibility rendering that automatically converts legacy `{subject} {predicate} {object}` forms into token sequences for editing**
- **Visibility toggle to switch between public and private**
- **Edit restrictions: dialog is disabled and shows "Cannot edit - annotation has been approved by others" message for public annotations that have received approvals**
- **Fork option for immutable annotations that creates a new annotation with identical content**
- **Save changes functionality that updates the existing annotation in the backend**
- **Cancel button to close without saving changes**

### Edit Location Dialog
Modal dialog accessible from the Dashboard Control Panel that enables editing of user-created locations with:
- **Dialog title displays "Edit Location"**
- **Pre-populated fields with current location data: title, content, metadata**
- **Same field structure and validation as Create Location Dialog including the integrated hierarchical checkbox system and asset-based dropdowns**
- **Integrated hierarchical checkbox system that replaces separate Parent, Sibling, and Child location fields with one unified interface that visually displays available locations in an intuitive tree structure allowing users to select any combination of parent, child, or sibling relationships via nested checkboxes, with selected relationships mapping to parentIds, childIds, and siblingIds accordingly when saved**
- **Save changes functionality that updates the existing location in the backend**
- **Cancel button to close without saving changes**

### Edit Frame Dialog
Modal dialog accessible from Ontology Builder that enables editing of user-created frames with:
- **Dialog title displays "Edit Frame"**
- **Pre-populated fields with current frame data: title, description, selected assets**
- **Same field structure and validation as Create Frame Dialog**
- **Asset selection modification allowing users to add or remove asset references**
- **Visibility toggle to change frame visibility**
- **Save changes functionality that updates the existing frame in the backend**
- **Cancel button to close without saving changes**

## Unified Annotation Model
The application implements a unified annotation model with backward compatibility:

### Annotation Types
- **Positive Law**: Accepts only bracket-based token sequences (e.g., `{this is} {an example}`)
  - **Content must contain only bracketed token sequences**
  - **Automatically tokenizes all bracketed content**
  - **Registers each token as a digital asset in the Ontology Builder**
- **Interpretation**: Accepts plain markdown but can include bracketed tokens or sequences
  - **Supports full markdown formatting**
  - **Can reference existing tokens using bracket notation**
  - **Automatically registers any new tokens found in brackets**

### Unified Markdown Editor
- **Single markdown editor field replacing legacy subject-predicate-object fields**
- **Token Definition**: An extensible sequence of words wrapped in curly brackets `{token sequence}`
- **Automatic Tokenization**: Backend parses bracketed content and extracts individual tokens
- **Token Registration**: Each unique token is automatically registered as a digital asset
- **Token Provenance**: Automatic linkage between tokens and their source annotations
- **Token Reusability**: Tokens appear in Ontology Builder for reuse in new annotations
- **Live autocomplete integration**: Dropdown appears when typing inside brackets showing available tokens
- **Context-aware suggestions**: Tokens differentiated by type using color or icon hints

### Backward Compatibility
- **Legacy Support**: Existing triple-based annotations (`{subject} {predicate} {object}`) remain fully supported
- **Automatic Conversion**: Legacy annotations automatically render as token sequences in the unified editor
- **Data Migration**: All existing annotations continue to work without modification
- **Graph Visualization**: Existing graph view adapts seamlessly to display both legacy triples and new token sequences
- **Ontology Integration**: Legacy entities, relations, and properties integrate with new token system
- **Fallback Logic**: Ensures legacy annotations remain viewable without schema errors across all views

## Digital Asset System
The application implements a comprehensive digital asset system that automatically registers all semantic components:

### Asset Auto-Registration
- **Automatic asset creation**: Every token, location title, and metadata key-value pair is automatically registered as a DigitalAsset when created
- **Asset immutability**: Once created, digital assets are immutable except for visibility settings
- **Asset types**: token (extracted from annotations), location (location titles), propertyKey (property keys), propertyValue (property values), frame (user-created frames)
- **Asset provenance**: Complete creation and ownership tracking for all assets

### Asset Data Structure
- **DigitalAsset type with fields:**
  - **id: Nat (unique identifier)**
  - **name: Text (asset name/content)**
  - **assetType: AssetType (token/location/propertyKey/propertyValue/frame)**
  - **creator: Principal (asset creator)**
  - **createdAt: Int (creation timestamp)**
  - **visibility: AssetVisibility (private/public)**
  - **provenance: [ProvenanceRecord] (ownership and transaction history)**

### Frame System
- **Frame creation with OWL-style composition of selected assets referenced by ID**
- **Frame data structure:**
  - **id: Nat (unique identifier)**
  - **title: Text (frame name)**
  - **description: Text (frame description)**
  - **assetIds: [Nat] (references to included digital assets)**
  - **creator: Principal (frame creator)**
  - **createdAt: Int (creation timestamp)**
  - **visibility: FrameVisibility (private/public)**
- **Frame management with edit, delete, and visibility controls**
- **Frame composition workspace for organizing related assets**

## Profile Setup Modal
Modal dialog that appears for first-time users to complete initial profile setup:
- **Profile setup modal appears for all users after data reset since no existing profiles remain**
- **Modal displays "Welcome to Hyvmind!" title with username input field**
- **Username setup is required for all users in the clean state**
- **Profile data persists across sessions linked to the user's Internet Identity principal**
- **Modal includes proper validation and error handling for username creation**
- **Successful username creation redirects user to Dashboard view**
- **Modal styled consistently with application's minimalist grayscale design**

## Persistent Floating Action Buttons
The application includes three circular "+" floating action buttons that are persistent across all views:
- **Create New Swarm button**: Circular floating action button with "+" icon or appropriate swarm creation icon that opens the existing CreateSwarmDialog when clicked
- **Create New Annotation button**: Circular floating action button with "+" icon or appropriate annotation creation icon that opens the existing CreateAnnotationDialog when clicked
- **Create New Location button**: Circular floating action button with "+" icon or appropriate location creation icon that opens the CreateLocationDialog when clicked
- **Positioned consistently in bottom-right area across all views (Dashboard, Graph, Swarm Detail, Ontology Builder) to maintain minimalist layout and responsive design**
- **Styled consistently with application's grayscale aesthetic and theme compatibility**
- **Persistent functionality ensuring the buttons remain accessible and functional on every page of the application**
- **Proper z-index layering to ensure buttons remain visible above other content without interfering with page interactions**

## Credits System
The application implements an internal credits system with the following mechanics:
- **New user accounts start with 0 credits**
- **When a user approves an annotation created by another user:**
  - **1 new credit is generated in total**
  - **0.5 credits are awarded to the annotation creator**
  - **0.5 credits are added to the swarm's treasury**
- **When a user disapproves an annotation, no credits are distributed**
- **Users cannot approve their own annotations (enforced at backend)**
- **Approvals are permanent and cannot be undone - once an approval is registered, it cannot be removed**
- **Users who approve an annotation can reference it in their own annotation creation**
- **Asset purchase transactions deduct credits from buyer and add credits to seller**
- **User credits and approved annotations list are stored as part of user profile asset data with persistent backend storage**
- **Swarm treasury totals are maintained and displayed in swarm details**
- **Credits are tracked persistently in user profiles and swarm treasury fields across all sessions**
- **Approval button handlers update relevant credit values in user and swarm data without unapproval functionality**
- **Asset Management tab displays live credit totals and approved annotations list that persist across sessions**
- **Purchase transaction history maintained in user profiles with detailed transaction records**

## Approval Interface
- **Two approval buttons using thumbs up 👍 and thumbs down 👎 emojis for consistent display and alignment with the design aesthetic**
- **Approve tooltip "Support this annotation and gain right to reference it" appears only on hover over the approve button**
- **Disapprove tooltip "Disagree with this annotation" appears only on hover over the disapprove button**
- **No unapproval functionality - approvals are permanent once registered**
- **Approval buttons become permanently greyed out once clicked to indicate the action cannot be undone and prevent further interaction**
- **Improved approval button state synchronization that eliminates flickering and provides immediate visual feedback upon click without delay**
- **Enhanced state management that disables premature re-rendering and maintains stable button appearance during approval processing**
- **Approval buttons activate immediately upon click with clear visual feedback showing the selected state without flickering or delayed response**
- **Optimized approval button rendering that prevents visual inconsistencies and ensures smooth user interaction**

## Annotation Immutability Rules
The application enforces strict immutability rules for annotations:
- **Public annotations that have received approvals from other users become immutable**
- **Immutable annotations cannot be edited or deleted by their creators**
- **Edit and delete buttons are replaced with a "Fork" button for immutable annotations**
- **Fork functionality creates a new annotation with identical content, annotation type, properties, and linked locations**
- **Forked annotations receive a new unique ID and the current user as the creator**
- **Private annotations remain editable by their creators regardless of approval status**
- **Visibility changes from public to private are only allowed if the annotation has no approvals from other users**
- **Backend validation prevents editing or deletion of immutable annotations**

## Crypto Wallet Integration
The application includes crypto wallet functionality using Push Wallet:
- All wallet components styled to match Hyvmind's minimalist grayscale design
- Required dependencies: `@pushchain/ui-kit`
- **Wallet connection modal with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode with no transparency or translucency**
- **Push Wallet integration using `@pushchain/ui-kit` library with `PushUniversalWalletProvider`, `PushUniversalAccountButton`, and `PushUI` components**
- **TESTNET configuration with dark theme mode for Push Wallet components**
- **EVM and Solana wallet compatibility through Pushchain's UI kit**
- **Connected wallet addresses stored in user session/local state**
- **Simple connect/disconnect functionality displaying wallet connection status**

## Text Normalization and Deduplication
The application implements comprehensive text normalization and deduplication across both frontend and backend:
- **Backend normalization in `getAllTokens()`, `getAllJurisdictions()`, `getAllPropertiesKeys()`, `getAllPropertiesValues()`, and location metadata functions that trims whitespace and converts all text values to lowercase before returning results**
- **Enhanced backend property handling functions that properly extract property keys and values, handle properties with various character formats, and deduplicate normalized property values while preserving original casing for display**
- **Backend deduplication that consolidates case and spacing variations (like " token ", "Token", "TOKEN") into single unique entries**
- **Frontend autocomplete normalization that trims and lowercases user input when checking against backend data**
- **Frontend property filter normalization that trims and lowercases property keys and values before comparison while displaying them with their original casing in dropdowns for readability**
- **Frontend suggestion deduplication that displays only one suggestion per unique normalized value**
- **Case-insensitive autocomplete matching that works regardless of input capitalization or trailing spaces**
- **Consistent normalization between frontend and backend to ensure reliable text matching and filtering**
- **Lossless normalization that preserves original casing for display purposes while using normalized text for comparison and deduplication**

## Location System
The application implements a comprehensive location system for organizing and contextualizing research content:

### Location Data Structure
- **Location type with fields:**
  - **id: Nat (unique identifier)**
  - **title: Text (location name)**
  - **content: Text (detailed description)**
  - **metadata: [(Text, Text)] (unlimited key-value properties)**
  - **parentIds: [Nat] (allowing multiple parent locations)**
  - **childIds: [Nat] (child location references)**
  - **siblingIds: [Nat] (sibling location references at the same hierarchical level)**
  - **createdAt: Int (creation timestamp)**

### Location Management
- **Location creation with title, content, metadata, and hierarchical relationship selection through integrated checkbox system**
- **Location updates allowing modification of title, content, metadata, and hierarchical relationships through integrated checkbox system**
- **Hierarchical location structure supporting multiple parents, children, and siblings**
- **Automatic bidirectional linking when parent-child and sibling relationships are established**
- **Automatic digital asset creation for location titles and metadata keys/values**

### Automatic Bidirectional Hierarchical Linking
- **When location A adds location B as its parent, automatically add A to B's childIds list**
- **When location A adds location B as its child, automatically add A to B's parentIds list**
- **Maintain symmetry on updates and deletions of relationships to prevent orphaned references**
- **All affected location records update within a single transaction to preserve consistency**
- **Apply bidirectional linking logic to both createLocation and updateLocation backend functions**
- **Automatic cleanup of broken relationships when locations are deleted**
- **Validation to prevent circular parent-child relationships**

### Location-Annotation Integration
- **Annotations extended with optional `linkedLocationIds: [Nat]` array**
- **Annotations can be associated with one or more locations**
- **Location-based annotation queries and filtering**
- **Location hierarchy queries showing parent, child, and sibling relationships**

### Location Visualization
- **Locations displayed as independent nodes in Graph View ALWAYS positioned outside swarm circles in a separate outer layer or peripheral orbit with distinct visual styling**
- **Location titles displayed as visible text labels positioned next to or within location nodes**
- **Locations organized in a clustered hierarchical tree structure that visually represents parent-child-sibling relationships with clear spatial grouping**
- **Sibling locations clustered horizontally at the same hierarchical level with consistent spacing and alignment**
- **Parent-child relationships displayed as directional "includes" edges connecting parent nodes to child nodes vertically**
- **Hierarchical consistency enforcement: if entities A and B are siblings and C is a parent of B, the graph clearly shows C also as a parent of A through proper edge connections**
- **Tree layout algorithm that maintains consistent hierarchical positioning with siblings grouped horizontally and parent-child links displayed vertically**
- **Location node positioning algorithms ensure locations are placed in external positions, never inside swarm encapsulation boundaries, while maintaining the clustered hierarchical tree structure**
- **Sibling relationship visualization through horizontal clustering and shared parent connections rather than direct sibling edges**
- **Clear visual hierarchy with root locations at the top, intermediate levels in the middle, and leaf locations at the bottom of the tree structure**
- **Annotation-location links shown as dashed purple edges connecting from annotation circles (inside swarms) outward to external location nodes**
- **Location nodes clickable to display location details, hierarchy, sibling relationships, and linked annotations in right sidebar**
- **Real-time graph updates that immediately display newly created locations as independent nodes in the correct external position outside swarms**
- **Dynamic graph refresh functionality that automatically shows new locations after creation without requiring manual refresh, with locations appearing in the proper external layer**

### Location Filtering and Export
- **Location-based filtering in Graph View by title and metadata**
- **Location data included in all graph export formats (JSON, JSON-LD, CSV)**
- **Location hierarchy, sibling relationships, and annotation links preserved in exported data**

## Backend Data Storage
The backend stores:
- **Complete data reset capability**: All stored data can be completely cleared using the existing `resetAllData()` admin function
- **Clean state initialization**: After reset, all storage starts empty with no existing data
- **Principal-based identity mapping system that maintains consistent user profiles across login sessions**
- User swarm memberships and creation records
- Swarm data: title, description, creator, members, jurisdiction, privacy settings, creation date, **treasury credits total**, **notebook card colour preferences per user**
- **Annotation data: content, annotationType (PositiveLaw/Interpretation), creator, linked swarm, visibility, creation date, approval score, properties as key–value pairs [(key: Text, value: Text)], linkedLocationIds: [Nat], immutability status based on approval history, extractedTokens: [Text]**
- **Token data: id, content, sourceAnnotationIds, creator, createdAt, visibility**
- **Location data: id, title, content, metadata as key–value pairs, parentIds, childIds, siblingIds, createdAt**
- **Digital asset data: id, name, assetType, creator, createdAt, visibility, provenance**
- **Frame data: id, title, description, assetIds, creator, createdAt, visibility**
- User approvals on annotations **stored as (annotationId, Principal, Bool) where Bool indicates approve (true) or disapprove (false) with credit distribution tracking and permanent status (no unapproval)**
- Wallet connection data and asset management information
- **Principal-based profile mapping to ensure user data persistence across authentication events**
- **User notebook card colour customization preferences with per-swarm colour storage**
- **Property data storage supporting unlimited key–value pairs per annotation**
- **Location metadata storage supporting unlimited key–value pairs per location**
- **Asset ownership records: user principal, owned asset ids, purchase history, usage permissions**
- **Asset provenance history: complete transaction chain for each asset including creation, purchases, and transfers**

## Backend Operations
The backend must implement:
- **Complete data reset functionality using the existing `resetAllData()` admin method that clears all stored user profiles, swarms, annotations, approvals, locations, digital assets, frames, tokens, and transactions, and resets counters like nextSwarmId, nextAnnotationId, nextLocationId, nextAssetId, nextFrameId, and nextTokenId back to zero, and reinitializes access control state by setting adminAssigned back to false**
- **Clean state initialization**: All operations handle empty state gracefully after reset
- **Simplified Internet Identity authentication with principal-based profile persistence where user profiles are linked to Internet Identity principals and persist across sessions**
- **Principal-based identity mapping system that retrieves existing user profiles based on Internet Identity principal IDs during authentication**
- **Profile persistence logic that maintains user profiles across login sessions without creating duplicate profiles for returning users**
- **Enhanced getOrCreateCallerUserProfile endpoint that retrieves existing profiles for returning users or creates new profiles only for first-time users**
- **Profile existence checking that determines whether a user has an existing profile with saved username before requiring profile setup**
- User registration and profile management **with initial 0 credits balance for new user profiles only**
- **Enhanced getCallerUserProfile endpoint that retrieves existing user profiles based on principal ID with proper error handling and null safety**
- **Enhanced updateCallerUsername mutation that validates actor initialization and profile existence before executing, with comprehensive error handling and success confirmation**
- **Profile initialization operations that create new user profiles only for first-time users without existing profiles**
- **Profile synchronization operations that immediately retrieve existing user profiles from backend upon authentication**
- **Data validation layer that confirms user identity and loads existing profile data before allowing access to user-specific content**
- **Principal-based profile management that maps authenticated principals to existing user profiles across sessions**
- **Complete CRUD operations for swarms: create, read, update, delete, and membership management with treasury credits tracking**
- **Swarm joining functionality with proper backend mutation and membership tracking**
- **Notebook card colour customization operations: store and retrieve user-specific colour preferences for each swarm with persistent backend storage**
- **Complete CRUD operations for annotations: create, read, update, delete, and approval tracking with content, annotationType, properties field, and linkedLocationIds**
- **Token parsing and extraction operations:**
  - **parseTokensFromContent(content: Text) -> [Text] that extracts all bracketed token sequences from annotation content**
  - **registerTokenAssets(tokens: [Text], creator: Principal) -> [Nat] that creates digital assets for new tokens**
  - **linkTokensToAnnotation(annotationId: Nat, tokenIds: [Nat]) that establishes provenance links**
- **Enhanced annotation creation logic that automatically sets public visibility for annotations created within public swarms and maintains non-public visibility for annotations created within private notebooks**
- **Annotation data structures supporting both Positive Law (token sequences only) and Interpretation (markdown with optional tokens) formats with automatic token extraction and registration**
- **Annotation editing operations with immutability validation:**
  - **updateAnnotation(id, content, annotationType, properties, linkedLocationIds, visibility) with validation that prevents editing of immutable annotations**
  - **checkAnnotationImmutable(id) -> Bool that returns true if annotation is public and has approvals from other users**
  - **forkAnnotation(id) -> Nat that creates a new annotation with identical content but new ID and current user as creator**
- **Annotation visibility management:**
  - **toggleAnnotationVisibility(id, isPublic) with validation that prevents making public annotations private if they have approvals**
  - **getCallerAnnotations() -> [Annotation] that returns all annotations created by the current user**
- **Token management operations:**
  - **createToken(content, sourceAnnotationId, creator) -> Nat that creates new token assets**
  - **getToken(id) -> ?Token**
  - **getAllTokens() -> [Token] with normalization and deduplication**
  - **getTokensByAnnotation(annotationId) -> [Token] that returns all tokens extracted from a specific annotation**
  - **getAnnotationsByToken(tokenId) -> [Annotation] that returns all annotations containing a specific token**
- **Property management operations: create, read, update key–value property structures and associate properties with annotations**
- **Location management operations:**
  - **createLocation(title, content, metadata, parentIds, childIds, siblingIds) -> Nat with automatic bidirectional linking**
  - **updateLocation(id, title, content, metadata, parentIds, childIds, siblingIds) with automatic bidirectional linking**
  - **deleteLocation(id) with validation that only allows deletion by creator and automatic cleanup of all references**
  - **getLocation(id) -> ?Location**
  - **getAllLocations() -> [Location]**
  - **getCallerLocations() -> [Location] that returns all locations created by the current user**
  - **addLocationParent(childId, parentId) with automatic bidirectional linking (updates both parent and child links)**
  - **addLocationChild(parentId, childId) with automatic bidirectional linking**
  - **addLocationSibling(locationId, siblingId) with automatic bidirectional linking (updates both locations with bidirectional sibling links)**
- **Automatic bidirectional hierarchical linking operations:**
  - **When location A adds location B as parent, automatically add A to B's childIds**
  - **When location A adds location B as child, automatically add A to B's parentIds**
  - **Maintain symmetry on relationship updates and deletions to prevent orphaned references**
  - **All affected location records update within single transaction for consistency**
  - **Automatic cleanup of broken relationships when locations are deleted**
  - **Validation to prevent circular parent-child relationships**
- **Location query helper functions:**
  - **getAnnotationsByLocation(locationId) -> [Annotation]**
  - **getLocationHierarchy(locationId) -> { parents: [Location]; children: [Location]; siblings: [Location] }**
  - **getLocationTreeStructure() -> LocationTreeData that returns hierarchical tree data optimized for clustered visualization with parent-child relationships and sibling groupings**
- **Digital asset management operations:**
  - **createDigitalAsset(name, assetType, creator, visibility) -> Nat that creates new digital assets with automatic registration**
  - **updateAssetVisibility(id, visibility) with validation that only allows updates by creator**
  - **getDigitalAsset(id) -> ?DigitalAsset**
  - **getAllDigitalAssets() -> [DigitalAsset]**
  - **getCallerDigitalAssets() -> [DigitalAsset] that returns all assets created by the current user**
  - **getCallerApprovedAssets() -> [DigitalAsset] that returns all assets the user has approval rights to use**
  - **getAssetsByType(assetType) -> [DigitalAsset] that returns all assets of a specific type**
- **Asset auto-registration operations:**
  - **registerTokenAsset(name, creator) -> Nat that automatically creates token assets from parsed content**
  - **registerLocationAsset(name, creator) -> Nat that automatically creates location assets for location titles**
  - **registerPropertyKeyAsset(name, creator) -> Nat that automatically creates property key assets**
  - **registerPropertyValueAsset(name, creator) -> Nat that automatically creates property value assets**
- **Frame management operations:**
  - **createFrame(title, description, assetIds, creator, visibility) -> Nat that creates new frames with asset references**
  - **updateFrame(id, title, description, assetIds, visibility) with validation that only allows updates by creator**
  - **deleteFrame(id) with validation that only allows deletion by creator**
  - **getFrame(id) -> ?Frame**
  - **getAllFrames() -> [Frame]**
  - **getCallerFrames() -> [Frame] that returns all frames created by the current user**
  - **getPublicFrames() -> [Frame] that returns all public frames for browsing**
- **Asset provenance and ownership tracking:**
  - **getAssetProvenance(assetId) -> [ProvenanceRecord] that returns complete creation and ownership history for an asset**
  - **getUserAssetHistory(principal) -> [ProvenanceRecord] that returns all asset-related activities for a user**
  - **checkAssetAccess(assetId, userPrincipal) -> Bool that verifies if user can access or use an asset**
- **getAllPropertiesKeys endpoint that aggregates all unique property keys from all annotations, normalizes text by trimming whitespace and converting to lowercase, and deduplicates case and spacing variations to return only unique normalized entries**
- **getAllPropertiesValues endpoint that aggregates all unique property values from all annotations, normalizes text by trimming whitespace and converting to lowercase, and deduplicates case and spacing variations to return only unique normalized entries**
- **Location metadata aggregation functions that collect all unique metadata keys and values from all locations with normalization and deduplication**
- **Enhanced approval functionality with approveAnnotation(annotationId: Nat, isApproval: Bool) method that prevents self-approval, generates 1 credit total (0.5 to annotation creator, 0.5 to swarm treasury) for approvals only, tracks approved annotations in user profile, and enforces permanent approval status without unapproval capability**
- **Approval authorization checks using hasUserApprovedAnnotation for annotation referencing permissions**
- **Credit management operations: award credits, update user balances, update swarm treasury totals, process asset purchase transactions with persistent storage across sessions**
- **Swarm creation and management with proper storage and retrieval**
- **Annotation creation and management with proper storage and retrieval including content, annotationType fields, properties, and linkedLocationIds, with automatic token extraction and digital asset registration**
- **User-specific data retrieval endpoints for Dashboard view including user's created/joined swarms and user's created/approved annotations with full data loading that persists across sessions**
- **Swarm detail retrieval endpoint that provides comprehensive swarm information, all related annotations, member data, and treasury credits total for the Swarm Detail View**
- **Enhanced username update functionality with proper validation, error handling, persistent backend storage, and success response formatting**
- Real-time queries for Graph view visualization displaying all swarms, annotations, and locations by all users with filtering capabilities
- **Enhanced getAllTokens endpoint that aggregates all unique tokens from all annotations, normalizes text by trimming whitespace and converting to lowercase, and deduplicates case and spacing variations to return only unique normalized entries**
- **getAllJurisdictions endpoint that aggregates all unique jurisdictions from all swarms, normalizes text by trimming whitespace and converting to lowercase, and deduplicates case and spacing variations to return only unique normalized entries**
- **Enhanced getAnnotationsByFilters endpoint for filtering annotations by tokens, annotation type, jurisdiction, property key/value pairs, and linked location IDs with proper property and location filtering support**
- **getAnnotationsByToken endpoint that retrieves all annotations containing a specific token, returning complete annotation data including content, annotationType, creator, creation date, approval score, properties, and linkedLocationIds for Graph View sidebar display**
- **Export data serialization endpoints:**
  - **getGraphDataForExport endpoint that returns structured graph data for JSON export including all swarms, annotations, tokens, locations, and properties**
  - **getFilteredGraphDataForExport endpoint that returns graph data based on current filter state for current view export including location data**
  - **Data serialization utilities that format graph data appropriately for JSON, JSON-LD, and CSV export formats including location information**
  - **JSON-LD context mapping generation for tokens, locations, and properties with appropriate semantic web standards**
  - **CSV flattening logic that converts graph data to key-value rows with tokens, annotationType, swarm, propertyKey, propertyValue, linkedLocationIds columns**
- **Public swarm discovery for Dashboard sidebar with proper filtering and display**
- User activity tracking and online status management
- Wallet integration and asset management operations
- **Empty state handling**: All query endpoints return empty arrays when no data exists (after reset)

## Frontend Interface
- Minimalist aesthetic with clean, monochrome design
- **Landing page typography**: **Alegreya Sans** font family applied exclusively for distinctive branding
- **Internal application typography**: **Inter** or **Open Sans** font family applied consistently across Dashboard, Graph View, Swarm Detail View, Account Settings, Ontology Builder, and all other internal components for improved legibility
- **Global font configuration**: Chosen sans-serif font configured in `index.css` and Tailwind theme configuration
- **Consistent typography**: Uniform sizing, spacing, and weight maintained across all internal components for clean, unified reading experience
- **Smaller font sizes across all text elements for a more compact, elegant appearance consistent with the current aesthetic**
- **Dark mode toggle functionality with proper theme synchronization across all components and views**
- **Global Tailwind dark mode classes that correctly update base backgrounds, text colors, and all UI elements when toggling between light and dark themes**
- **Consistent light/dark mode rendering across all backend-connected views (Dashboard, Graph, Swarm Detail, and Ontology Builder) with proper theme state management**
- **Base background colors that correctly switch between `bg-white` in light mode and `bg-gray-950` in dark mode throughout the entire application**
- **Header, footer, and navigation components that properly respond to theme changes with synchronized color updates**
- **All cards, modals, and interface elements maintain proper contrast and visibility in both light and dark modes**
- **Landing page with full dark mode support that integrates seamlessly with the existing theme toggle and transitions smoothly when toggled**
- **Landing page dark mode styling ensures bee and hive animations, logo, and text contrast are balanced and readable on dark backgrounds**
- **Landing page maintains identical alignment, spacing, and button visibility in both light and dark modes for consistency**
- **Landing page uses smaller font sizes across all text elements (headings, subheadings, buttons, and descriptions) for a more refined, compact appearance**
- **Landing page displays the black transparent Hyvmind logo (`hyvmind_logo black, transparent.png`) in light mode for crisp display against light backgrounds with proportional scaling and centered alignment**
- **Landing page dark mode uses the white transparent Hyvmind logo (`hyvmind_logo white, transparent.png`) for crisp display against dark backgrounds with proportional scaling and centered alignment**
- **Light/dark mode toggle positioned prominently on the landing page, likely near the top-right corner, that allows users to seamlessly switch between themes without requiring a page refresh**
- **Theme toggle updates the landing page dynamically with all text, background, and logo adapting accordingly while preserving existing animations and layout with consistent minimal aesthetic**
- Header navigation component with Account icon styled in grayscale palette
- **Home icon positioned in the top-left area of the navigation bar that navigates directly to the Dashboard view when clicked, styled consistently with minimalist design and existing navigation elements**
- **Minimal line-based three-node knowledge graph icon button positioned next to the Home icon in the top navigation that links directly to the Graph view with consistent spacing and hover effects using the same style as other top-bar buttons, featuring a visually consistent design with the same stroke width, outline weight, and size as the home icon, monochrome and theme-aware with black at 80% opacity in light mode and white at 90% opacity in dark mode for balance, with proper spacing and alignment so both icons appear visually centered and stylistically consistent**
- **Ontology Builder icon positioned next to the Graph icon in the top navigation that links directly to the Ontology Builder view with consistent spacing and hover effects using the same style as other top-bar buttons, featuring a visually consistent design with the same stroke width, outline weight, and size as the home and graph icons, monochrome and theme-aware with black at 80% opacity in light mode and white at 90% opacity in dark mode for balance**
- **Account circular icon positioned to the right of the hamburger menu icon in the top right corner of header**
- **Hamburger menu containing "Graph" and "Ontology Builder" navigation items (Explore removed) with consistent styling and functionality**
- Site favicon uses the Hyvmind logo with dynamic switching based on color scheme preference
- Landing screen features the Hyvmind logo with static display (no transformation animations)
- **Main text displays "welcome to hyvmind" in smaller midsize font with type-in typing animation effect**
- **Small, simple bee and hive animation that appears during cursor movement with the bee flying in gentle zig-zag paths and returning to perch on the hive when the cursor stops, keeping this lightweight and non-intrusive**
- **Two action buttons positioned vertically with perfect center alignment:**
  - **"Get Started" button that leads to Internet Identity authentication**
  - **"Explore" button positioned directly below the "Get Started" button that opens https://app.cg/c/staram/ in a new tab**
- **All modal dialogs and cards with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode ensuring optimal readability and full visual separation**
- **Notebook card colour customization interface with clean popover menu displaying selectable colour options that opens when clicking the colour palette button on notebook cards**
- **Colour selection popover styled consistently with minimalist design and proper light/dark mode support**
- **Dashboard Control Panel left sidebar with:**
  - **Collapsible sidebar design with toggle functionality**
  - **"My Annotations" collapsible section displaying all user-created annotations with content preview and visibility status**
  - **"My Locations" collapsible section displaying all user-created locations with title and creation date**
  - **Edit and Delete buttons beside each annotation and location item**
  - **Visibility toggle button for each annotation (public/private)**
  - **Fork button replacing Edit button for immutable annotations (public annotations with approvals)**
  - **Consistent styling with application's minimalist grayscale design and theme compatibility**
  - **Proper loading states and error handling for all Control Panel operations**
- **Ontology Builder interface with:**
  - **Asset workspace displaying categorized sections for tokens, locations, properties, and frames**
  - **Asset management controls for visibility toggling and frame editing/deletion**
  - **Frame creation interface with "Create Frame" button opening CreateFrameDialog**
  - **Asset selection interface with multi-select dropdowns for frame composition**
  - **Frame display cards showing title, description, referenced assets, and management controls**
  - **Consistent styling with application's minimalist grayscale design and theme compatibility**
- **CreateFrameDialog component with:**
  - **Title and description input fields with proper validation**
  - **Multi-select asset dropdowns populated from user's created or approved assets**
  - **Selected assets preview showing chosen assets and relationships**
  - **Visibility toggle for private/public frame setting**
  - **Create Frame and Cancel buttons with proper form handling**
- **EditFrameDialog component with:**
  - **Pre-populated form fields with current frame data**
  - **Same field structure and validation as CreateFrameDialog**
  - **Asset selection modification for adding/removing asset references**
  - **Save changes and cancel functionality**
- **EditAnnotationDialog component with:**
  - **Pre-populated unified markdown editor with current annotation data including content and annotation type**
  - **Unified markdown editor with token-based content editing and autocomplete replacing legacy subject-predicate-object fields**
  - **Same validation and token-based content editing as CreateAnnotationDialog**
  - **Backward compatibility rendering that automatically converts legacy `{subject} {predicate} {object}` forms into token sequences for editing**
  - **Live token parsing and autocomplete functionality**
  - **Visibility toggle for public/private status**
  - **Immutability validation that disables editing for approved public annotations**
  - **Fork functionality for creating new annotations from immutable ones**
  - **Save changes and cancel functionality**
- **EditLocationDialog component with:**
  - **Pre-populated form fields with current location data including hierarchical relationships**
  - **Same field structure and validation as CreateLocationDialog including the integrated hierarchical checkbox system and asset-based dropdowns**
  - **Integrated hierarchical checkbox system that replaces separate Parent, Sibling, and Child location fields with one unified interface that visually displays available locations in an intuitive tree structure allowing users to select any combination of parent, child, or sibling relationships via nested checkboxes, with selected relationships mapping to parentIds, childIds, and siblingIds accordingly when saved**
  - **Save changes and cancel functionality**
- **D3GraphCanvas component with enhanced zoom, visualization behavior, and clustered hierarchical location tree:**
  - **D3.js rendering engine embedded within React component that initializes and manages D3 logic within a `useEffect` hook attached to a `ref` instead of the React DOM tree**
  - **Component updates only when graph data or selected theme changes, preventing re-renders that could affect authentication**
  - **D3 container completely detached from React state changes aside from explicit props updates to avoid triggering authentication re-initialization**
  - **Modified zoom behavior: zooming occurs with Shift + Scroll instead of normal scroll, allowing normal page scrolling without interfering with graph zoom**
  - **Smooth interactive zoom and pan functionality implemented through D3.js with Shift+Scroll zoom control**
  - **Entity titles displayed as visible text labels positioned next to or within their corresponding circles for all entities, annotations, swarm nodes, and location nodes**
  - **Text labels styled consistently with theme colors and remain readable at different zoom levels with proper font sizing and contrast**
  - **All entities, annotations, and locations are clickable, triggering highlight or selection events without affecting authentication or causing re-renders that interfere with login logic**
  - **Click interactions emit events to the right sidebar for displaying details while maintaining D3 performance isolation from React authentication state**
  - **Annotation circles (encapsulated tokens and relations) are interactive and clickable, displaying outline or selection state when clicked**
  - **Click interactions preserve existing zoom, pan (Shift + Drag), and Shift + Scroll functionality without interference**
  - **Enhanced annotation visualization within swarms: each annotation within a swarm is rendered as a smaller circle encapsulating its tokens inside the larger swarm boundary**
  - **Annotation circles maintain consistent theme colors and layout stability within swarm boundaries**
  - **Enhanced clustered hierarchical location tree visualization with locations organized in a tree structure that visually represents parent-child-sibling relationships with clear spatial grouping**
  - **Sibling locations clustered horizontally at the same hierarchical level with consistent spacing and alignment**
  - **Parent-child relationships displayed as directional "includes" edges connecting parent nodes to child nodes vertically**
  - **Hierarchical consistency enforcement: if entities A and B are siblings and C is a parent of B, the graph clearly shows C also as a parent of A through proper edge connections**
  - **Tree layout algorithm that maintains consistent hierarchical positioning with siblings grouped horizontally and parent-child links displayed vertically**
  - **Location node positioning algorithms ensure locations are placed in external positions, never inside swarm encapsulation boundaries, while maintaining the clustered hierarchical tree structure**
  - **Sibling relationship visualization through horizontal clustering and shared parent connections rather than direct sibling edges**
  - **Clear visual hierarchy with root locations at the top, intermediate levels in the middle, and leaf locations at the bottom of the tree structure**
  - **All existing graph visualization features migrated from `LiveGraph.tsx` including swarm boundaries, annotation encapsulation, location positioning, and hierarchical connections**
  - **Layout stabilization to prevent re-renders from affecting authentication or actor initialization**
  - **Performance isolation ensuring D3 rendering does not interfere with React authentication state management**
- **Graph View right sidebar with token and location annotation display that appears when token or location nodes are clicked, featuring:**
  - **Collapsible sidebar design matching Dashboard sidebar styling and theme compatibility**
  - **For tokens: Compact scrollable list displaying all annotations containing the clicked token**
  - **For locations: Location details, hierarchy information, sibling relationships, metadata, and linked annotations**
  - **Token sequence formatting for each annotation with clear display of relationships**
  - **Properties displayed as compact key–value pairs below each annotation**
  - **Location metadata displayed as compact key–value pairs**
  - **Automatic closure when clicking outside sidebar or deselecting token/location**
  - **Consistent minimalist grayscale design with proper light/dark mode support**
- **Graph View export interface with Export button or dropdown menu positioned to avoid overlap with right sidebar and color theme selector:**
  - **Export scope selection (Full view or Current view) with clear labeling**
  - **Export format selection (JSON, JSON-LD, CSV) with format descriptions**
  - **Dynamic file naming preview showing the generated filename before download**
  - **Export button styled consistently with application's minimalist grayscale design**
  - **Export functionality integrated cleanly with existing Graph View controls and theme compatibility**
  - **Download prompt with proper file handling for different export formats**
- **Export data conversion utilities in `lib/exportUtils.ts`:**
  - **JSON export conversion that structures graph data with nodes, edges, annotations, locations, and properties**
  - **JSON-LD export conversion with appropriate context mappings and semantic web formatting including location data**
  - **CSV export conversion that flattens graph data to rows with tokens, annotationType, swarm, propertyKey, propertyValue, linkedLocationIds columns**
  - **File download handling with dynamic naming based on export scope and format**
  - **Export progress indicators and success notifications**
- **CreateLocationDialog component with:**
  - **Title field with placeholder "e.g. section ABC of Act XYZ, para 123 of case 456" and proper validation**
  - **Content field with placeholder "the actual text of the location, for e.g. appropriate authority means authority mentioned under this Act"**
  - **Dynamic metadata input system with key-value pairs and asset-based dropdowns**
  - **Integrated hierarchical checkbox system that replaces separate Parent, Sibling, and Child location fields with one unified interface that visually displays available locations in an intuitive tree structure allowing users to select any combination of parent, child, or sibling relationships via nested checkboxes, with selected relationships mapping to parentIds, childIds, and siblingIds accordingly when saved**
  - **Clean, minimal UI consistent with other dialog designs**
  - **Proper form validation and submission handling including hierarchical relationship data**
  - **Actor readiness checks and reconnection handling**
  - **Asset registration integration for automatic digital asset creation**
- Card-based layout for all main interface elements
- Responsive design optimized for desktop and mobile use
- **Simplified authentication architecture with useInternetIdentity managing only authentication state and useActor handling backend actor creation with identity change detection and React Query cache clearing**
- **App.tsx simplified to wait for `isAuthenticated && isActorReady` before rendering main app content with clean conditional rendering**
- **Single actor creation per session used consistently across all dashboard views without redundant reconnection logic**
- **Clean transition from login to Dashboard page with profile setup for all users since no existing profiles remain after reset**
- **Reliable session management with proper state persistence and stable backend connectivity**
- **Complete local storage and session data clearing before initializing new user profiles to prevent session corruption**
- **Application content displayed in English language**
- **Account Settings dialog with enhanced profile loading that automatically retrieves current user profile data on opening with proper loading indicators and connection validation**
- **Asset Management tab displays user's total credits and list of approved annotations with proper formatting, navigation, and scrollable content area to prevent overflow**
- **Comprehensive loading states and error handling for all Account Settings operations with fallback mechanisms**
- **Success toast notifications with clear visual confirmation for successful username updates**
- **Robust null safety checks and actor validation before executing any profile operations**
- **Frontend state synchronization that updates cached profile state immediately upon authentication events with profile recognition and connection stability**
- **Data validation layer that prevents display of user-specific content until user identity is confirmed and profile data is loaded with backend connection verified**
- **Persistent profile state management that maintains user profile data consistency across browser sessions and page reloads**
- **ProfileSetupModal component that appears for all users after data reset since no existing profiles remain**
- **Enhanced CreateAnnotationDialog component with:**
  - **Annotation Type selector with "Positive Law" and "Interpretation" options**
  - **Unified markdown editor field replacing legacy subject-predicate-object fields**
  - **Content field with live token parsing and validation based on selected annotation type**
  - **Live autocomplete dropdown that appears when typing inside brackets `{}` showing available tokens**
  - **Autocomplete suggestions differentiated by context using color or icon hints**
  - **Token suggestions populated from existing registered tokens in the system**
  - **Validation that ensures Positive Law annotations contain only bracketed token sequences**
  - **Support for markdown content in Interpretation annotations with optional bracketed tokens**
  - **Backward compatibility rendering that automatically converts legacy `{subject} {predicate} {object}` forms into token sequences on display**
  - **Dynamic properties input system with clean UI and asset-based dropdowns**
  - **Location linking functionality with multi-select dropdown**
- **Properties section in CreateAnnotationDialog with:**
  - **Add Property button to create new key–value property pairs**
  - **Each property row contains key and value fields with dropdowns populated from registered property assets**
  - **Remove button for each property row**
  - **Clean, minimal chip-style UI consistent with dialog design**
  - **Fully editable property key and value input fields with proper state binding to the properties array**
  - **Each input's value bound to the component's state with onChange handlers that update the corresponding key/value dynamically**
  - **Focusable and responsive input fields that persist data in the created annotation**
  - **Functional Add Property button that adds empty editable rows**
  - **Functional remove (×) button that removes specific property rows**
  - **Asset-based dropdowns for both key and value input fields using registered digital assets**
- **Token-based autocomplete integration that pulls from registered digital assets for token suggestions while maintaining compatibility with new token creation**
- **Graph filter interface with comprehensive filtering controls for tokens, annotation types, jurisdictions, properties, and locations with dynamically populated dropdowns**
- **Property-based graph filtering with separate dropdowns for property keys and property values**
- **Location-based graph filtering with dropdowns for location titles and metadata keys/values**
- **Graph color theme selector interface positioned near graph view controls with three preset themes (warm, cool, neutral) selectable via toggle or dropdown**
- **Dynamic graph theme switching that updates node, relation, swarm, and location colors without requiring graph reload while maintaining color accessibility and contrast ratios**
- **Unified entity colors where all entity types (tokens and location nodes) follow the selected color theme consistently with nodes using the same color shade per the current theme**
- **Text contrast automatically switches to black text in light mode and white text in dark mode for improved readability across all entity types**
- **Empty state handling**: All views display appropriate empty state messages when no data exists (after reset)
- **Clean state initialization**: Frontend starts with cleared caches and empty query results after reset

## Core User Flow
1. User sees minimalist landing screen with bee and hive animations and static logo display
2. **User can toggle between light and dark mode using the theme toggle positioned prominently on the landing page**
3. User clicks "Get Started" to authenticate with Internet Identity
4. **Application uses simplified authentication architecture with useInternetIdentity managing authentication state and useActor handling backend actor creation**
5. **App.tsx waits for `isAuthenticated && isActorReady` before rendering main app content with clean conditional rendering**
6. **Backend actor is created exactly once per session and used consistently across all dashboard views**
7. **After Internet Identity authentication, the app waits exactly once for actor initialization and proceeds immediately when ready**
8. **Displays a single interim message "Connecting to backend…" during backend binding instead of repeated reconnect attempts**
9. **All local storage and cached session data is cleared before initializing new user profiles to prevent session corruption**
10. **Backend creates new user profile for all users since no existing profiles remain after data reset**
11. **All users are prompted to complete username setup through ProfileSetupModal since no existing profiles exist**
12. **Users complete profile setup and proceed to Dashboard view with their new profile data**
13. **Dashboard loads cleanly showing empty state with "No notebooks yet" message and guidance to create first notebook, plus collapsible right sidebar with empty "Explore Public Swarms" section and collapsible left Control Panel with empty "My Annotations" and "My Locations" sections**
14. **User can navigate directly to Dashboard from any view by clicking the Home icon positioned in the top-left area of the navigation bar**
15. **User can navigate directly to Graph view by clicking the minimal line-based three-node knowledge graph icon button positioned next to the Home icon, which displays "No data to visualize yet" message in empty state**
16. **User can navigate directly to Ontology Builder view by clicking the Ontology Builder icon positioned next to the Graph icon, which displays empty asset workspace with guidance to create first annotations or locations to generate assets**
17. **User can create new swarms by clicking the Create New Swarm floating action button that is persistent across all views, which opens the CreateSwarmDialog with "Create Notebook" title and proper form validation**
18. **User can create new annotations by clicking the Create New Annotation floating action button that is persistent across all views, which opens the CreateAnnotationDialog with annotation type selector and unified markdown editor**
19. **User can select "Positive Law" annotation type for bracket-based token sequences only, or "Interpretation" for markdown with optional tokens**
20. **When creating Positive Law annotations, unified markdown editor validates that only bracketed token sequences are entered (e.g., `{this is} {an example}`)**
21. **When creating Interpretation annotations, unified markdown editor accepts markdown but provides autocomplete for bracketed tokens**
22. **Live autocomplete dropdown appears when typing inside brackets `{}` showing available tokens from the system**
23. **Autocomplete suggestions are differentiated by context using color or icon hints**
24. **User can create new locations by clicking the Create New Location floating action button that is persistent across all views, which opens the CreateLocationDialog with integrated hierarchical checkbox system for selecting parent, child, and sibling relationships**
25. **When creating annotations, tokens are automatically extracted from bracketed content and registered as digital assets**
26. **When creating locations, asset-based dropdowns for metadata keys/values start empty but populate as digital assets are automatically created from new metadata**
27. **Digital assets are automatically registered whenever new tokens, location titles, or metadata keys/values are created**
28. **User can access Ontology Builder through navigation icon or hamburger menu to view all their created and approved digital assets organized in categorized sections including "My Tokens"**
29. **User can create frames in Ontology Builder by clicking "Create Frame" button, which opens CreateFrameDialog with multi-select asset dropdowns populated from their created or approved assets**
30. **User can manage frame visibility, edit frame composition, and delete frames they've created through the Ontology Builder interface**
31. **Authentication state and user profile data persist reliably across browser reloads and view navigation with stable backend connectivity**
32. **All views handle empty state gracefully with appropriate messages and guidance for first actions**
33. User can create swarms, annotations, and locations through the persistent floating action button dialogs
34. **When creating annotations, token-based autocomplete populates with registered digital assets while maintaining compatibility with new token creation**
35. **User can add unlimited key–value properties to annotations using the Properties section with dynamic property inputs that use asset-based dropdowns populated from registered property assets**
36. **User can link annotations to one or more locations using the Link Location dropdown in the CreateAnnotationDialog**
37. **User can create hierarchical location structures by selecting parent, child, and sibling relationships through the integrated hierarchical checkbox system when creating new locations**
38. **Graph view starts empty but populates as swarms, annotations, and locations are created**
39. **Newly created locations immediately appear as independent nodes in the correct external position outside swarms in the Graph view with real-time updates and clustered hierarchical tree structure**
40. **All filtering dropdowns start empty but populate as relevant data is created, including token filters and location-based filters**
41. **User can visualize the research network through the enhanced D3.js-powered Graph view once data exists, including location nodes positioned in the external layer with clustered hierarchical tree structure and unified entity colors following the selected theme**
42. **User can see token titles displayed as visible text labels positioned next to or within their corresponding circles for all tokens, annotations, swarm nodes, and location nodes**
43. **User can click on all tokens, annotations, and locations to trigger highlight or selection events that display details in the right sidebar without affecting authentication or causing re-renders**
44. **User can zoom in the Graph view using Shift + Scroll instead of normal scroll, allowing normal page scrolling without interfering with graph zoom**
45. **User can see enhanced annotation visualization within swarms where each annotation appears as a smaller circle encapsulating its tokens inside the larger swarm boundary**
46. **User can see locations organized in a clustered hierarchical tree structure that visually represents parent-child-sibling relationships with clear spatial grouping, sibling locations clustered horizontally, and parent-child relationships displayed as directional "includes" edges**
47. **User can see hierarchical consistency enforcement where if entities A and B are siblings and C is a parent of B, the graph clearly shows C also as a parent of A through proper edge connections**
48. **User can export graph data in JSON, JSON-LD, or CSV formats with options for full view or current filtered view using the export functionality positioned in the Graph View interface, including location data with hierarchical relationships**
49. **User can approve/disapprove annotations created by others to earn credits and build the knowledge graph**
50. **User can manage identity and assets through Account icon dropdown/modal with clean profile management**
51. **User can manage their created annotations and locations through the Dashboard Control Panel:**
    - **View all their annotations and locations in organized, collapsible sections**
    - **Edit annotations and locations they've created (subject to immutability rules) using unified markdown editor with token-based content editing and integrated hierarchical checkbox system for location relationships**
    - **Toggle annotation visibility between public and private**
    - **Fork immutable annotations to create new versions**
    - **Delete annotations and locations they own**
52. **Annotation immutability enforcement: once a public annotation receives approvals from other users, it becomes immutable and can only be forked, not edited**
53. **User can access Ontology Builder to view and manage all their digital assets organized in categorized sections (tokens, locations, properties, frames)**
54. **User can create frames by selecting from their created or approved digital assets, organizing them into structured knowledge frameworks**
55. **User can manage frame visibility, edit frame composition by adding/removing asset references, and delete frames they've created**
56. **Digital asset system automatically registers every token, location title, and metadata key-value pair as immutable assets (except visibility)**
57. **Token-based autocomplete in annotation and location creation dialogs populate from registered digital assets while maintaining compatibility with new token creation**
58. **All user data persists across sessions for returning users after they create new profiles**
59. **Application starts completely fresh with no historical data, requiring all users to rebuild their research networks from scratch**
60. **Simplified authentication and actor management ensures reliable backend connectivity throughout the session without redundant reconnection attempts**
61. **D3.js graph visualization provides smooth interactive zoom and pan functionality with performance isolation from React authentication state management**
62. **Frontend re-renders (including those from the D3.js graph) do not re-trigger authentication**
63. **Interactive graph elements (clickable tokens, annotations, and locations with visible titles) enhance user experience while maintaining authentication stability**
64. **Layout stabilization prevents re-renders from affecting authentication or actor initialization**
65. **Complete local storage clearing and session corruption prevention ensures clean authentication flow for all users**
66. **Immediate actor verification after authentication and clean logout handling provide future reliability**
67. **Automatic bidirectional hierarchical linking ensures location relationships remain consistent when creating or updating locations**
68. **Token extraction and registration system automatically creates digital assets for all bracketed content in annotations**
69. **Backward compatibility ensures existing triple-based annotations continue to work seamlessly with the new unified markdown editor**
70. **Unified markdown editor replaces legacy subject-predicate-object fields while maintaining full backward compatibility for existing annotations**
