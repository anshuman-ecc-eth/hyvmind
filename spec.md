# Hyvmind: a notebook that values research

## Overview
Hymind is a research-to-earn platform designed for lawyers to create and manage tokenized annotation roots through source-text creation and legal domain specialization.

## Document Title
The application document title should be set to "Hymind: a notebook that values research" in the HTML document head.

## Meta Description
The application meta description in `frontend/index.html` should be set to "Hyvmind".

## Authentication
- Users authenticate via Internet Identity
- No external authentication providers required

## Navigation
The application includes a header navigation component with:
- "Dashboard" button/link that routes to the user's dashboard view
- Navigation buttons styled consistently with minimalist grayscale design
- Subtle hover effects maintaining the monochrome aesthetic
- Login state preserved when navigating between views

## User Onboarding and Dashboard Flow
After successful login, users are redirected to a dashboard. The swarm selection interface is only accessible through the dashboard profile page, not automatically displayed after login.

Users can navigate to their profile page within the dashboard to select from 1 to 4 swarms from a dropdown containing major areas of Indian law:
- Constitutional Law
- Criminal Law
- Corporate Law
- Civil Law
- Taxation Law
- Environmental Law
- Intellectual Property Law
- Labour Law
- Family Law
- Property Law
- Administrative Law

Users can also add custom swarms via text input field for personalized research areas.

## Swarm Selection Interface
The swarm selection is presented as a minimal, card-based interface within the dashboard profile page with:
- Clear step-by-step progression for selecting swarms
- Card-based layout maintaining clean, readable aesthetic
- Dropdown selection for predefined Indian law areas
- Text input field for custom swarm creation
- Visual indication of selected swarms (up to 4 maximum)
- Clean, minimal design consistent with Hymind branding
- Only accessible from within the dashboard, not as a popup after login
- **Completely solid, opaque white background in light mode and solid, opaque dark background in dark mode with no transparency or translucency**
- **No name input field in the Create Swarm dialog - name management remains exclusively within the Settings dialog**

## Settings Management
The dashboard includes settings functionality that allows users to:
- Manage personal information including name
- Update profile details
- Access swarm selection interface
- Maintain user preferences within the minimalist design aesthetic
- **General "Settings" button visible on every user's profile page that opens the existing SettingsDialog for managing name and swarm selections**
- **Settings button remains functionally independent and distinct from the Create Swarm button**

## Crypto Wallet Integration
The dashboard includes crypto wallet functionality using Push Wallet:
- Push Wallet integration using `@pushchain/ui-kit` library with `PushUniversalWalletProvider`, `PushUniversalAccountButton`, and `PushUI` components
- TESTNET configuration with dark theme mode for Push Wallet components
- EVM and Solana wallet compatibility through Pushchain's UI kit
- Connected wallet addresses stored in user session/local state
- Simple connect/disconnect functionality displaying wallet connection status
- All wallet components styled to match Hymind's minimalist grayscale design
- Required dependencies: `@pushchain/ui-kit`
- **Wallet connection modal with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode with no transparency or translucency**

## Note Creation and Management
The dashboard includes a "Create New Note" button that allows users to create two types of notes:

### Note Types
- **Type 1 ("Positive Law")**: Source-text notes containing positive law content (statutes, caselaw, etc.)
- **Type 2 ("My Interpretation of Positive Law")**: Interpretation notes that must be linked to an existing Type 1 note

### Note Creation Process
Users can create notes with:
- Note type selection (Type 1 or Type 2)
- For Type 2 notes: mandatory selection of an existing Type 1 note to link to
- Title field requiring a 6-character alphanumeric code (first 3 digits numeric, last 3 letters alphabetic) with helper text: "Example: If you're working on Article 19 of the Constitution, you could title your note as **'019art'**. This helps us build a common vocabulary for shared source-texts."
- Markdown-compatible text body input for writing note content
- Tags field for categorization
- Category dropdown populated with the user's selected swarms (must select exactly one)
- For Type 1 notes: Type dropdown with two options: 'statute' or 'caselaw' (mutually exclusive selection)
- **Jurisdiction dropdown field pre-populated with a list of all countries and their standard three-letter ISO codes (e.g., IND for India, AUS for Australia, USA for the United States, etc.), selectable when creating or editing a note**
- Make Public toggle button to choose whether the note is public or private
- Custom metadata editor allowing users to add and edit key-value pairs for extensible structured data
- The note is automatically categorized under the user's selected swarms

