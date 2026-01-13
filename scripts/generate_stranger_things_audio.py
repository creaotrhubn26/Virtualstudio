#!/usr/bin/env python3
"""
STRANGER THINGS STYLE AUDIO GENERATOR
=====================================
Dark, synth-heavy 80s horror/sci-fi soundscapes
Inspired by Kyle Dixon & Michael Stein's iconic score

Features:
- Analog synth emulation (Juno, Prophet, ARP)
- Dark pulsing basslines
- Eerie atmospheric drones
- Retro arpeggios
- Supernatural/Upside Down textures
- Tension-building crescendos
"""

import numpy as np
from scipy.io import wavfile
from scipy import signal
import os

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"
SFX_DIR = "/workspaces/Virtualstudio/public/audio/sfx"

SAMPLE_RATE = 44100

def apply_reverb(audio, decay=0.4, delay_ms=50):
    """Simple reverb effect"""
    delay_samples = int(delay_ms * SAMPLE_RATE / 1000)
    reverb = np.zeros(len(audio) + delay_samples * 8)
    reverb[:len(audio)] = audio
    
    for i in range(1, 9):
        offset = delay_samples * i
        reverb[offset:offset+len(audio)] += audio * (decay ** i)
    
    return reverb[:len(audio)]

def lowpass_filter(audio, cutoff=0.3):
    """Apply lowpass filter"""
    b, a = signal.butter(4, cutoff, btype='low')
    return signal.filtfilt(b, a, audio)

def highpass_filter(audio, cutoff=0.01):
    """Apply highpass filter"""
    b, a = signal.butter(2, cutoff, btype='high')
    return signal.filtfilt(b, a, audio)

def analog_osc(t, freq, wave='saw', detune=0.002):
    """Analog-style oscillator with slight detune for warmth"""
    phase = 2 * np.pi * freq * t
    phase2 = 2 * np.pi * freq * (1 + detune) * t
    
    if wave == 'saw':
        osc1 = 2 * (t * freq % 1) - 1
        osc2 = 2 * (t * freq * (1 + detune) % 1) - 1
    elif wave == 'square':
        osc1 = np.sign(np.sin(phase))
        osc2 = np.sign(np.sin(phase2))
    elif wave == 'sine':
        osc1 = np.sin(phase)
        osc2 = np.sin(phase2)
    elif wave == 'triangle':
        osc1 = 2 * np.abs(2 * (t * freq % 1) - 1) - 1
        osc2 = 2 * np.abs(2 * (t * freq * (1 + detune) % 1) - 1) - 1
    else:
        osc1 = np.sin(phase)
        osc2 = np.sin(phase2)
    
    return (osc1 + osc2) * 0.5

