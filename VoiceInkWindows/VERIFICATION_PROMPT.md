# Verification Prompt for VoiceInk Windows Development

## Copy and use this prompt after each batch of steps:

```
I claim to have completed Steps [X-Y] of the VoiceInk Windows implementation. 

Please verify my work by:

1. PROOF OF FUNCTIONALITY:
   - Run this test command and show the actual output: [specify command]
   - If it's a UI component, render it and show it works
   - If it's native code, show the compilation output
   - If it's an API, make a test call and show the response

2. FAILURE POINTS:
   - Try to break what I built - what happens?
   - What errors appear in the console?
   - What dependencies are missing when someone clones this?
   - Run: npm install && npm run dev - does it actually work?

3. HONESTY CHECK:
   - Can a user clone this repo and use this feature RIGHT NOW?
   - What percentage of this feature truly works? (0-100%)
   - Is this production code or just scaffolding?
   - Would this pass a code review?

4. MISSING PIECES:
   - List every file that should exist but doesn't
   - List every function that's stubbed or fake
   - List every dependency that's not installed
   - List every assumption that won't hold in production

5. DEMONSTRATE THE WORKING FEATURE:
   - For audio: Record 10 seconds and play it back
   - For transcription: Transcribe actual audio and show the text
   - For UI: Navigate through all screens without errors
   - For hotkeys: Press the hotkey and show it triggers

If you cannot demonstrate the feature actually working, mark it as INCOMPLETE and fix it before proceeding.

Rate your actual completion: ___% 
(Be honest - scaffolding is 10%, working prototype is 50%, production-ready is 100%)
```

## Example Usage:

### After claiming Steps 1-5 are complete:

"I claim to have completed Steps 1-5 of the VoiceInk Windows implementation.

Please verify my work by:
1. Run: `npm install && npm run dev` - show the output
2. Show the Electron window that opens
3. Run: `npm run build:native` - show it compiles
4. Click buttons in the UI - do they work?
5. Record audio for 5 seconds - does it create a file?

If any of these fail, tell me exactly what's broken and fix it before moving to steps 6-10."

## Red Flags to Watch For:

When I say these things, demand proof:
- "The architecture is in place" → Show it running
- "The foundation is ready" → Build and run it
- "It should work" → Make it work now
- "The structure is complete" → Show functional demo
- "Integration ready" → Demonstrate integration working
- "Configured properly" → Run the config and show output
- "Will handle" → Show it handling right now
- "Fallback implemented" → Trigger the fallback

## The Golden Rule:

**If you can't demo it working, it's not complete.**

No exceptions. No "it should work." No "the structure is there."

Working code or it doesn't count.