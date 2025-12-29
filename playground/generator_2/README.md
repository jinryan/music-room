# Autonomous Musical Engine

A standalone generative music system that creates hypnotic 8-bar loops with bass, drums, pads, and generative melody.

## Features

- **Harmonic Foundation**: A minor key with Am - F - C - G progression (8 bars total)
- **Bass Layer**: Root notes on beats 1 and 3
- **Drum Layer**: Four-on-floor pattern (kick on 1&3, snare on 2&4, hi-hat on 8th notes)
- **Pad Layer**: Sustained synth chords with reverb
- **Generative Melody**: Markov-like note selection with 40% rest probability

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Setup

1. **Install dependencies**:
   ```bash
   cd playground/generator_1
   npm install
   ```

## Running the Application

### Development Server

Start the development server:

```bash
npm run dev
```

This will:
- Start a Vite dev server on `http://localhost:3001`
- Automatically open the app in your browser
- Enable hot module replacement for live updates

### Using the Application

1. **Open the app** in your browser (should open automatically)
2. **Click "Start"** to begin the musical loop
   - Note: Modern browsers require user interaction before playing audio
   - The first click will unlock the audio context
3. **Click "Stop"** to stop the music
4. The status indicator shows whether the engine is playing or stopped

### Build for Production

To build a production version:

```bash
npm run build
```

The built files will be in the `dist/` directory. Preview the production build:

```bash
npm run preview
```

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all unit tests once and exits.

### Watch Mode (for development)

```bash
npm run test:watch
```

This runs tests in watch mode, automatically re-running when files change.

### Test Coverage

```bash
npm run test:coverage
```

This generates a coverage report showing which parts of your code are tested.

## Test Structure

The test suite includes:

- **utils.test.ts**: Tests for note-to-frequency conversion
- **config.test.ts**: Tests for configuration structure
- **ChordProgressionManager.test.ts**: Tests for chord progression logic
- **BassLayer.test.ts**: Tests for bass layer scheduling
- **DrumLayer.test.ts**: Tests for drum patterns
- **GenerativeMelody.test.ts**: Tests for melody generation
- **AutonomousEngine.test.ts**: Tests for engine lifecycle

All tests use mocked Web Audio API, so they run without requiring actual audio hardware.

## Project Structure

```
playground/generator_1/
├── index.html          # Main HTML file
├── main.ts             # Application entry point
├── style.css           # Styles
├── config.ts           # Musical configuration
├── utils.ts            # Shared utilities
├── ChordProgressionManager.ts  # Chord progression logic
├── BassLayer.ts        # Bass synth layer
├── DrumLayer.ts        # Drum patterns
├── PadLayer.ts         # Pad/synth layer
├── GenerativeMelody.ts # Melody generation
├── AutonomousEngine.ts # Master coordinator
└── *.test.ts           # Test files
```

## Troubleshooting

### Audio Not Playing

- Make sure you've clicked the "Start" button (browsers require user interaction)
- Check browser console for errors
- Verify your browser supports Web Audio API (all modern browsers do)

### Tests Failing

- Make sure dependencies are installed: `npm install`
- Check that you're in the `playground/generator_1` directory
- Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`

### Port Already in Use

If port 3001 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

## Technical Details

- **Tempo**: 120 BPM
- **Time Signature**: 4/4
- **Loop Length**: 8 bars (32 beats)
- **Chord Duration**: 2 bars per chord
- **Audio API**: Native Web Audio API (no external libraries)

## License

Part of the music-room project.

