#!/usr/bin/env python3
"""
STRANGER THINGS AUDIO GENERATOR - AI Edition
=============================================
Uses Meta's MusicGen via Hugging Face Transformers
Professional quality 80s dark synth generation

Requirements: pip install transformers accelerate scipy torch torchaudio
"""

import os
import sys
import numpy as np
from scipy.io import wavfile

# Check if we can use MusicGen
try:
    import torch
    from transformers import AutoProcessor, MusicgenForConditionalGeneration
    HAS_MUSICGEN = True
    print("✓ MusicGen available via Transformers")
except ImportError as e:
    HAS_MUSICGEN = False
    print(f"✗ MusicGen not available: {e}")

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"
SFX_DIR = "/workspaces/Virtualstudio/public/audio/sfx"
SAMPLE_RATE = 32000  # MusicGen outputs at 32kHz

# Stranger Things style prompts - optimized for MusicGen
STRANGER_THINGS_PROMPTS = {
    # Main atmospheric tracks
    "dark-synth-pad": {
        "prompt": "dark analog synthesizer pad, 80s horror movie soundtrack, deep bass drone, "
                  "reverb atmosphere, john carpenter style, slow evolving texture, mysterious, "
                  "minor key, moog synthesizer, ambient electronic",
        "duration": 30
    },
    "pulsing-bass": {
        "prompt": "pulsing 80s synth bass, driving electronic beat, dark wave, "
                  "analog drum machine, stranger things inspired, 100 bpm, "
                  "retro synthesizer, new wave, dark and moody",
        "duration": 30
    },
    "eerie-arpeggio": {
        "prompt": "haunting minor key arpeggio, 80s synthesizer sequence, dark ambient, "
                  "juno 60 style, reverb drenched, slow tempo, cinematic horror, "
                  "mysterious atmosphere, analog electronic",
        "duration": 30
    },
    "upside-down": {
        "prompt": "dark distorted ambient drone, otherworldly atmosphere, horror soundscape, "
                  "low rumbling bass, alien textures, reversed sounds, nightmare realm, "
                  "industrial dark ambient, evil presence",
        "duration": 30
    },
    "tension-build": {
        "prompt": "building tension soundtrack, rising synth crescendo, horror movie suspense, "
                  "dissonant cluster, increasing intensity, 80s thriller score, "
                  "analog synthesizer, dread atmosphere",
        "duration": 30
    },
    "synth-choir": {
        "prompt": "ethereal synthesizer choir, vocal pad, mellotron style, "
                  "haunting atmosphere, 80s soundtrack, angelic yet dark, "
                  "string machine, ambient electronic, reverb",
        "duration": 30
    },
    "retro-drums": {
        "prompt": "80s electronic drums, linn drum style, gated reverb snare, "
                  "new wave beat, 110 bpm, phil collins style drums, "
                  "vintage drum machine, dark wave",
        "duration": 30
    },
    "portal-rift": {
        "prompt": "interdimensional portal sound, swirling synthesizer, sci-fi atmosphere, "
                  "otherworldly whoosh, phase shifting, alien gateway, "
                  "dark ambient electronic, space sounds",
        "duration": 30
    },
    "mind-flayer": {
        "prompt": "massive dark bass drone, terrifying presence, horror movie monster theme, "
                  "sub bass rumble, evil atmosphere, dissonant synth, "
                  "lovecraftian horror soundtrack, deep and menacing",
        "duration": 30
    },
    "eleven-power": {
        "prompt": "psychic power activation, building energy synth, resonant frequencies, "
                  "telekinesis sound design, ascending tones, supernatural power, "
                  "80s sci-fi soundtrack, climactic build",
        "duration": 30
    },
    "lab-ambience": {
        "prompt": "sterile laboratory ambience, fluorescent hum, electronic equipment, "
                  "government facility, unsettling atmosphere, computer beeps, "
                  "clinical horror, vintage electronics",
        "duration": 30
    },
    "hawkins-night": {
        "prompt": "small town night atmosphere, 80s suburban ambience, crickets and synth, "
                  "mysterious undertone, something lurking, dark Americana, "
                  "nostalgic yet creepy, stranger things",
        "duration": 30
    },
}