def generate_dark_synth_pad(duration=30.0):
    """
    Dark evolving synth pad - the signature Stranger Things drone
    Low, ominous, with slow filter sweeps
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Root note: C1 (32.7 Hz) - very low and ominous
    root = 32.7
    
    # Multiple detuned oscillators for thickness
    audio = np.zeros(samples, dtype=np.float32)
    
    # Layer 1: Sub bass drone
    audio += analog_osc(t, root, 'sine') * 0.4
    
    # Layer 2: Detuned saw waves (classic Juno sound)
    for detune in [-0.03, -0.01, 0, 0.01, 0.03]:
        audio += analog_osc(t, root * 2 * (1 + detune), 'saw', 0.003) * 0.08
    
    # Layer 3: Fifth harmony for depth
    audio += analog_osc(t, root * 1.5, 'sine') * 0.15
    audio += analog_osc(t, root * 3, 'triangle') * 0.1
    
    # Slow LFO modulation on filter
    lfo = np.sin(2 * np.pi * 0.05 * t) * 0.5 + 0.5  # 0.05 Hz = 20 second cycle
    
    # Apply evolving lowpass filter
    filtered = np.zeros(samples)
    chunk_size = SAMPLE_RATE // 10
    for i in range(0, samples - chunk_size, chunk_size):
        cutoff = 0.02 + lfo[i] * 0.08
        chunk = audio[i:i+chunk_size]
        b, a = signal.butter(4, cutoff, btype='low')
        filtered[i:i+chunk_size] = signal.lfilter(b, a, chunk)
    
    # Add reverb
    filtered = apply_reverb(filtered, decay=0.5, delay_ms=80)
    
    # Stereo with slight delay
    left = filtered
    right = np.roll(filtered, int(0.015 * SAMPLE_RATE))
    
    return np.column_stack([left, right])

def generate_pulsing_bass(duration=30.0):
    """
    Iconic Stranger Things pulsing synth bass
    Rhythmic, dark, driving
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # BPM around 100 for that ominous pulse
    bpm = 100
    beat_freq = bpm / 60
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Base frequency: E1 (41.2 Hz)
    root = 41.2
    
    # Pulsing envelope
    pulse = (np.sin(2 * np.pi * beat_freq * t) > 0).astype(float)
    # Smooth the pulse with attack/decay
    pulse_smooth = np.zeros(samples)
    attack = int(0.01 * SAMPLE_RATE)
    decay = int(0.15 * SAMPLE_RATE)
    
    for i in range(samples):
        if pulse[i] > 0.5:
            # Attack
            progress = min(1.0, sum(pulse[max(0,i-attack):i+1]) / attack)
            pulse_smooth[i] = progress
        else:
            # Decay
            pulse_smooth[i] = pulse_smooth[max(0, i-1)] * 0.995
    
    # Oscillators
    bass = analog_osc(t, root, 'saw') * 0.5
    bass += analog_osc(t, root, 'square') * 0.3
    bass += analog_osc(t, root * 0.5, 'sine') * 0.4  # Sub
    
    # Apply pulse envelope
    audio = bass * pulse_smooth
    
    # Filter with envelope following
    audio = lowpass_filter(audio, 0.08)
    
    # Add some grit
    audio = np.tanh(audio * 1.5) * 0.7
    
    # Reverb
    audio = apply_reverb(audio, decay=0.3, delay_ms=60)
    
    left = audio
    right = audio * 0.95
    
    return np.column_stack([left, right])

def generate_eerie_arpeggio(duration=30.0):
    """
    Haunting synth arpeggio - minor key, spooky
    Classic 80s sequencer sound
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # D minor arpeggio: D, F, A, D (octave up)
    # Frequencies: 146.8, 174.6, 220, 293.7
    notes = [146.8, 174.6, 220, 293.7, 220, 174.6]  # Up and down
    
    bpm = 120
    note_duration = 60 / bpm / 2  # Eighth notes
    note_samples = int(note_duration * SAMPLE_RATE)
    
    note_idx = 0
    for start in range(0, samples - note_samples, note_samples):
        freq = notes[note_idx % len(notes)]
        note_t = np.linspace(0, note_duration, note_samples)
        
        # Sharp attack, longer decay envelope
        env = np.exp(-note_t * 8) * (1 - np.exp(-note_t * 100))
        
        # Oscillator with slight pitch drift (analog feel)
        drift = 1 + np.sin(2 * np.pi * 5 * note_t) * 0.003
        note = analog_osc(note_t, freq * drift[0], 'saw', 0.005)
        note += analog_osc(note_t, freq * 2, 'sine') * 0.3
        
        audio[start:start+note_samples] += note * env * 0.4
        note_idx += 1
    
    # Heavy reverb for that 80s sound
    audio = apply_reverb(audio, decay=0.6, delay_ms=100)
    audio = lowpass_filter(audio, 0.25)
    
    left = audio
    right = np.roll(audio, int(0.03 * SAMPLE_RATE)) * 0.9
    
    return np.column_stack([left, right])

def generate_upside_down(duration=30.0):
    """
    The Upside Down atmosphere
    Distorted, reversed, otherworldly
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Deep rumbling base
    rumble = np.random.randn(samples)
    b, a = signal.butter(2, 0.005, btype='low')
    rumble = signal.filtfilt(b, a, np.cumsum(rumble)) * 0.3
    rumble = rumble / (np.max(np.abs(rumble)) + 0.001)
    audio += rumble * 0.4
    
    # Alien frequencies - slightly dissonant
    for freq in [27.5, 29.1, 55, 58.3]:  # A0 and slightly sharp versions
        audio += analog_osc(t, freq, 'sine') * 0.1
        audio += analog_osc(t, freq * 1.01, 'triangle') * 0.05
    
    # Creepy high harmonics that fade in and out
    mod = np.sin(2 * np.pi * 0.03 * t) * 0.5 + 0.5
    audio += np.sin(2 * np.pi * 880 * t) * mod * 0.03
    audio += np.sin(2 * np.pi * 1320 * t) * (1 - mod) * 0.02
    
    # Random glitchy particles
    for _ in range(50):
        pos = np.random.randint(0, samples - 5000)
        length = np.random.randint(500, 3000)
        freq = np.random.uniform(200, 2000)
        glitch_t = np.linspace(0, length/SAMPLE_RATE, length)
        glitch = np.sin(2 * np.pi * freq * glitch_t) * np.exp(-glitch_t * 10)
        audio[pos:pos+length] += glitch * np.random.uniform(0.02, 0.08)
    
    # Distortion
    audio = np.tanh(audio * 2) * 0.6
    
    # Heavy reverb
    audio = apply_reverb(audio, decay=0.7, delay_ms=120)
    
    left = audio
    right = np.roll(audio, int(0.04 * SAMPLE_RATE)) * 0.85
    
    return np.column_stack([left, right])

