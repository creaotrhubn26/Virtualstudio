#!/usr/bin/env python3
"""
Generate high-quality ambient audio using AI models
Supports: AudioLDM2 (diffusers), AudioCraft fallback, or synthesis
"""

import os
import sys
import numpy as np
import scipy.io.wavfile as wav

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"
SAMPLE_RATE = 16000  # AudioLDM2 default
DURATION = 30  # seconds

# Audio generation prompts for each sound type
AUDIO_PROMPTS = {
    # Nature sounds
    "birds": "birds chirping and singing in a peaceful forest, morning ambience, nature recording",
    "wind-leaves": "gentle wind blowing through tree leaves, rustling foliage, peaceful outdoor ambience",
    "crickets": "crickets chirping at night, summer evening atmosphere, nature sounds",
    "owl": "owl hooting in distance at night, forest atmosphere, wildlife",
    "rain": "soft rain falling on leaves and ground, peaceful rainfall, relaxing",
    "heavy-rain": "heavy rain pouring down intensely, rainstorm, dramatic weather",
    "thunder": "thunder rumbling and rolling across sky, dramatic storm",
    "distant-thunder": "distant thunder rumbling softly, far away storm, ambient",
    "waves": "ocean waves gently crashing on beach shore, coastal ambience, relaxing",
    "seagulls": "seagulls calling by seaside ocean beach, coastal birds",
    
    # Urban sounds
    "traffic": "city traffic sounds, cars passing on busy street, urban ambience",
    "crowd": "crowd of people talking quietly, busy public space, background chatter",
    "cafe-chatter": "coffee shop ambience with people chatting, cozy cafe sounds",
    "coffee-machine": "espresso machine hissing, grinding coffee beans, cafe",
    
    # Indoor sounds
    "hvac": "air conditioning humming quietly, ventilation system drone",
    "keyboard-typing": "mechanical keyboard typing sounds, office work ambience",
    
    # Sci-fi sounds
    "engine-hum": "spaceship engine humming, low frequency drone, sci-fi ambience",
    "computer-beeps": "computer interface beeping, futuristic electronic sounds",
    
    # Fantasy sounds
    "dripping-water": "water dripping in cave, echoing droplets, underground",
    "distant-echoes": "mysterious echoes in large cavern, ambient atmosphere",
    
    # Fire
    "fire-crackle": "campfire crackling and popping, wood burning, cozy flames"
}

def generate_with_audioldm2():
    """Generate audio using AudioLDM2 from diffusers"""
    print("Loading AudioLDM2 model...")
    
    try:
        import torch
        from diffusers import AudioLDM2Pipeline
        
        # Use small model for speed
        pipe = AudioLDM2Pipeline.from_pretrained(
            "cvssp/audioldm2",
            torch_dtype=torch.float32
        )
        
        # CPU mode
        pipe = pipe.to("cpu")
        
        print(f"Model loaded. Generating {len(AUDIO_PROMPTS)} audio files...")
        print("=" * 60)
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        for name, prompt in AUDIO_PROMPTS.items():
            wav_path = os.path.join(OUTPUT_DIR, f"{name}.wav")
            
            # Skip if exists and is large enough
            if os.path.exists(wav_path) and os.path.getsize(wav_path) > 500000:
                print(f"[SKIP] {name}.wav exists")
                continue
            
            print(f"[GEN] {name}: {prompt[:40]}...")
            
            try:
                # Generate audio
                audio = pipe(
                    prompt,
                    num_inference_steps=50,
                    audio_length_in_s=DURATION,
                    num_waveforms_per_prompt=1
                ).audios[0]
                
                # Save
                wav.write(wav_path, SAMPLE_RATE, (audio * 32767).astype(np.int16))
                print(f"[OK]  {name}.wav")
                
            except Exception as e:
                print(f"[ERR] {name}: {str(e)[:40]}")
        
        print("=" * 60)
        print("Done!")
        return True
        
    except Exception as e:
        print(f"AudioLDM2 failed: {e}")
        return False