### Note Creation Dialog
The note creation and editing dialog features:
- **Completely solid, opaque white background in light mode and solid, opaque dark background in dark mode with no transparency or translucency**
- **Full visual separation from underlying content with 100% opacity background color that ensures optimal readability**
- **High contrast text and form elements that adapt properly to both light and dark themes**
- **Modal overlay with completely opaque background implementation that prevents any see-through effects**
- **Solid background color that provides complete visual separation while maintaining the minimalist aesthetic**
- Consistent styling that maintains the minimalist aesthetic while providing clear visual distinction
- No translucent, semi-transparent, or see-through background elements whatsoever
- **All new fields including the Jurisdiction dropdown maintain the existing solid background style and minimal, card-based UI design for clarity and consistency**

### Create New Note Button Behavior
The "Create New Note" button in the dashboard:
- **Must always appear enabled and responsive when the user has completed the required setup (selected swarms)**
- **Should only become disabled during the actual note saving process, not due to empty form fields in the unopened dialog**
- **Button state should update smoothly and immediately reflect the correct enabled/disabled status**
- **Should be fully clickable and responsive when all prerequisite conditions are met**
- **Disabled state should only occur when actively saving a note or when user hasn't completed initial setup**
- **Must properly connect to functional backend endpoints for note creation and retrieval**

### Note Management
Users can edit existing notes through:
- Edit button available on each note's card
- Ability to update all note fields including title (6-character code), markdown text content, tags, category, type, jurisdiction, public visibility, and custom metadata
- All field changes must be properly saved to the backend with guaranteed persistence of all updated content
- Updated notes are immediately reflected in the user interface after saving with all changes visible
- Markdown text content field changes must be fully persisted and retrievable
- Metadata rows can be added, edited, and removed during note editing

## LiveGraph Canvas Component
The main dashboard features a LiveGraph canvas that:
- Displays all publicly visible Type 1 positive-law notes as labeled circular nodes in real-time
- Each node shows the note's 6-character title code as clear, readable text labels
- Visual design inspired by Obsidian's graph view with circular nodes, smooth layout algorithms, and clear node labeling
- Nodes are positioned to symbolically represent their location in the Indian legal semantic space
- Node placement corresponds to legal category and type for semantic visual distinction (statutes vs. caselaw)
- Dynamically refreshes when new public Type 1 notes are created or when existing notes are edited and marked public
- Updates automatically without requiring page reload when notes are marked as public
- Maintains the minimalist grayscale design aesthetic with clear, readable node labels
- Provides an interactive visualization of the shared legal knowledge base with Obsidian-style smooth animations
- Ensures all public Type 1 source-texts are properly displayed as labeled circular nodes with real-time synchronization
- Node labels use the note title for clear identification

## Simplified User Dashboard
The main dashboard displays a simplified interface with only three clear buttons:
- **"Select Swarms"** button that navigates to the swarm selection interface with an icon representing a group of people to signify community or swarms visually (replacing the gear icon)
- **"Create Notes"** button that opens the note creation dialog
- **"Connect Wallet"** button that provides access to Push Wallet integration
- All buttons maintain the minimalist, card-based design aesthetic
- Clean, visually intuitive layout consistent with the current aesthetic
- Dark mode toggle functionality available only in dashboard and internal app pages with **solid, opaque background that contrasts properly with both light and dark themes**
- Logout functionality that returns users to the landing page
- LiveGraph canvas component displaying public Type 1 notes as interactive labeled circular nodes

## Backend Data Storage
The backend stores:
- User profiles with selected swarms (1-4 areas from Indian law plus custom swarms)
- Custom swarms created by users via text input
- User personal information including name (managed through settings)
- Type 1 notes (positive law): 6-character title code, markdown content, tags, creator, creation date, associated swarms, category, statute/caselaw type, jurisdiction, isPublic boolean, custom metadata key-value pairs
- Type 2 notes (interpretations): 6-character title code, markdown content, tags, creator, creation date, associated swarms, category, jurisdiction, linked Type 1 note ID, isPublic boolean, custom metadata key-value pairs
- Note relationships linking Type 2 notes to their corresponding Type 1 notes
- User authentication state via Internet Identity
- Public Type 1 notes data for LiveGraph display with proper content persistence
- Complete markdown text content for all notes with reliable persistence
- Custom metadata storage for extensible structured data per note
- **Jurisdiction data for all notes with three-letter ISO country codes**

