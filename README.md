# Breakwater Studio

**A free loop sequencer inspired by Making Waves. It opens your old Making Waves songs.**

*Dedicated to the memory of Stephen Steele, creator of Making Waves.*

Breakwater Studio brings back the simple, fast way of making music that Making Waves was loved for: tracks down the side, bars across the top, and click a bar to switch a sound on or off. It also adds what you'd expect from a modern studio. It runs on Mac, Windows and Linux, or straight in your web browser, and it's completely free.

---

## Download

Get the latest version from the **[Releases](../../releases)** page:

| Computer | File | First launch |
|---|---|---|
| **Mac** (Apple Silicon) | `Breakwater Studio-x.x.x-arm64.dmg` | Drag it into Applications. The first time, right-click the app → **Open** → **Open**. |
| **Windows** | `Breakwater Studio Setup x.x.x.exe` | If you see "Windows protected your PC", click **More info → Run anyway**. |
| **Linux** | `.deb` (Ubuntu, Mint, Debian) or `.AppImage` (any Linux) | For the AppImage, allow it to run as a program, then double-click it. |

Or use the **web version**: download `breakwater-studio.html` and open it in Chrome or Edge. There's nothing to install.

---

## What it does

**Making songs**
- Loop sequencer in the Making Waves style: tracks, bars, sections, restarts and stop signs
- Percussion grids, a piano roll, and a Beat Splicer for chopping up breakbeats
- **Rhythm 80:** a built-in analogue-style drum machine, plus 19 drum pattern templates
- **Polysynth** (Juno-style) and a modelled **bass guitar**
- **Chords & Bass generator:** nearly 100 progressions, voice-led chords and bass lines
- Kits and multisampled instruments made from your own sounds
- Swing, timing and velocity humanise

**Recording**
- Record vocals and instruments, with count-in, loop recording (one take per pass) and punch-in
- Split mode records two inputs at once, for example vocals on input 1 and guitar on input 2
- Latency measurement, so recordings line up
- **Live Rack:** amp sims and effects on your input in real time, for practice or playing live
- Built-in tuner

**Effects**

Pitch correction (auto-tune), de-esser, compressor, EQ, reverb, echo, chorus, amp and cabinet sims, mic sims, noise reduction, transient shaper, exciter, maximiser, sidechain pump and more. All are adjustable bar by bar.

**Files**
- Opens **Making Waves songs (.trk)**: tracks, patterns, volumes, pans, stop signs, offsets and trims. The desktop app finds their sounds automatically.
- MIDI file import and export
- Export to WAV or MP3
- Bounce/freeze heavy tracks to keep big songs running smoothly

**Desktop app extras**
- Real saving (`.bwsong`), Open Recent, and unsaved-changes protection
- A **sound library**: your sample folders, always in the browser
- No microphone or MIDI permission pop-ups. macOS asks once, the very first time.

Everything stays on your own computer. Breakwater has no accounts, no tracking and no cloud.

---

## Building it yourself

You'll need [Node.js](https://nodejs.org) (the LTS version).

```
npm install
npm run dist:mac      # or dist:win / dist:linux
```

The installers appear in the `release` folder. `BUILD-ON-MAC.txt` has step-by-step Mac instructions.

The app itself is a single HTML page, `app/index.html`. The desktop wrapper (Electron) is in `main.js` and `preload.js`.

---

## About

Breakwater Studio is an independent project, written from scratch. It uses no Making Waves code and is not affiliated with or endorsed by Making Waves Audio Ltd. "Making Waves" is mentioned only to describe compatibility.

MP3 export uses the LAME encoder (lamejs, LGPL).

See [LICENSE](LICENSE) for the licence.