def generate_with_synthesis():
    """High-quality procedural synthesis fallback"""
    print("Using advanced procedural synthesis...")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    sample_rate = 44100
    duration = DURATION
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples)
    
    def save(name, data):
        data = np.clip(data, -1, 1)
        data = (data * 32767).astype(np.int16)
        wav.write(os.path.join(OUTPUT_DIR, f"{name}.wav"), sample_rate, data)
        print(f"[OK] {name}.wav")
    
    def pink_noise(n):
        white = np.random.randn(n)
        # Voss-McCartney algorithm approximation
        pink = np.zeros(n)
        b = [0.99886, 0.99332, 0.96900, 0.86650, 0.55000, -0.7616]
        rows = np.zeros((6, n))
        for i in range(6):
            rows[i] = np.random.randn(n) * b[i]
        pink = np.sum(rows, axis=0) + white * 0.5362
        return pink / np.max(np.abs(pink))
    
    def brown_noise(n):
        white = np.random.randn(n)
        brown = np.cumsum(white)
        brown = brown - np.mean(brown)
        return brown / np.max(np.abs(brown))
    
    # Birds - chirping with harmonics
    print("[GEN] birds...")
    birds = np.zeros(samples)
    for _ in range(20):  # 20 bird voices
        freq = np.random.uniform(2000, 4500)
        start = np.random.randint(0, samples - sample_rate)
        dur = np.random.randint(sample_rate // 4, sample_rate)
        chirp_t = np.linspace(0, dur/sample_rate, dur)
        chirp = np.sin(2 * np.pi * freq * chirp_t * (1 + 0.5*np.sin(2*np.pi*10*chirp_t)))
        env = np.exp(-chirp_t * 3) * (1 - np.exp(-chirp_t * 50))
        birds[start:start+dur] += chirp * env * np.random.uniform(0.1, 0.3)
    birds += pink_noise(samples) * 0.05
    save("birds", birds / np.max(np.abs(birds)) * 0.6)
    
    # Wind through leaves
    print("[GEN] wind-leaves...")
    wind = pink_noise(samples)
    mod = 0.5 + 0.5 * np.sin(2*np.pi*0.08*t) * np.sin(2*np.pi*0.13*t)
    wind = wind * mod
    save("wind-leaves", wind * 0.5)
    
    # Crickets
    print("[GEN] crickets...")
    crickets = np.zeros(samples)
    for freq in [4200, 4800, 5400, 6000]:
        rate = np.random.uniform(4, 7)
        phase = np.random.uniform(0, 2*np.pi)
        env = (np.sin(2*np.pi*rate*t + phase) > 0.3).astype(float)
        env = np.convolve(env, np.ones(200)/200, mode='same')  # smooth
        crickets += np.sin(2*np.pi*freq*t) * env * 0.15
    save("crickets", crickets)
    
    # Owl hoots
    print("[GEN] owl...")
    owl = np.zeros(samples)
    for _ in range(int(duration / 4)):  # hoot every ~4 seconds
        start = np.random.randint(0, samples - sample_rate * 2)
        dur = int(sample_rate * 0.8)
        hoot_t = np.linspace(0, 0.8, dur)
        freq = 400 + 100 * np.sin(2*np.pi*1.5*hoot_t)
        hoot = np.sin(2*np.pi*freq*hoot_t)
        env = np.sin(np.pi*hoot_t/0.8)**2
        owl[start:start+dur] += hoot * env * 0.4
    save("owl", owl + pink_noise(samples) * 0.02)
    
    # Rain
    print("[GEN] rain...")
    rain = np.random.randn(samples)
    # High-pass for rain texture
    for i in range(1, samples):
        rain[i] = 0.95 * (rain[i] - rain[i-1]) + rain[i] * 0.1
    # Add drop impacts
    for _ in range(int(duration * 100)):
        pos = np.random.randint(0, samples - 500)
        rain[pos:pos+500] += np.exp(-np.linspace(0, 10, 500)) * np.random.randn(500) * 0.3
    save("rain", rain / np.max(np.abs(rain)) * 0.6)
    
    # Heavy rain
    print("[GEN] heavy-rain...")
    heavy = np.random.randn(samples) * 0.8
    for i in range(1, samples):
        heavy[i] = 0.9 * (heavy[i] - heavy[i-1]) + heavy[i] * 0.2
    for _ in range(int(duration * 200)):
        pos = np.random.randint(0, samples - 300)
        heavy[pos:pos+300] += np.exp(-np.linspace(0, 15, 300)) * np.random.randn(300) * 0.5
    save("heavy-rain", heavy / np.max(np.abs(heavy)) * 0.7)
    
    # Thunder
    print("[GEN] thunder...")
    thunder = np.zeros(samples)
    for _ in range(int(duration / 6)):
        pos = np.random.randint(0, samples - sample_rate * 4)
        dur = int(np.random.uniform(2, 4) * sample_rate)
        rumble = brown_noise(dur)
        env = np.exp(-np.linspace(0, 3, dur))
        crack = np.random.randn(min(5000, dur)) * np.exp(-np.linspace(0, 20, min(5000, dur)))
        rumble[:len(crack)] += crack * 2
        thunder[pos:pos+dur] += rumble * env * 0.8
    save("thunder", thunder / np.max(np.abs(thunder) + 0.01) * 0.7)
    
    # Distant thunder
    print("[GEN] distant-thunder...")
    save("distant-thunder", thunder / np.max(np.abs(thunder) + 0.01) * 0.3)
    
    # Ocean waves
    print("[GEN] waves...")
    waves = brown_noise(samples)
    wave_cycle = 0.5 + 0.5 * np.sin(2*np.pi*0.1*t)
    surf = pink_noise(samples) * np.maximum(0, np.sin(2*np.pi*0.1*t + np.pi/4))**4
    waves = waves * wave_cycle + surf * 0.5
    save("waves", waves / np.max(np.abs(waves)) * 0.6)
    
    # Seagulls
    print("[GEN] seagulls...")
    gulls = np.zeros(samples)
    for _ in range(int(duration / 3)):
        pos = np.random.randint(0, samples - sample_rate)
        dur = int(np.random.uniform(0.3, 0.8) * sample_rate)
        call_t = np.linspace(0, dur/sample_rate, dur)
        freq = 1500 + 500 * np.sin(2*np.pi*3*call_t)
        call = np.sin(2*np.pi*freq*call_t)
        env = np.sin(np.pi*call_t/(dur/sample_rate))**2
        gulls[pos:pos+dur] += call * env * 0.3
    save("seagulls", gulls + pink_noise(samples) * 0.02)
    
    # Traffic
    print("[GEN] traffic...")
    traffic = brown_noise(samples) * 0.5
    # Passing cars
    for _ in range(int(duration * 2)):
        pos = np.random.randint(0, samples - sample_rate * 2)
        dur = int(sample_rate * np.random.uniform(1, 3))
        car = pink_noise(dur)
        env = np.sin(np.pi*np.linspace(0, 1, dur))
        traffic[pos:pos+dur] += car * env * np.random.uniform(0.2, 0.5)
    save("traffic", traffic / np.max(np.abs(traffic)) * 0.5)
    
    # Crowd
    print("[GEN] crowd...")
    crowd = np.zeros(samples)
    for _ in range(15):
        voice = pink_noise(samples)
        mod = 0.5 + 0.5 * np.sin(2*np.pi*np.random.uniform(1,3)*t + np.random.uniform(0, 2*np.pi))
        crowd += voice * mod * 0.1
    save("crowd", crowd / np.max(np.abs(crowd)) * 0.4)
    
    # Cafe chatter
    print("[GEN] cafe-chatter...")
    save("cafe-chatter", crowd / np.max(np.abs(crowd)) * 0.35)
    
    # Coffee machine
    print("[GEN] coffee-machine...")
    coffee = np.zeros(samples)
    # Steam hiss
    for _ in range(int(duration / 8)):
        pos = np.random.randint(0, samples - sample_rate * 3)
        dur = int(sample_rate * np.random.uniform(1.5, 3))
        hiss = np.random.randn(dur) * 0.3
        env = np.ones(dur)
        env[:1000] = np.linspace(0, 1, 1000)
        env[-1000:] = np.linspace(1, 0, 1000)
        coffee[pos:pos+dur] += hiss * env
    save("coffee-machine", coffee + pink_noise(samples) * 0.05)
    
    # HVAC
    print("[GEN] hvac...")
    hvac = np.sin(2*np.pi*60*t) * 0.2 + np.sin(2*np.pi*120*t) * 0.1
    hvac += pink_noise(samples) * 0.15
    save("hvac", hvac)
    
    # Keyboard typing
    print("[GEN] keyboard-typing...")
    typing = np.zeros(samples)
    for _ in range(int(duration * 5)):
        pos = np.random.randint(0, samples - 2000)
        length = np.random.randint(500, 1500)
        key = np.random.randn(length) * np.exp(-np.linspace(0, 15, length))
        typing[pos:pos+length] += key * np.random.uniform(0.2, 0.4)
    save("keyboard-typing", typing / np.max(np.abs(typing) + 0.01) * 0.3)
    
    # Engine hum
    print("[GEN] engine-hum...")
    engine = np.sin(2*np.pi*40*t) * 0.4 + np.sin(2*np.pi*80*t) * 0.2 + np.sin(2*np.pi*120*t) * 0.1
    engine *= 1 + 0.1 * np.sin(2*np.pi*0.3*t)
    engine += pink_noise(samples) * 0.1
    save("engine-hum", engine)
    
    # Computer beeps
    print("[GEN] computer-beeps...")
    beeps = np.zeros(samples)
    for _ in range(int(duration * 2)):
        pos = np.random.randint(0, samples - 5000)
        freq = np.random.choice([800, 1000, 1200, 1500, 2000])
        dur = np.random.randint(1000, 4000)
        beep_t = np.linspace(0, dur/sample_rate, dur)
        beep = np.sin(2*np.pi*freq*beep_t)
        env = np.ones(dur)
        env[:100] = np.linspace(0, 1, 100)
        env[-100:] = np.linspace(1, 0, 100)
        beeps[pos:pos+dur] += beep * env * 0.2
    save("computer-beeps", beeps + np.random.randn(samples) * 0.01)
    
    # Dripping water
    print("[GEN] dripping-water...")
    drips = np.zeros(samples)
    for _ in range(int(duration * 2.5)):
        pos = np.random.randint(0, samples - 5000)
        freq = np.random.uniform(800, 1400)
        dur = np.random.randint(2000, 4000)
        drip_t = np.linspace(0, dur/sample_rate, dur)
        drip = np.sin(2*np.pi*freq*drip_t) * np.exp(-drip_t * 15)
        drips[pos:pos+dur] += drip * np.random.uniform(0.3, 0.6)
    save("dripping-water", drips)
    
    # Distant echoes
    print("[GEN] distant-echoes...")
    echoes = brown_noise(samples) * 0.2
    # Add occasional mysterious sounds
    for _ in range(int(duration / 5)):
        pos = np.random.randint(0, samples - sample_rate * 2)
        dur = int(sample_rate * np.random.uniform(0.5, 2))
        tone = np.sin(2*np.pi*np.random.uniform(100, 300)*np.linspace(0, dur/sample_rate, dur))
        env = np.exp(-np.linspace(0, 2, dur))
        echoes[pos:pos+dur] += tone * env * 0.2
    save("distant-echoes", echoes)
    
    # Fire crackle
    print("[GEN] fire-crackle...")
    fire = brown_noise(samples) * 0.2
    for _ in range(int(duration * 40)):
        pos = np.random.randint(0, samples - 2000)
        length = np.random.randint(100, 1500)
        crackle = np.random.randn(length) * np.exp(-np.linspace(0, 12, length))
        fire[pos:pos+length] += crackle * np.random.uniform(0.2, 0.6)
    save("fire-crackle", fire / np.max(np.abs(fire)) * 0.5)
    
    print("=" * 60)
    print(f"Done! Files saved to: {OUTPUT_DIR}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Try AudioLDM2 first, fall back to synthesis
    # if not generate_with_audioldm2():
    #     generate_with_synthesis()
    
    # For now, use synthesis (faster, no large model download)
    generate_with_synthesis()

if __name__ == "__main__":
    main()