## Backend Operations
The backend must implement robust user profile management with the following critical fixes:
- **Fixed `getOrCreateCallerUserProfile` function that reliably returns a valid UserProfile object for authenticated users, creating a new profile with default values if none exists**
- **Guaranteed automatic user profile creation during first login with immediate return of properly structured profile object containing empty swarms array and default user information**
- **Reliable profile retrieval that never returns null or undefined, with proper error handling and automatic fallback to profile creation when profile retrieval fails**
- **Proper error handling for profile operations with robust exception management and graceful degradation**
- **Immediate profile initialization with default empty swarms array for new users without delays or hanging states**
- **Guaranteed profile data availability before dashboard rendering with proper serialization and deserialization of all profile fields**
- **The `getOrCreateCallerUserProfile` function must handle both existing and new user scenarios correctly, ensuring consistent return of valid profile objects**
- **Proper user role assignment and permission checks for the logged-in principal to access their profile without authorization errors**
- **Backend endpoint must be accessible and functional for authenticated users with proper Internet Identity integration**
- User registration and profile management with proper serialization and persistence
- User personal information management through settings interface
- Swarm selection and updates (1-4 areas including custom swarms) with guaranteed data persistence
- Custom swarm creation and storage for user profiles
- Note creation for both Type 1 and Type 2 with all required fields including jurisdiction and custom metadata using existing Motoko models
- Note relationship management ensuring Type 2 notes are properly linked to Type 1 notes with correct linkType1NoteId persistence
- Note editing and updates for existing notes with guaranteed persistence of all field changes including markdown content, jurisdiction, and metadata
- Proper saving and retrieval of all updated note fields during edit operations with complete data integrity
- User-specific data queries for dashboard display including note relationships without crashes or null returns
- Real-time queries for public Type 1 notes to populate LiveGraph canvas
- Immediate synchronization when Type 1 notes are marked public or edited to ensure LiveGraph updates
- Event-driven updates to notify LiveGraph component of changes to public note status
- Proper retrieval and serving of all public Type 1 source-texts for LiveGraph display with real-time refresh capability
- Robust data persistence ensuring all field updates including metadata and jurisdiction are saved and retrievable
- Validation ensuring Type 2 notes cannot be created without valid Type 1 note links
- **Functional backend endpoints that properly handle note creation, editing, and retrieval operations**
- **Correct serialization of note data including title, content, tags, jurisdiction, metadata, linkType1NoteId, and swarms**
- **Successful user login to dashboard loading to note management flow without backend errors or hanging states**