def generate_tension_build(duration=30.0):
    """
    Rising tension/dread
    Slow crescendo with increasing dissonance
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Volume envelope - gradual rise
    vol_env = (t / duration) ** 1.5
    
    # Base drone
    audio += analog_osc(t, 55, 'sine') * 0.3  # A1
    
    # Rising pitch cluster
    for i, base_freq in enumerate([110, 116.5, 123.5, 130.8]):  # Chromatic cluster
        # Each voice rises at slightly different rate
        pitch_rise = 1 + (t / duration) * 0.2 * (1 + i * 0.1)
        audio += analog_osc(t, base_freq * pitch_rise, 'saw', 0.01) * 0.08
    
    # Filter opens as tension builds
    filtered = np.zeros(samples)
    chunk_size = SAMPLE_RATE // 5
    for i in range(0, samples - chunk_size, chunk_size):
        progress = i / samples
        cutoff = 0.02 + progress * 0.15
        chunk = audio[i:i+chunk_size]
        b, a = signal.butter(3, cutoff, btype='low')
        filtered[i:i+chunk_size] = signal.lfilter(b, a, chunk)
    
    # Apply volume envelope
    audio = filtered * vol_env
    
    # Add noise that increases
    noise = np.random.randn(samples)
    b, a = signal.butter(2, 0.1, btype='low')
    noise = signal.filtfilt(b, a, noise) * vol_env * 0.15
    audio += noise
    
    # Reverb
    audio = apply_reverb(audio, decay=0.5, delay_ms=80)
    
    left = audio
    right = np.roll(audio, int(0.02 * SAMPLE_RATE))
    
    return np.column_stack([left, right])

def generate_synth_choir(duration=30.0):
    """
    Ethereal synth choir/pad
    Haunting vocal-like synthesizer
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Chord: Am (A, C, E)
    chord_freqs = [220, 261.6, 329.6]  # A3, C4, E4
    
    for freq in chord_freqs:
        # Multiple detuned oscillators per voice
        for detune in [-0.02, -0.01, 0, 0.01, 0.02]:
            voice = analog_osc(t, freq * (1 + detune), 'saw', 0.003) * 0.06
            audio += voice
    
    # Formant filter to make it voice-like
    # Simulate vowel "ah" with resonant peaks
    formants = [730, 1090, 2440]  # "ah" vowel formants
    filtered = np.zeros(samples)
    for formant in formants:
        # Bandpass around each formant
        low = (formant - 100) / (SAMPLE_RATE / 2)
        high = (formant + 100) / (SAMPLE_RATE / 2)
        low = max(0.01, min(0.99, low))
        high = max(0.01, min(0.99, high))
        if low < high:
            b, a = signal.butter(2, [low, high], btype='band')
            filtered += signal.filtfilt(b, a, audio) * 0.4
    
    audio = audio * 0.3 + filtered * 0.7
    
    # Slow amplitude modulation (tremolo)
    tremolo = np.sin(2 * np.pi * 0.3 * t) * 0.15 + 0.85
    audio *= tremolo
    
    # Heavy reverb
    audio = apply_reverb(audio, decay=0.7, delay_ms=100)
    
    left = audio
    right = np.roll(audio, int(0.025 * SAMPLE_RATE)) * 0.95
    
    return np.column_stack([left, right])

