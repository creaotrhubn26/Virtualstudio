#!/usr/bin/env python3
"""
Generate ambient audio files for Spatial Audio system
Uses synthesized noise and tones to create atmosphere sounds
"""

import numpy as np
import wave
import struct
import os

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def save_wav(filename, data, sample_rate=44100):
    """Save numpy array as WAV file"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    # Normalize to 16-bit range
    data = np.clip(data, -1, 1)
    data = (data * 32767).astype(np.int16)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(data.tobytes())
    
    print(f"Created: {filepath}")
    return filepath

def generate_pink_noise(duration, sample_rate=44100):
    """Generate pink noise (1/f noise) - natural sounding"""
    samples = int(duration * sample_rate)
    
    # Generate white noise
    white = np.random.randn(samples)
    
    # Apply pink noise filter (simple approximation)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    
    # Simple low-pass for pink approximation
    pink = np.zeros(samples)
    pink[0] = white[0]
    for i in range(1, samples):
        pink[i] = 0.99 * pink[i-1] + 0.01 * white[i]
    
    # Add some variation
    pink += 0.3 * white
    
    return pink / np.max(np.abs(pink)) * 0.7

def generate_brown_noise(duration, sample_rate=44100):
    """Generate brown/red noise - deep rumble"""
    samples = int(duration * sample_rate)
    white = np.random.randn(samples)
    brown = np.cumsum(white)
    brown = brown - np.mean(brown)
    return brown / np.max(np.abs(brown)) * 0.6

def generate_wind(duration, sample_rate=44100):
    """Generate wind sounds - filtered noise with modulation"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Base noise
    noise = generate_pink_noise(duration, sample_rate)
    
    # Slow modulation for gusts
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t) * np.sin(2 * np.pi * 0.07 * t)
    
    wind = noise * mod
    return wind / np.max(np.abs(wind)) * 0.5

def generate_rain(duration, sample_rate=44100):
    """Generate rain sounds - filtered white noise"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # White noise base
    rain = np.random.randn(samples)
    
    # High-pass filter effect (rain has more high frequencies)
    for i in range(1, samples):
        rain[i] = 0.95 * (rain[i] + rain[i] - rain[i-1])
    
    # Add occasional "drops" - random impulses
    drops = np.zeros(samples)
    drop_times = np.random.randint(0, samples, size=int(duration * 50))
    drops[drop_times] = np.random.rand(len(drop_times)) * 0.3
    
    rain = rain * 0.3 + drops
    return rain / np.max(np.abs(rain)) * 0.6

def generate_thunder(duration, sample_rate=44100):
    """Generate distant thunder rumble"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Low frequency rumble
    rumble = generate_brown_noise(duration, sample_rate)
    
    # Random thunder strikes
    thunder = np.zeros(samples)
    num_strikes = int(duration / 8)  # One strike every ~8 seconds
    
    for _ in range(num_strikes):
        strike_time = np.random.randint(0, samples - sample_rate)
        strike_dur = int(np.random.uniform(1, 3) * sample_rate)
        
        # Envelope: fast attack, slow decay
        env = np.exp(-np.linspace(0, 5, strike_dur))
        strike = np.random.randn(strike_dur) * env
        
        end_idx = min(strike_time + strike_dur, samples)
        actual_dur = end_idx - strike_time
        thunder[strike_time:end_idx] += strike[:actual_dur] * 0.8
    
    result = rumble * 0.3 + thunder
    return result / np.max(np.abs(result)) * 0.7