# Short SFX prompts
SFX_PROMPTS = {
    "click": {
        "prompt": "digital glitch click, electronic interface sound, retro computer beep, short",
        "duration": 2
    },
    "hover": {
        "prompt": "soft synth tone, gentle electronic hum, interface hover sound",
        "duration": 2
    },
    "success": {
        "prompt": "triumphant synth chime, positive achievement sound, 80s video game win",
        "duration": 3
    },
    "error": {
        "prompt": "dark error buzz, descending synth tone, failure sound, ominous",
        "duration": 2
    },
    "notification": {
        "prompt": "synth notification bell, two tone alert, electronic ping, retro",
        "duration": 2
    },
    "whoosh": {
        "prompt": "synth whoosh sweep, filtered noise, sci-fi transition sound",
        "duration": 2
    },
    "pop": {
        "prompt": "dramatic synth hit, reveal sting, impact sound, 80s movie",
        "duration": 2
    },
}


def generate_with_musicgen(prompt: str, duration: int, output_path: str) -> bool:
    """Generate audio using MusicGen model"""
    if not HAS_MUSICGEN:
        return False
    
    try:
        # Load model (will cache after first load)
        processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
        model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
        
        # Move to GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device)
        
        # Process prompt
        inputs = processor(
            text=[prompt],
            padding=True,
            return_tensors="pt",
        ).to(device)
        
        # Calculate tokens needed for duration (32000 samples/sec, 50 tokens/sec)
        max_new_tokens = int(duration * 50)
        
        # Generate
        with torch.no_grad():
            audio_values = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.8,
            )
        
        # Save audio
        audio = audio_values[0, 0].cpu().numpy()
        
        # Normalize
        audio = audio / (np.max(np.abs(audio)) + 0.001) * 0.85
        
        # Convert to int16
        audio_int = (audio * 32767).astype(np.int16)
        
        wavfile.write(output_path, SAMPLE_RATE, audio_int)
        return True
        
    except Exception as e:
        print(f"MusicGen error: {e}")
        return False