def generate_retro_drums(duration=30.0):
    """
    80s electronic drums - LinnDrum style
    Sparse, reverb-heavy
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    bpm = 110
    beat_samples = int(60 / bpm * SAMPLE_RATE)
    
    beat = 0
    for pos in range(0, samples - beat_samples, beat_samples // 4):
        beat_in_bar = beat % 16
        
        # Kick on 1, 5, 9, 13
        if beat_in_bar in [0, 4, 8, 12]:
            kick_len = int(0.15 * SAMPLE_RATE)
            kick_t = np.linspace(0, 0.15, kick_len)
            # Pitch drop
            kick_freq = 150 * np.exp(-kick_t * 20) + 40
            kick = np.sin(np.cumsum(2 * np.pi * kick_freq / SAMPLE_RATE))
            kick *= np.exp(-kick_t * 15)
            if pos + kick_len < samples:
                audio[pos:pos+kick_len] += kick * 0.5
        
        # Snare on 5, 13
        if beat_in_bar in [4, 12]:
            snare_len = int(0.2 * SAMPLE_RATE)
            snare_t = np.linspace(0, 0.2, snare_len)
            # Tonal component
            snare = np.sin(2 * np.pi * 200 * snare_t) * np.exp(-snare_t * 20)
            # Noise component
            snare += np.random.randn(snare_len) * np.exp(-snare_t * 15) * 0.3
            if pos + snare_len < samples:
                audio[pos:pos+snare_len] += snare * 0.35
        
        # Hi-hat on every beat
        hh_len = int(0.05 * SAMPLE_RATE)
        hh_t = np.linspace(0, 0.05, hh_len)
        hh = np.random.randn(hh_len) * np.exp(-hh_t * 80)
        b, a = signal.butter(2, 0.5, btype='high')
        hh = signal.lfilter(b, a, hh) * 0.15
        if pos + hh_len < samples:
            audio[pos:pos+hh_len] += hh
        
        beat += 1
    
    # Gated reverb (signature 80s sound)
    reverbed = apply_reverb(audio, decay=0.6, delay_ms=50)
    # Gate the reverb tail
    gate_threshold = 0.02
    gate = (np.abs(reverbed) > gate_threshold).astype(float)
    b, a = signal.butter(1, 0.01, btype='low')
    gate = signal.filtfilt(b, a, gate)
    audio = reverbed * gate
    
    left = audio
    right = audio * 0.95
    
    return np.column_stack([left, right])

def generate_portal_sound(duration=30.0):
    """
    Interdimensional portal/rift
    Swirling, phasing, otherworldly
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Swirling base tones
    for i in range(5):
        freq = 80 + i * 30
        # Phase modulation for movement
        phase_mod = np.sin(2 * np.pi * (0.1 + i * 0.05) * t) * 2
        tone = np.sin(2 * np.pi * freq * t + phase_mod)
        audio += tone * 0.1
    
    # Whooshing noise
    noise = np.random.randn(samples)
    # Modulated filter
    mod = np.sin(2 * np.pi * 0.2 * t)
    for i in range(0, samples - 4410, 4410):
        cutoff = 0.05 + 0.1 * (mod[i] * 0.5 + 0.5)
        chunk = noise[i:i+4410]
        b, a = signal.butter(2, cutoff, btype='low')
        audio[i:i+4410] += signal.lfilter(b, a, chunk) * 0.2
    
    # Doppler-like frequency shifts
    doppler_freq = 300 + 200 * np.sin(2 * np.pi * 0.15 * t)
    phase = np.cumsum(2 * np.pi * doppler_freq / SAMPLE_RATE)
    audio += np.sin(phase) * 0.1
    
    # Ring modulation for alien quality
    carrier = np.sin(2 * np.pi * 440 * t)
    audio = audio * (1 + carrier * 0.2)
    
    # Heavy reverb
    audio = apply_reverb(audio, decay=0.7, delay_ms=100)
    
    left = audio
    right = np.roll(audio, int(0.05 * SAMPLE_RATE))
    
    return np.column_stack([left, right])