def generate_crickets(duration, sample_rate=44100):
    """Generate cricket chirping sounds"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    crickets = np.zeros(samples)
    
    # Multiple cricket "voices" at different frequencies
    freqs = [4000, 4500, 5000, 5500]
    
    for freq in freqs:
        # Chirp pattern: on-off-on-off
        chirp_rate = np.random.uniform(3, 6)  # chirps per second
        envelope = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * chirp_rate * t))
        envelope = np.maximum(envelope, 0)
        
        # Add randomness to timing
        phase_offset = np.random.uniform(0, 2 * np.pi)
        tone = np.sin(2 * np.pi * freq * t + phase_offset)
        
        crickets += tone * envelope * 0.15
    
    # Add some noise texture
    crickets += np.random.randn(samples) * 0.02
    
    return crickets / np.max(np.abs(crickets)) * 0.4

def generate_waves(duration, sample_rate=44100):
    """Generate ocean wave sounds"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Base ocean roar (brown noise)
    ocean = generate_brown_noise(duration, sample_rate)
    
    # Wave cycle modulation (waves coming in every 8-12 seconds)
    wave_freq = 1 / 10  # ~10 second wave cycle
    wave_mod = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * wave_freq * t))
    
    # Add surf/crash (higher frequency bursts)
    surf = generate_pink_noise(duration, sample_rate)
    surf_mod = np.maximum(0, np.sin(2 * np.pi * wave_freq * t + np.pi/4)) ** 4
    
    waves = ocean * wave_mod + surf * surf_mod * 0.5
    return waves / np.max(np.abs(waves)) * 0.6

def generate_fire(duration, sample_rate=44100):
    """Generate fire crackling sounds"""
    samples = int(duration * sample_rate)
    
    # Base rumble (low fire sound)
    base = generate_brown_noise(duration, sample_rate) * 0.3
    
    # Crackles (random impulses)
    crackles = np.zeros(samples)
    num_crackles = int(duration * 30)  # 30 crackles per second
    
    for _ in range(num_crackles):
        pos = np.random.randint(0, samples - 1000)
        length = np.random.randint(100, 1000)
        
        # Quick decay
        env = np.exp(-np.linspace(0, 10, length))
        crackle = np.random.randn(length) * env
        
        end_pos = min(pos + length, samples)
        actual_len = end_pos - pos
        crackles[pos:end_pos] += crackle[:actual_len] * np.random.uniform(0.2, 0.6)
    
    fire = base + crackles
    return fire / np.max(np.abs(fire)) * 0.5

def generate_hvac(duration, sample_rate=44100):
    """Generate HVAC/air conditioning hum"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Low frequency hum (60Hz and harmonics)
    hum = np.sin(2 * np.pi * 60 * t) * 0.3
    hum += np.sin(2 * np.pi * 120 * t) * 0.15
    hum += np.sin(2 * np.pi * 180 * t) * 0.05
    
    # Air flow noise
    airflow = generate_pink_noise(duration, sample_rate) * 0.2
    
    hvac = hum + airflow
    return hvac / np.max(np.abs(hvac)) * 0.3

def generate_engine_hum(duration, sample_rate=44100):
    """Generate spaceship engine hum"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Deep bass drone
    drone = np.sin(2 * np.pi * 40 * t) * 0.4
    drone += np.sin(2 * np.pi * 80 * t) * 0.2
    drone += np.sin(2 * np.pi * 120 * t) * 0.1
    
    # Subtle modulation
    mod = 1 + 0.1 * np.sin(2 * np.pi * 0.5 * t)
    
    # Add filtered noise
    noise = generate_pink_noise(duration, sample_rate) * 0.15
    
    engine = drone * mod + noise
    return engine / np.max(np.abs(engine)) * 0.4

def generate_water_drip(duration, sample_rate=44100):
    """Generate water dripping sounds"""
    samples = int(duration * sample_rate)
    
    drips = np.zeros(samples)
    
    # Random drip times
    num_drips = int(duration * 2)  # ~2 drips per second
    
    for _ in range(num_drips):
        pos = np.random.randint(0, samples - 5000)
        
        # Drip sound: quick sine burst with decay
        drip_len = np.random.randint(2000, 4000)
        t_drip = np.linspace(0, drip_len / sample_rate, drip_len)
        
        freq = np.random.uniform(800, 1500)
        env = np.exp(-t_drip * 20)
        drip = np.sin(2 * np.pi * freq * t_drip) * env
        
        end_pos = min(pos + drip_len, samples)
        actual_len = end_pos - pos
        drips[pos:end_pos] += drip[:actual_len] * np.random.uniform(0.3, 0.7)
    
    return drips / np.max(np.abs(drips) + 0.001) * 0.5

