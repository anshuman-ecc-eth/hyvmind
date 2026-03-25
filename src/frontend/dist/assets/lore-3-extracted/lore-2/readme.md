
Use the following instructions to navigate through the rest of the files in this folder and  generate the text-based game: 

- Always start with the "opening" file and read through it sequentially.
- While reading, follow this syntax:
	- '(M)' for messages 
	- '(P)' for available paths
	- '(S)' for sources
	- '...' for pauses
- Render all text after these symbols as is, with the following effects:
	- message: typed in effect with blinking cursor
	- path: navigable option buttons 
	- source: ascii box with text inside next to a monochrome book icon
	- pauses: one second delay before rendering the rest of the message; the three dots (...) can become visible one after another in this one second pause 
- When you encounter a message, render it and wait for the player to continue.
- When you encounter double square brackets (e.g. [[example-text]]) inside a message, treat it as clickable/tappable text. When the user interacts with it, find its corresponding filename and render its content.  
- When you encounter a series of paths, render them as distinct buttons:
	- active: filename enclosed in double square brackets, e.g. [[path-file]]. 
		- render it as an active button, 
		- when clicked, read its contents to continue the game. 
	- inactive: filename not enclosed in double square brackets.
		- render it as a greyed out button,
		- cannot be clicked.
- Every time you render paths, add two extra options at the end:
	- 'continue': continue on the main path
	- 'retrace': go back to the last message.
- End the game automatically when you:
	- find any error in the game flow, or
	- are done traversing a file, or
	- encounter an empty file. 