def generate_mind_flayer(duration=30.0):
    """
    Mind Flayer presence - massive, terrifying
    Deep drones with alien overtones
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Massive sub bass
    audio += analog_osc(t, 20, 'sine') * 0.5  # Below hearing but felt
    audio += analog_osc(t, 30, 'sine') * 0.4
    audio += analog_osc(t, 40, 'triangle') * 0.3
    
    # Dissonant cluster
    for freq in [55, 58.27, 61.74, 65.41]:  # A1, Bb1, B1, C2
        mod = np.sin(2 * np.pi * np.random.uniform(0.02, 0.08) * t)
        audio += analog_osc(t, freq, 'saw') * (0.1 + mod * 0.05)
    
    # Growling texture
    growl = np.random.randn(samples)
    b, a = signal.butter(2, 0.02, btype='low')
    growl = signal.filtfilt(b, a, growl)
    # Modulate with very low frequency
    growl_mod = np.sin(2 * np.pi * 0.5 * t) * 0.5 + 0.5
    audio += growl * growl_mod * 0.3
    
    # Alien harmonics that appear and disappear
    for i in range(8):
        freq = np.random.uniform(500, 2000)
        mod_freq = np.random.uniform(0.02, 0.1)
        mod = (np.sin(2 * np.pi * mod_freq * t + np.random.uniform(0, 2*np.pi)) > 0.7).astype(float)
        b, a = signal.butter(1, 0.002, btype='low')
        mod = signal.filtfilt(b, a, mod)
        audio += np.sin(2 * np.pi * freq * t) * mod * 0.02
    
    # Distortion for menace
    audio = np.tanh(audio * 1.5)
    
    # Reverb
    audio = apply_reverb(audio, decay=0.6, delay_ms=90)
    
    left = audio * 0.8
    right = np.roll(audio, int(0.03 * SAMPLE_RATE)) * 0.75
    
    return np.column_stack([left, right])

def generate_eleven_power(duration=30.0):
    """
    Psychic power sound
    Building energy, resonant frequencies
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Building sine wave cluster
    base_freq = 110
    num_harmonics = 12
    
    for i in range(num_harmonics):
        freq = base_freq * (i + 1)
        # Each harmonic builds at different rate
        build = np.clip(t / duration * (1 + i * 0.1), 0, 1) ** 2
        audio += np.sin(2 * np.pi * freq * t) * build * (0.3 / (i + 1))
    
    # Resonant peak that intensifies
    resonance = np.sin(2 * np.pi * 440 * t)
    res_env = (t / duration) ** 3
    audio += resonance * res_env * 0.3
    
    # High frequency shimmer
    shimmer = np.sin(2 * np.pi * 2000 * t + np.sin(2 * np.pi * 5 * t) * 3)
    shimmer_env = (t / duration) ** 2
    audio += shimmer * shimmer_env * 0.1
    
    # Noise component that increases
    noise = np.random.randn(samples)
    b, a = signal.butter(2, [0.1, 0.4], btype='band')
    noise = signal.filtfilt(b, a, noise)
    audio += noise * (t / duration) * 0.2
    
    # Soft clip for saturation
    audio = np.tanh(audio)
    
    # Reverb
    audio = apply_reverb(audio, decay=0.5, delay_ms=70)
    
    left = audio
    right = np.roll(audio, int(0.01 * SAMPLE_RATE)) * 0.95
    
    return np.column_stack([left, right])

