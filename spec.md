# Specification

## Summary
**Goal:** Rename navigation labels, add a dedicated Collectibles tab, and move the NFT gallery out of the Settings modal.

**Planned changes:**
- Rename the hamburger menu item "Profile Settings" to "Settings"; clicking it still opens the same modal.
- Rename the "BUZZ" authenticated navigation tab to "Leaderboard"; it still renders the BuzzLeaderboard page.
- Add a new authenticated top-level tab titled "Collectibles" that renders the NFTGallery component (law tokens and interpretation tokens), placed alongside the existing tabs (Graph, Tree, Terminal, Swarms, Leaderboard).
- Remove the NFTGallery (Manage Collectibles section) from the ProfileSettingsModal while keeping the Mint Settings / Number of Copies field in place.

**User-visible outcome:** Users see a dedicated "Collectibles" tab in the main navigation for browsing their NFT gallery, a cleaner "Settings" modal focused on mint configuration, and a renamed "Leaderboard" tab replacing "BUZZ".
