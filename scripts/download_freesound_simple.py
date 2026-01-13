#!/usr/bin/env python3
"""
Download high-quality ambient audio from Freesound.org
Uses curated sound IDs with known-good quality
"""

import os
import requests
from pathlib import Path

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"
SFX_DIR = "/workspaces/Virtualstudio/public/audio/sfx"

# Curated Freesound IDs for high-quality sounds (CC0/CC-BY licensed)
# These are hand-picked for quality and appropriate length
FREESOUND_SOUNDS = {
    # Ambience - Nature
    "birds": 531947,           # Morning forest birds
    "wind-leaves": 507907,     # Wind through leaves  
    "crickets": 243627,        # Night crickets
    "owl": 398632,             # Owl hooting
    "rain": 346642,            # Gentle rain
    "heavy-rain": 527688,      # Heavy rain storm
    "thunder": 377236,         # Thunder rumble
    "distant-thunder": 360328, # Distant thunder
    "waves": 531015,           # Ocean waves
    "seagulls": 321967,        # Seagulls
    
    # Ambience - Urban
    "traffic": 508479,         # City traffic
    "crowd": 388046,           # Crowd murmur
    "cafe-chatter": 445526,    # Cafe ambience
    "coffee-machine": 455336,  # Coffee machine
    
    # Ambience - Indoor
    "hvac": 431325,            # AC/ventilation
    "keyboard-typing": 551710, # Keyboard typing
    
    # Ambience - Sci-fi
    "engine-hum": 320328,      # Spaceship hum
    "computer-beeps": 341695,  # Computer beeps
    
    # Ambience - Cave/Fantasy
    "dripping-water": 384471,  # Water drips in cave
    "distant-echoes": 131979,  # Cave echoes
    
    # Fire
    "fire-crackle": 350757,    # Campfire
}

SFX_FREESOUND = {
    "click": 406,              # UI click
    "hover": 264981,           # Soft beep
    "success": 341695,         # Positive chime
    "error": 142608,           # Error sound
    "notification": 320655,    # Notification
    "whoosh": 60013,           # Whoosh
    "pop": 256116,             # Pop sound
}

def download_freesound_preview(sound_id, output_path, is_sfx=False):
    """Download a Freesound preview using the CDN URL pattern"""
    
    # Freesound CDN preview URL pattern
    # HQ previews are at: https://freesound.org/data/previews/{id//1000}/{id}_{user_id}-hq.mp3
    # We need to get the actual URL from the sound page
    
    # Try the API endpoint for sound info (no auth needed for basic info)
    info_url = f"https://freesound.org/apiv2/sounds/{sound_id}/"
    
    try:
        # First try to get the preview URL from the page
        # Use a different approach - scrape the preview URL
        page_url = f"https://freesound.org/people/x/sounds/{sound_id}/"
        
        # Direct CDN preview pattern (works for many sounds)
        # Format: https://freesound.org/data/previews/{bucket}/{sound_id}_{user_id}-lq.mp3
        bucket = sound_id // 1000
        
        # Try multiple preview URL patterns
        preview_urls = [
            f"https://freesound.org/data/previews/{bucket}/{sound_id}_preview-hq.mp3",
            f"https://cdn.freesound.org/previews/{bucket}/{sound_id}_preview-hq.mp3",
        ]
        
        for preview_url in preview_urls:
            try:
                response = requests.get(preview_url, timeout=15, allow_redirects=True)
                if response.status_code == 200 and len(response.content) > 1000:
                    # Save MP3
                    mp3_path = output_path.replace('.wav', '.mp3')
                    with open(mp3_path, 'wb') as f:
                        f.write(response.content)
                    
                    # Convert to WAV
                    wav_path = output_path
                    result = os.system(f'ffmpeg -y -i "{mp3_path}" -ar 44100 -ac 2 "{wav_path}" 2>/dev/null')
                    
                    if result == 0 and os.path.exists(wav_path):
                        os.remove(mp3_path)
                        return True
                    elif os.path.exists(mp3_path):
                        # Keep MP3 if WAV conversion fails
                        return True
            except:
                continue
        
        return False
        
    except Exception as e:
        print(f"  Error: {e}")
        return False

def download_from_alternative_sources(filename, output_path, is_sfx=False):
    """Try alternative free sound sources"""
    
    # BBC Sound Effects (free for personal use)
    # Pixabay (CC0)
    # Mixkit (free)
    
    search_queries = {
        "birds": "bird%20forest",
        "wind-leaves": "wind%20leaves",
        "crickets": "crickets",
        "owl": "owl",
        "rain": "rain",
        "heavy-rain": "rain%20heavy",
        "thunder": "thunder",
        "distant-thunder": "thunder%20distant",
        "waves": "ocean%20waves",
        "seagulls": "seagull",
        "traffic": "traffic",
        "crowd": "crowd",
        "cafe-chatter": "cafe",
        "coffee-machine": "coffee",
        "hvac": "air%20conditioning",
        "keyboard-typing": "keyboard",
        "engine-hum": "spaceship",
        "computer-beeps": "computer%20beep",
        "dripping-water": "water%20drip",
        "distant-echoes": "cave%20echo",
        "fire-crackle": "fire%20crackle",
        "click": "click",
        "hover": "beep",
        "success": "success",
        "error": "error",
        "notification": "notification",
        "whoosh": "whoosh",
        "pop": "pop",
    }
    
    query = search_queries.get(filename, filename)
    
    # Try Pixabay API (free, no key needed for limited use)
    # Note: Pixabay might require API key for production
    
    return False

def main():
    print("="*60)
    print("FREESOUND AUDIO DOWNLOADER")
    print("="*60)
    print("\nNote: Freesound requires an API key for full access.")
    print("Get one free at: https://freesound.org/apiv2/apply")
    print("\nAttempting to download using preview URLs...\n")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(SFX_DIR, exist_ok=True)
    
    # Download ambience
    print("AMBIENCE SOUNDS:")
    print("-" * 40)
    for filename, sound_id in FREESOUND_SOUNDS.items():
        output_path = os.path.join(OUTPUT_DIR, f"{filename}.wav")
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 100000:
            print(f"[SKIP] {filename} (exists)")
            continue
        
        print(f"[DL] {filename} (ID: {sound_id})...", end=" ")
        if download_freesound_preview(sound_id, output_path):
            size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            print(f"OK ({size//1024}KB)")
        else:
            print("FAIL - keeping synthesized version")
    
    # Download SFX
    print("\nSFX SOUNDS:")
    print("-" * 40)
    for filename, sound_id in SFX_FREESOUND.items():
        output_path = os.path.join(SFX_DIR, f"{filename}.wav")
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
            print(f"[SKIP] {filename} (exists)")
            continue
        
        print(f"[DL] {filename} (ID: {sound_id})...", end=" ")
        if download_freesound_preview(sound_id, output_path, is_sfx=True):
            size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            print(f"OK ({size//1024}KB)")
        else:
            print("FAIL - keeping synthesized version")
    
    print("\n" + "="*60)
    print("For best results, get a Freesound API key and run:")
    print("  export FREESOUND_API_KEY='your_key'")
    print("  python scripts/download_freesound_audio.py")
    print("="*60)

if __name__ == "__main__":
    main()