def generate_lab_ambience(duration=30.0):
    """
    Hawkins Lab ambience
    Sterile, electronic, unsettling
    """
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples, dtype=np.float32)
    
    # Fluorescent light hum (60Hz + harmonics)
    audio += np.sin(2 * np.pi * 60 * t) * 0.05
    audio += np.sin(2 * np.pi * 120 * t) * 0.03
    audio += np.sin(2 * np.pi * 180 * t) * 0.01
    
    # HVAC drone
    hvac_noise = np.random.randn(samples)
    b, a = signal.butter(3, [0.01, 0.05], btype='band')
    hvac = signal.filtfilt(b, a, hvac_noise) * 0.15
    audio += hvac
    
    # Random electronic beeps
    for _ in range(20):
        pos = np.random.randint(0, samples - 10000)
        beep_freq = np.random.choice([440, 880, 1000, 1200])
        beep_len = int(np.random.uniform(0.05, 0.2) * SAMPLE_RATE)
        beep_t = np.linspace(0, beep_len/SAMPLE_RATE, beep_len)
        beep = np.sin(2 * np.pi * beep_freq * beep_t) * np.exp(-beep_t * 10)
        if pos + beep_len < samples:
            audio[pos:pos+beep_len] += beep * 0.08
    
    # Occasional door/machinery sounds
    for _ in range(5):
        pos = np.random.randint(0, samples - 20000)
        length = np.random.randint(5000, 15000)
        door_t = np.linspace(0, length/SAMPLE_RATE, length)
        door = np.random.randn(length) * np.exp(-door_t * 3)
        b, a = signal.butter(2, 0.05, btype='low')
        door = signal.lfilter(b, a, door) * 0.15
        if pos + length < samples:
            audio[pos:pos+length] += door
    
    # Unsettling undertone
    audio += np.sin(2 * np.pi * 40 * t) * 0.08
    
    # Light reverb
    audio = apply_reverb(audio, decay=0.3, delay_ms=40)
    
    left = audio
    right = audio * 0.9 + np.random.randn(samples) * 0.01
    
    return np.column_stack([left, right])

# SFX Generators
def generate_sfx_glitch(duration=1.0):
    """Digital glitch sound"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    audio = np.zeros(samples)
    
    # Random frequency jumps
    for i in range(10):
        start = int(np.random.uniform(0, 0.8) * samples)
        length = int(np.random.uniform(0.01, 0.1) * samples)
        freq = np.random.uniform(100, 3000)
        if start + length < samples:
            glitch_t = np.linspace(0, length/SAMPLE_RATE, length)
            audio[start:start+length] = np.sin(2 * np.pi * freq * glitch_t) * 0.5
    
    # Bit crush effect simulation
    audio = np.round(audio * 8) / 8
    
    env = np.exp(-t * 5)
    audio *= env
    
    return np.column_stack([audio, audio])

def generate_sfx_whoosh(duration=1.0):
    """Synth whoosh"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Frequency sweep
    freq = 100 + 2000 * np.exp(-t * 3)
    phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)
    
    audio = np.sin(phase) * 0.3
    audio += np.random.randn(samples) * np.exp(-t * 5) * 0.2
    
    # Filter sweep
    filtered = np.zeros(samples)
    for i in range(0, samples - 441, 441):
        cutoff = 0.5 * np.exp(-i/samples * 3) + 0.05
        chunk = audio[i:i+441]
        b, a = signal.butter(2, cutoff, btype='low')
        filtered[i:i+441] = signal.lfilter(b, a, chunk)
    
    audio = filtered * 0.8
    audio = apply_reverb(audio, decay=0.4, delay_ms=30)
    
    left = audio
    right = np.roll(audio, int(0.01 * SAMPLE_RATE))
    
    return np.column_stack([left, right])