def generate_crowd(duration, sample_rate=44100):
    """Generate crowd/cafe chatter"""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    # Multiple "voices" - filtered noise bands
    chatter = np.zeros(samples)
    
    for _ in range(5):
        # Random modulation for each voice
        mod_freq = np.random.uniform(2, 5)
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * mod_freq * t + np.random.uniform(0, 2*np.pi))
        
        # Bandpass-like noise (voice range)
        voice = generate_pink_noise(duration, sample_rate)
        
        chatter += voice * mod * 0.2
    
    return chatter / np.max(np.abs(chatter)) * 0.4

def generate_keyboard(duration, sample_rate=44100):
    """Generate keyboard typing sounds"""
    samples = int(duration * sample_rate)
    
    typing = np.zeros(samples)
    
    # Random key presses
    num_keys = int(duration * 4)  # ~4 keys per second
    
    for _ in range(num_keys):
        pos = np.random.randint(0, samples - 2000)
        
        # Key click: short noise burst
        key_len = np.random.randint(500, 1500)
        env = np.exp(-np.linspace(0, 15, key_len))
        key = np.random.randn(key_len) * env
        
        end_pos = min(pos + key_len, samples)
        actual_len = end_pos - pos
        typing[pos:end_pos] += key[:actual_len] * np.random.uniform(0.2, 0.5)
    
    return typing / np.max(np.abs(typing) + 0.001) * 0.3

def main():
    ensure_dir(OUTPUT_DIR)
    
    DURATION = 30  # 30 seconds each (will loop)
    
    print("Generating ambient audio files...")
    print("=" * 50)
    
    # Nature sounds
    save_wav("birds.wav", generate_crickets(DURATION))  # Using crickets as bird-like
    save_wav("wind-leaves.wav", generate_wind(DURATION))
    save_wav("crickets.wav", generate_crickets(DURATION))
    save_wav("rain.wav", generate_rain(DURATION))
    save_wav("heavy-rain.wav", generate_rain(DURATION) * 1.5)
    save_wav("thunder.wav", generate_thunder(DURATION))
    save_wav("distant-thunder.wav", generate_thunder(DURATION) * 0.5)
    save_wav("waves.wav", generate_waves(DURATION))
    
    # Urban sounds
    save_wav("traffic.wav", generate_brown_noise(DURATION))  # Deep rumble for traffic
    save_wav("crowd.wav", generate_crowd(DURATION))
    save_wav("cafe-chatter.wav", generate_crowd(DURATION))
    
    # Indoor sounds
    save_wav("hvac.wav", generate_hvac(DURATION))
    save_wav("keyboard-typing.wav", generate_keyboard(DURATION))
    
    # Sci-fi sounds
    save_wav("engine-hum.wav", generate_engine_hum(DURATION))
    save_wav("computer-beeps.wav", generate_crickets(DURATION) * 0.5)  # High pitched
    
    # Fantasy/dungeon sounds
    save_wav("dripping-water.wav", generate_water_drip(DURATION))
    save_wav("distant-echoes.wav", generate_brown_noise(DURATION) * 0.3)
    
    # Fire
    save_wav("fire-crackle.wav", generate_fire(DURATION))
    
    # Placeholder files (silent but valid)
    save_wav("owl.wav", np.zeros(DURATION * 44100) + np.random.randn(DURATION * 44100) * 0.01)
    save_wav("seagulls.wav", np.zeros(DURATION * 44100) + np.random.randn(DURATION * 44100) * 0.01)
    save_wav("coffee-machine.wav", generate_hvac(DURATION) * 0.5)
    
    print("=" * 50)
    print("Done! Audio files created in:", OUTPUT_DIR)
    
    # Update service to use .wav instead of .mp3
    print("\nNote: Update spatialAudioService.ts to use .wav extensions")

if __name__ == "__main__":
    main()