## Frontend Interface
- Minimalist aesthetic with clean, monochrome design
- **Alegreya Sans** font family applied consistently across the entire application including both landing page and dashboard
- Dark mode toggle functionality available only in dashboard and internal app pages (not on landing page) with **solid, opaque background that contrasts properly with both light and dark themes**
- Landing page forced to display in light mode regardless of user system theme or settings
- Header navigation component with "Dashboard" button styled in grayscale palette
- Site favicon uses the Hymind logo
- Landing screen features the Hymind logo with reduced visual prominence using the text-free extracted logo asset
- Main heading displays "welcome" in elegant typography (all lowercase)
- Subtitle **"to your notebook"** with typewriting animation effect and blinking text cursor at the end
- Enhanced minimalist geometric SVG graphics with slower, smoother, and less exaggerated node interconnections positioned closer to the logo and away from main text to preserve readability and visual focus, featuring:
  - Browser-agnostic rendering using solid fills and blend modes instead of filters for consistent brightness and contrast across all major browsers including Edge and Firefox
  - **Outlined black circles with transparent (white) interiors rather than filled shapes for all nodes/circles**
  - **Monochrome color palette using only black, white, and grey tones across all nodes, shadows, edges, and connection lines for complete color removal while maintaining visual balance and minimalist cohesion**
  - **All node clusters and connection lines rendered in grayscale spectrum without any color elements**
  - **Enhanced spatial movement where nodes/circles within each cluster shift relative to each other more dynamically in response to cursor movement while maintaining minimalist motion and avoiding scaling or glow effects**
  - Gradual cursor-driven behaviors where nodes respond smoothly to cursor movement with **spatial displacement only (no scaling, glow effects, or complex morphing)**
  - **Substantially reduced number of connection lines/edges to create a sparser network while maintaining cursor responsiveness**
  - Subtle interlinking animations where corner node clusters form temporary connections with smooth animation intensity and gentle visual effects influenced by cursor movement
  - Organic spring-like transitions as nodes link and unlink with smooth, responsive performance across browsers
  - Gentle connection line animations with smooth intensity and subtle visual effects
  - Nodes responding to cursor position with flowing relationships, dynamic interconnections, and smooth movement behaviors that feel natural and organic **limited to spatial movements only**
  - Bottom graph clusters horizontally aligned with the top clusters to create a balanced framing effect around the center section containing the title and tagline
  - Alignment changes preserve all interactive and animated behavior while enhancing visual symmetry across screen sizes
  - **Animation behavior maintains current smoothness and timing without exaggeration while enforcing radically minimalist visual aesthetic**
  - **No glowing effects on nodes and circles**
  - **Corner graph cluster animations start almost invisible on initial page load and slowly fade into view as the user moves the cursor across the page, maintaining their spatial dynamics and minimal black-white-grey color scheme**
  - **Cursor inactivity behavior: All nodes automatically return to invisibility (opacity 0) after a short period of no cursor movement, and gradually reappear only when cursor movement resumes, with smooth aesthetic transitions that fit the minimalist design**
- Two action buttons beneath the subtitle:
  - "Get Started" button that leads to Internet Identity authentication and redirects to dashboard
  - "Join Community" button styled with black styling to match the "Get Started" button that opens https://app.cg/c/staram/ in a new tab
- Modern, minimal sans-serif fonts for optimal visual symmetry
- Clean background with minimal contrast color palette using monochrome OKLCH grayscale design system
- Responsive design optimized for desktop and mobile use
- English language interface
- Structured text layout optimized for legal professionals when accessing main application features
- Note cards display 6-character title code with minimized information showing note type, category, tags, jurisdiction, and for Type 1 notes the statute/caselaw type
- For Type 2 notes: visual indication of linked Type 1 note relationship
- Edit buttons integrated seamlessly into the minimal design aesthetic
- **Simplified dashboard with three clear buttons: "Select Swarms" (with group of people icon), "Create Notes", and "Connect Wallet"**
- Markdown editor interface for note content with clean, minimal design
- Custom metadata editor with add/remove functionality for key-value pairs
- **Jurisdiction dropdown field in Create Note Dialog with all countries and their three-letter ISO codes maintaining solid background style and minimal, card-based UI design**
- LiveGraph maintains consistent grayscale styling with smooth animations, clear node labels, and real-time updates
- Edit functionality ensures all field changes including markdown content, jurisdiction, and metadata are properly saved and immediately visible
- Push Wallet components styled consistently with the minimalist grayscale design aesthetic using dark theme mode
- **All modal dialogs including swarm selection, note creation, wallet connection, and settings with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode ensuring optimal readability and full visual separation**
- **Frontend properly connects to functional backend endpoints for note creation and retrieval operations**
- **Card-based swarm selection interface with clean, minimal design consistent with Hymind branding accessible only through dashboard settings with solid, opaque background and no name input field**
- **Settings interface for managing personal information and profile details with solid, opaque background accessible via general "Settings" button visible on every user's profile page**
- Logout functionality accessible from dashboard that returns users to landing page
- **Fixed frontend initialization logic that properly calls the backend `getOrCreateCallerUserProfile` endpoint after successful Internet Identity authentication**
- **Robust handling of loading states with proper loading spinners during profile initialization and timeout recovery mechanisms to prevent infinite loading loops**
- **Proper transition from "Initializing..." state to dashboard with three main buttons once profile is successfully loaded or created**
- **Graceful error handling in profile loading with automatic retry mechanisms and fallback to profile creation when needed**
- **Immediate dashboard rendering after successful profile retrieval or creation without hanging on loading states**
- **Frontend useQueries hook properly handles null profile scenarios with robust error boundaries and graceful degradation**