def generate_sfx_power_up(duration=1.5):
    """Psychic power activation"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Rising pitch
    freq = 100 + 500 * (t / duration) ** 2
    phase = np.cumsum(2 * np.pi * freq / SAMPLE_RATE)
    audio = np.sin(phase) * 0.4
    
    # Add harmonics
    audio += np.sin(phase * 2) * 0.2
    audio += np.sin(phase * 3) * 0.1
    
    # Shimmer
    shimmer = np.sin(2 * np.pi * 2000 * t) * (t / duration) * 0.15
    audio += shimmer
    
    # Envelope
    env = (1 - np.exp(-t * 10)) * np.exp(-(t - duration) ** 2 * 5)
    audio *= env
    
    audio = apply_reverb(audio, decay=0.5, delay_ms=50)
    
    return np.column_stack([audio, audio * 0.95])

def generate_sfx_reveal(duration=2.0):
    """Dramatic reveal sting"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Deep impact
    impact = np.sin(2 * np.pi * 40 * t) * np.exp(-t * 3) * 0.6
    
    # Chord hit: Dm (D, F, A)
    chord = np.zeros(samples)
    for freq in [73.4, 87.3, 110]:  # D2, F2, A2
        chord += analog_osc(t, freq, 'saw') * 0.15
        chord += analog_osc(t, freq * 2, 'saw') * 0.08
    
    env = np.exp(-t * 1.5)
    chord *= env
    
    audio = impact + chord
    audio = lowpass_filter(audio, 0.15)
    audio = apply_reverb(audio, decay=0.6, delay_ms=80)
    
    return np.column_stack([audio, audio])

def generate_sfx_tension(duration=1.0):
    """Short tension sting"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Dissonant cluster
    audio = np.zeros(samples)
    for freq in [220, 233, 247]:  # Close semitones
        audio += np.sin(2 * np.pi * freq * t) * 0.2
    
    env = np.exp(-t * 3) * (1 - np.exp(-t * 50))
    audio *= env
    
    # Add noise
    audio += np.random.randn(samples) * np.exp(-t * 10) * 0.1
    
    audio = apply_reverb(audio, decay=0.4, delay_ms=50)
    
    return np.column_stack([audio, audio * 0.9])

def generate_sfx_notification(duration=0.8):
    """Synth notification"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Two-tone synth bell
    freq1, freq2 = 523, 659  # C5, E5
    
    tone1 = np.sin(2 * np.pi * freq1 * t) * np.exp(-t * 6)
    tone2 = np.sin(2 * np.pi * freq2 * t) * np.exp(-(t-0.15) * 6) * (t > 0.15)
    
    audio = (tone1 + tone2) * 0.4
    
    # Add warmth
    audio += np.sin(2 * np.pi * freq1 * 0.5 * t) * np.exp(-t * 4) * 0.1
    
    audio = apply_reverb(audio, decay=0.4, delay_ms=40)
    
    return np.column_stack([audio, audio])

def generate_sfx_error(duration=0.6):
    """Dark error sound"""
    samples = int(duration * SAMPLE_RATE)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    # Descending minor second
    freq = 300 * np.exp(-t * 2)
    audio = analog_osc(t, freq, 'square') * 0.3
    
    # Distortion
    audio = np.tanh(audio * 2) * 0.5
    
    env = np.exp(-t * 4)
    audio *= env
    
    audio = apply_reverb(audio, decay=0.3, delay_ms=30)
    
    return np.column_stack([audio, audio * 0.9])

def normalize_and_save(audio, filepath):
    """Normalize audio and save as WAV"""
    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.85
    
    # Convert to 16-bit
    audio_int = (audio * 32767).astype(np.int16)
    
    wavfile.write(filepath, SAMPLE_RATE, audio_int)

