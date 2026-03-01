# Specification

## Summary
**Goal:** Fix the SwarmDetailView so that clicking the Yes or No plus button to create a law token automatically injects the current swarm's ID, eliminating the "Parent Swarm does not exist" error.

**Planned changes:**
- In `SwarmDetailView`, read the current swarm's ID from the component's own state/props
- Pass the current swarm's ID automatically into `CreateLawTokenDialog` when opened via the Yes or No plus button
- Ensure `CreateLawTokenDialog` calls the backend law token creation function with the correctly populated swarm ID

**User-visible outcome:** Clicking the Yes or No plus button on a swarm detail page successfully creates a law token associated with the correct parent swarm, without showing the "Parent Swarm does not exist" error and without requiring any additional user input.