## Core User Flow
1. User sees minimalist landing screen with reduced prominence Hymind logo (text-free extracted version), main heading "welcome" (all lowercase), subtitle **"to your notebook"** with typewriting animation effect and blinking text cursor, enhanced geometric animations with browser-agnostic outlined black circles with transparent (white) interiors featuring slower, smoother, and less exaggerated cursor-driven behaviors with enhanced spatial displacement effects where nodes shift relative to each other more dynamically within clusters (no scaling or glow), gentle connection line animations with monochrome color palette using only black, white, and grey tones, organic spring-like transitions, and smooth interlinking animations between corner node clusters with substantially reduced connection lines for sparser network and bottom clusters horizontally aligned with top clusters for balanced framing - all displayed in forced light mode with smooth performance and responsiveness within radically minimalist composition, with corner graph cluster animations starting almost invisible on initial load and slowly fading into view as the user moves the cursor across the page, and automatically returning to invisibility after cursor inactivity with smooth transitions
2. User clicks "Get Started" button to authenticate with Internet Identity or "Join Community" button to open https://app.cg/c/staram/ in a new tab
3. **User is successfully authenticated via Internet Identity and the frontend immediately calls the backend `getOrCreateCallerUserProfile` endpoint with proper loading state management**
4. **Frontend displays "Initializing..." with loading spinner while the backend processes the profile request, with timeout recovery mechanisms to prevent infinite loading**
5. **Backend `getOrCreateCallerUserProfile` function reliably returns a valid UserProfile object, creating a new profile with default values if the user is new, ensuring no null or undefined returns**
6. **Frontend successfully receives the profile data and transitions smoothly from "Initializing..." state to the simplified dashboard with three clear buttons: "Select Swarms" (with group of people icon), "Create Notes", and "Connect Wallet"**
7. **Dashboard renders immediately with all buttons functional, dark/light mode toggle with solid, opaque background becomes available, and LiveGraph canvas displays properly**
8. User can click "Connect Wallet" to access EVM or Solana wallets using Push Wallet integration with `PushUniversalWalletProvider` and `PushUniversalAccountButton` in modal with **completely solid, opaque white background in light mode and solid, opaque dark background in dark mode**
9. **User can access Settings via the general "Settings" button visible on every user's profile page to manage personal information and select 1-4 swarms from dropdown of Indian law areas and/or add custom swarms via text input using card-based interface with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode**
10. **User can click "Create Notes" to access the properly enabled note creation functionality and create either Type 1 or Type 2 notes using the modal dialog with completely solid, opaque white background in light mode and solid, opaque dark background in dark mode for optimal readability**
11. For Type 1 notes: User creates positive law notes with 6-character title codes, markdown content, tags, category, statute/caselaw type, jurisdiction selection from dropdown with three-letter ISO country codes, public visibility settings, and custom metadata
12. For Type 2 notes: User selects an existing Type 1 note to link to, then creates interpretation notes with 6-character title codes, markdown content, tags, category, jurisdiction selection, public visibility settings, and custom metadata
13. When user marks a Type 1 note as public, it automatically appears as a new labeled node on the LiveGraph canvas in the dashboard with real-time updates
14. User can view their created notes (both types) with minimized display showing note type, category, tags, jurisdiction, and linked relationships, and edit them using edit buttons with the modal dialog featuring **completely solid, opaque white background in light mode and solid, opaque dark background in dark mode**
15. User can edit existing notes with all fields including markdown content, jurisdiction, and metadata properly saved and immediately reflected in the dashboard
16. User can create additional notes of both types and manage existing ones with reliable saving functionality for all fields
17. User can navigate to Dashboard view using header navigation button while maintaining login state
18. LiveGraph in dashboard dynamically refreshes to display all public Type 1 source-texts as labeled circular nodes with Obsidian-inspired design and real-time synchronization
19. User can toggle dark/light mode from dashboard using toggle with solid, opaque background which affects all internal app pages but not the landing page
20. User can manage wallet connections through Push Wallet interface with connect/disconnect functionality in modal with **completely solid, opaque white background in light mode and solid, opaque dark background in dark mode**
21. User can logout from dashboard to return to landing page
22. **Complete user login → Internet Identity authentication → profile retrieval/creation → dashboard loading → note management flow functions without crashes, hanging, or infinite loading loops, with guaranteed smooth transition from "Initializing..." to functional dashboard**