def main():
    print("="*60)
    print("🔮 STRANGER THINGS AUDIO GENERATOR")
    print("="*60)
    print("\nGenerating dark, synth-heavy 80s horror soundscapes...")
    print("Inspired by Kyle Dixon & Michael Stein\n")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    
    # Ambience generators
    ambience_generators = {
        "dark-synth-pad": generate_dark_synth_pad,
        "pulsing-bass": generate_pulsing_bass,
        "eerie-arpeggio": generate_eerie_arpeggio,
        "upside-down": generate_upside_down,
        "tension-build": generate_tension_build,
        "synth-choir": generate_synth_choir,
        "retro-drums": generate_retro_drums,
        "portal-rift": generate_portal_sound,
        "mind-flayer": generate_mind_flayer,
        "eleven-power": generate_eleven_power,
        "lab-ambience": generate_lab_ambience,
    }
    
    # Also create some renamed versions for the original filenames
    filename_mapping = {
        "birds": "eerie-arpeggio",  # Replace with something atmospheric
        "wind-leaves": "dark-synth-pad",
        "crickets": "tension-build",
        "rain": "upside-down",
        "thunder": "mind-flayer",
        "distant-thunder": "portal-rift",
        "waves": "synth-choir",
        "fire-crackle": "pulsing-bass",
        "traffic": "lab-ambience",
        "crowd": "retro-drums",
        "hvac": "dark-synth-pad",
        "engine-hum": "eleven-power",
    }
    
    print("STRANGER THINGS AMBIENCE (30 seconds each):")
    print("-" * 50)
    
    # Generate unique sounds
    generated = {}
    for name, generator in ambience_generators.items():
        output_path = os.path.join(OUTPUT_DIR, f"{name}.wav")
        print(f"[GEN] {name}...", end=" ", flush=True)
        
        try:
            audio = generator(duration=30.0)
            normalize_and_save(audio, output_path)
            generated[name] = audio
            size = os.path.getsize(output_path) // 1024
            print(f"✓ ({size}KB)")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    # Create mapped versions for original filenames
    print("\nCreating compatibility mappings:")
    print("-" * 50)
    for old_name, new_name in filename_mapping.items():
        output_path = os.path.join(OUTPUT_DIR, f"{old_name}.wav")
        if new_name in generated:
            print(f"[MAP] {old_name} → {new_name}...", end=" ", flush=True)
            normalize_and_save(generated[new_name], output_path)
            print("✓")
    
    # SFX
    print("\nSTRANGER THINGS SFX:")
    print("-" * 50)
    
    sfx_generators = {
        "click": (generate_sfx_glitch, 0.3),
        "hover": (generate_sfx_tension, 0.5),
        "success": (generate_sfx_power_up, 1.0),
        "error": (generate_sfx_error, 0.6),
        "notification": (generate_sfx_notification, 0.8),
        "whoosh": (generate_sfx_whoosh, 1.0),
        "pop": (generate_sfx_reveal, 0.5),
    }
    
    for name, (generator, duration) in sfx_generators.items():
        output_path = os.path.join(SFX_DIR, f"{name}.wav")
        print(f"[GEN] {name}...", end=" ", flush=True)
        
        try:
            audio = generator(duration=duration)
            normalize_and_save(audio, output_path)
            size = os.path.getsize(output_path) // 1024
            print(f"✓ ({size}KB)")
        except Exception as e:
            print(f"✗ Error: {e}")
    
    print("\n" + "="*60)
    print("🔮 AUDIO GENERATION COMPLETE!")
    print("="*60)
    
    # List files
    print("\nGenerated Stranger Things style audio:")
    print(f"\n{OUTPUT_DIR}:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith('.wav'):
            size = os.path.getsize(os.path.join(OUTPUT_DIR, f)) // 1024
            print(f"  🎵 {f} ({size}KB)")
    
    print(f"\n{SFX_DIR}:")
    for f in sorted(os.listdir(SFX_DIR)):
        if f.endswith('.wav'):
            size = os.path.getsize(os.path.join(SFX_DIR, f)) // 1024
            print(f"  🔊 {f} ({size}KB)")

if __name__ == "__main__":
    main()