def generate_fallback_synth(prompt: str, duration: float, output_path: str) -> bool:
    """
    High-quality procedural synthesis fallback
    Optimized for Stranger Things style based on prompt keywords
    """
    from scipy import signal
    
    sample_rate = 44100
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    prompt_lower = prompt.lower()
    
    # Analyze prompt for style
    is_bass = any(w in prompt_lower for w in ['bass', 'pulsing', 'driving', 'drum'])
    is_dark = any(w in prompt_lower for w in ['dark', 'horror', 'evil', 'monster', 'terrifying'])
    is_ethereal = any(w in prompt_lower for w in ['ethereal', 'choir', 'pad', 'ambient', 'atmosphere'])
    is_arpeggio = any(w in prompt_lower for w in ['arpeggio', 'sequence'])
    is_tension = any(w in prompt_lower for w in ['tension', 'building', 'rising', 'crescendo'])
    is_glitch = any(w in prompt_lower for w in ['glitch', 'digital', 'click', 'beep'])
    is_whoosh = any(w in prompt_lower for w in ['whoosh', 'sweep', 'transition'])
    
    def analog_osc(t, freq, wave='saw', detune=0.003):
        """Analog-style oscillator with warmth"""
        phase1 = 2 * np.pi * freq * t
        phase2 = 2 * np.pi * freq * (1 + detune) * t
        
        if wave == 'saw':
            osc = (2 * (t * freq % 1) - 1 + 2 * (t * freq * (1 + detune) % 1) - 1) * 0.5
        elif wave == 'square':
            osc = (np.sign(np.sin(phase1)) + np.sign(np.sin(phase2))) * 0.5
        elif wave == 'sine':
            osc = (np.sin(phase1) + np.sin(phase2)) * 0.5
        elif wave == 'triangle':
            osc = (2 * np.abs(2 * (t * freq % 1) - 1) - 1) * 0.5
        else:
            osc = np.sin(phase1)
        return osc
    
    def apply_reverb(audio, decay=0.4, delay_ms=50):
        delay_samples = int(delay_ms * sample_rate / 1000)
        reverbed = np.copy(audio)
        for i in range(1, 8):
            offset = delay_samples * i
            if offset < len(audio):
                reverbed[offset:] += audio[:-offset] * (decay ** i)
        return reverbed
    
    # Generate based on detected style
    if is_bass or is_dark:
        # Deep bass with pulse
        root = 41.2 if is_bass else 32.7
        
        # Pulsing envelope
        if is_bass:
            bpm = 100
            pulse_freq = bpm / 60
            pulse = np.sin(2 * np.pi * pulse_freq * t)
            env = np.clip(pulse, 0, 1) ** 0.5
            env = np.convolve(env, np.exp(-np.linspace(0, 5, 500)), mode='same')
            env = env / (np.max(env) + 0.001)
        else:
            env = np.ones(samples)
        
        # Oscillators
        audio += analog_osc(t, root, 'saw') * 0.3 * env
        audio += analog_osc(t, root * 0.5, 'sine') * 0.4 * env
        audio += analog_osc(t, root * 2, 'square') * 0.15 * env
        
        if is_dark:
            # Add dissonant harmonics
            audio += analog_osc(t, root * 1.06, 'sine') * 0.1  # Minor 2nd
            
            # Low rumble
            rumble = np.random.randn(samples)
            b, a = signal.butter(2, 0.003, btype='low')
            rumble = signal.filtfilt(b, a, np.cumsum(rumble))
            audio += rumble / (np.max(np.abs(rumble)) + 0.001) * 0.2
        
        # Lowpass filter
        b, a = signal.butter(4, 0.1, btype='low')
        audio = signal.filtfilt(b, a, audio)
        
        # Saturation
        audio = np.tanh(audio * 1.5) * 0.7
        
    elif is_arpeggio:
        # Haunting arpeggio in D minor
        notes = [146.8, 174.6, 220, 293.7, 220, 174.6]  # Dm arpeggio
        bpm = 120
        note_dur = 60 / bpm / 2
        note_samples = int(note_dur * sample_rate)
        
        note_idx = 0
        for start in range(0, samples - note_samples, note_samples):
            freq = notes[note_idx % len(notes)]
            note_t = np.linspace(0, note_dur, note_samples)
            
            env = np.exp(-note_t * 6) * (1 - np.exp(-note_t * 80))
            note = analog_osc(note_t, freq, 'saw', 0.005) * 0.3
            note += np.sin(2 * np.pi * freq * 2 * note_t) * 0.15
            
            audio[start:start+note_samples] += note * env
            note_idx += 1
        
        audio = apply_reverb(audio, 0.5, 80)
        b, a = signal.butter(3, 0.2, btype='low')
        audio = signal.filtfilt(b, a, audio)
        
    elif is_ethereal:
        # Synth choir pad
        chord = [220, 261.6, 329.6]  # Am
        
        for freq in chord:
            for detune in [-0.02, -0.01, 0, 0.01, 0.02]:
                audio += analog_osc(t, freq * (1 + detune), 'saw', 0.003) * 0.05
        
        # Slow tremolo
        tremolo = np.sin(2 * np.pi * 0.25 * t) * 0.15 + 0.85
        audio *= tremolo
        
        # Lowpass sweep
        for i in range(0, samples - sample_rate // 10, sample_rate // 10):
            cutoff = 0.05 + 0.08 * np.sin(2 * np.pi * 0.03 * t[i])
            chunk = audio[i:i+sample_rate//10]
            b, a = signal.butter(4, cutoff, btype='low')
            audio[i:i+sample_rate//10] = signal.lfilter(b, a, chunk)
        
        audio = apply_reverb(audio, 0.6, 100)
        
    elif is_tension:
        # Rising tension
        vol_env = (t / duration) ** 1.5
        
        base_freq = 55
        for i in range(6):
            pitch_rise = 1 + (t / duration) * 0.15 * (1 + i * 0.1)
            audio += analog_osc(t, base_freq * (i + 1) * pitch_rise, 'saw', 0.01) * 0.1 / (i + 1)
        
        audio *= vol_env
        
        # Add filtered noise that increases
        noise = np.random.randn(samples)
        b, a = signal.butter(2, 0.1, btype='low')
        noise = signal.filtfilt(b, a, noise)
        audio += noise * vol_env * 0.15
        
        audio = apply_reverb(audio, 0.4, 60)
        
    elif is_glitch:
        # Digital glitch SFX
        for i in range(5):
            start = int(np.random.uniform(0, 0.5) * samples)
            length = int(np.random.uniform(0.02, 0.08) * samples)
            freq = np.random.uniform(200, 2000)
            if start + length < samples:
                glitch_t = np.linspace(0, length/sample_rate, length)
                audio[start:start+length] = np.sin(2 * np.pi * freq * glitch_t) * 0.5
        
        audio = np.round(audio * 8) / 8  # Bit crush
        audio *= np.exp(-t * 3)
        
    elif is_whoosh:
        # Synth whoosh
        freq = 100 + 2000 * np.exp(-t * 4)
        phase = np.cumsum(2 * np.pi * freq / sample_rate)
        audio = np.sin(phase) * 0.4
        audio += np.random.randn(samples) * np.exp(-t * 6) * 0.2
        
        b, a = signal.butter(2, 0.3, btype='low')
        audio = signal.filtfilt(b, a, audio)
        audio *= np.exp(-t * 3) * (1 - np.exp(-t * 30))
        audio = apply_reverb(audio, 0.3, 30)
        
    else:
        # Generic dark synth pad
        root = 32.7
        audio += analog_osc(t, root, 'sine') * 0.4
        audio += analog_osc(t, root * 2, 'saw', 0.003) * 0.2
        audio += analog_osc(t, root * 1.5, 'sine') * 0.15
        
        b, a = signal.butter(4, 0.05, btype='low')
        audio = signal.filtfilt(b, a, audio)
        audio = apply_reverb(audio, 0.5, 80)
    
    # Normalize and stereo
    audio = audio / (np.max(np.abs(audio)) + 0.001) * 0.85
    
    # Create stereo with slight delay
    left = audio
    right = np.roll(audio, int(0.015 * sample_rate)) * 0.95
    stereo = np.column_stack([left, right])
    stereo = (stereo * 32767).astype(np.int16)
    
    wavfile.write(output_path, sample_rate, stereo)
    return True


def main():
    print("="*70)
    print("🔮 STRANGER THINGS AI AUDIO GENERATOR")
    print("="*70)
    
    if HAS_MUSICGEN:
        print("\n✓ MusicGen model available - generating AI audio")
        print("  This may take a few minutes per track...")
    else:
        print("\n⚠ MusicGen not available - using advanced synthesis")
        print("  For AI generation, install: pip install transformers torch")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    
    # Generate ambience tracks
    print("\n" + "="*70)
    print("GENERATING STRANGER THINGS AMBIENCE")
    print("="*70)
    
    for name, config in STRANGER_THINGS_PROMPTS.items():
        output_path = os.path.join(OUTPUT_DIR, f"{name}.wav")
        print(f"\n[GEN] {name}")
        print(f"      Prompt: {config['prompt'][:60]}...")
        
        success = False
        if HAS_MUSICGEN:
            success = generate_with_musicgen(
                config['prompt'], 
                config['duration'], 
                output_path
            )
        
        if not success:
            success = generate_fallback_synth(
                config['prompt'],
                config['duration'],
                output_path
            )
        
        if success:
            size = os.path.getsize(output_path) // 1024
            print(f"      ✓ Generated ({size}KB)")
        else:
            print(f"      ✗ Failed")
    
    # Generate SFX
    print("\n" + "="*70)
    print("GENERATING SFX")
    print("="*70)
    
    for name, config in SFX_PROMPTS.items():
        output_path = os.path.join(SFX_DIR, f"{name}.wav")
        print(f"\n[GEN] {name}")
        
        success = generate_fallback_synth(
            config['prompt'],
            config['duration'],
            output_path
        )
        
        if success:
            size = os.path.getsize(output_path) // 1024
            print(f"      ✓ Generated ({size}KB)")
    
    print("\n" + "="*70)
    print("🔮 GENERATION COMPLETE!")
    print("="*70)
    
    # Summary
    print("\nGenerated files:")
    for d, label in [(OUTPUT_DIR, "Ambience"), (SFX_DIR, "SFX")]:
        print(f"\n{label}:")
        total = 0
        for f in sorted(os.listdir(d)):
            if f.endswith('.wav'):
                size = os.path.getsize(os.path.join(d, f)) // 1024
                total += size
                print(f"  🎵 {f} ({size}KB)")
        print(f"  Total: {total/1024:.1f}MB")


if __name__ == "__main__":
    main()
