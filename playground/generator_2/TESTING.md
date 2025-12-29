# Testing Guide for Generator 2

## Automated Tests

### Run All Tests
```bash
cd playground/generator_2
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test -- noteUtils
npm test -- GenerativeMelody
npm test -- RhythmicPattern
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Interactive Testing (Browser)

### 1. Start Development Server
```bash
cd playground/generator_2
npm run dev
```

This will start a local server (usually at `http://localhost:5173`)

### 2. Open in Browser
Open the URL shown in the terminal (typically `http://localhost:5173`)

### 3. Test Basic Functionality
- Click "Start" button to begin playback
- Click "Stop" button to stop
- Toggle layers (Bass, Drums, Pads, Melody) on/off
- Listen to the generated music

### 4. Test Complexity System (Browser Console)

Open the browser console (F12 or Cmd+Option+I) and run:

```javascript
// Get the engine instance (if exposed globally)
// Or use the complexity slider in the UI

// Set complexity to simple (0.2)
engine.setMelodyComplexity(0.2);

// Set complexity to moderate (0.5)
engine.setMelodyComplexity(0.5);

// Set complexity to complex (0.8)
engine.setMelodyComplexity(0.8);

// Set complexity to maximum (1.0)
engine.setMelodyComplexity(1.0);
```

### 5. Test Complexity Progression

In the browser console, you can test a progression:

```javascript
// Start simple
engine.setMelodyComplexity(0.2);
setTimeout(() => {
  console.log('Setting complexity to 0.5');
  engine.setMelodyComplexity(0.5);
}, 10000); // After 10 seconds

setTimeout(() => {
  console.log('Setting complexity to 0.8');
  engine.setMelodyComplexity(0.8);
}, 20000); // After 20 seconds
```

## What to Listen For

### Complexity 0.2 (Simple)
- Mostly chord tones
- Even 8th note rhythm
- Few passing tones
- Predictable, safe melody
- More rests

### Complexity 0.5 (Moderate)
- Some passing tones for smoothness
- Occasional syncopation
- Rising/falling phrase contours
- Sounds "musical" and intentional
- Balanced rest/note ratio

### Complexity 0.8 (Complex)
- Frequent passing tones
- Varied rhythms (syncopation, swung, triplets)
- Strong phrase arcs with resolution
- Occasional dissonance (quickly resolved)
- Motif repetition and variation
- Sounds sophisticated, almost "composed"
- Fewer rests, more notes

## Testing Individual Components

### Test Note Utilities
```bash
npm test -- noteUtils
```

Tests:
- Scale generation
- Note transposition
- Interval calculations
- Finding nearest chord tones

### Test Rhythm Patterns
```bash
npm test -- RhythmicPattern
```

Tests:
- Pattern selection based on complexity
- Duration parsing ("8n", "16n", etc.)
- Pattern cycling

### Test Phrase Structure
```bash
npm test -- PhraseStructure
```

Tests:
- Phrase position tracking
- Resolution triggers
- Contour bias (up/down)

### Test Motif Memory
```bash
npm test -- MotifMemory
```

Tests:
- Motif recording
- Transposition
- Retrograde
- Variation selection

### Test Generative Melody
```bash
npm test -- GenerativeMelody
```

Tests:
- Complexity parameter scaling
- All sub-systems integration
- Note generation logic

## Manual Testing Checklist

- [ ] Start/Stop works correctly
- [ ] All layers can be toggled independently
- [ ] Complexity 0.2 sounds simple and predictable
- [ ] Complexity 0.5 sounds balanced and musical
- [ ] Complexity 0.8 sounds complex but still musical
- [ ] Complexity changes take effect immediately
- [ ] No audio glitches or clicks
- [ ] Melody resolves at phrase ends (at higher complexity)
- [ ] Passing tones appear (at complexity > 0.3)
- [ ] Rhythmic variation increases with complexity
- [ ] Motifs repeat and vary (at higher complexity)

## Debugging Tips

### Enable Logging
The logger is enabled by default in `main.ts`. Check browser console for:
- Layer start/stop messages
- Scheduling information
- Errors

### Check Browser Console
Look for:
- Audio context errors
- Note format errors
- Scheduling warnings

### Test in Isolation
You can test just the melody layer:
1. Toggle off Bass, Drums, and Pads
2. Keep only Melody enabled
3. Adjust complexity to hear changes clearly

## Performance Testing

### Check CPU Usage
- Open browser DevTools → Performance tab
- Record while playing
- Check for audio processing spikes

### Check Memory
- Open browser DevTools → Memory tab
- Take heap snapshot
- Check for memory leaks (should be stable)

## Troubleshooting

### No Sound
- Check browser audio permissions
- Ensure audio context is not suspended
- Check browser console for errors
- Try clicking the page first (some browsers require user interaction)

### Tests Failing
- Run `npm install` to ensure dependencies are installed
- Check that Tonal.js is installed: `npm list tonal`
- Clear node_modules and reinstall if needed

### Complexity Not Working
- Check browser console for errors
- Verify `setMelodyComplexity()` is being called
- Ensure melody layer is enabled
- Check that engine is playing

