#!/usr/bin/env python3
"""
Download high-quality ambient audio from Freesound.org
Requires a Freesound API key: https://freesound.org/apiv2/apply
"""

import os
import sys
import requests
import json
from pathlib import Path

OUTPUT_DIR = "/workspaces/Virtualstudio/public/audio/ambience"
SFX_DIR = "/workspaces/Virtualstudio/public/audio/sfx"

# Freesound search queries for each sound type
# Format: "filename": {"query": "search terms", "filter": "optional filter"}
AMBIENCE_SOUNDS = {
    # Nature
    "birds": {"query": "birds forest morning chirping", "filter": "duration:[20 TO 60]"},
    "wind-leaves": {"query": "wind leaves rustling trees", "filter": "duration:[20 TO 60]"},
    "crickets": {"query": "crickets night summer", "filter": "duration:[20 TO 60]"},
    "owl": {"query": "owl hooting night forest", "filter": "duration:[10 TO 60]"},
    "rain": {"query": "rain gentle steady", "filter": "duration:[20 TO 60]"},
    "heavy-rain": {"query": "heavy rain storm downpour", "filter": "duration:[20 TO 60]"},
    "thunder": {"query": "thunder rumble storm", "filter": "duration:[10 TO 60]"},
    "distant-thunder": {"query": "distant thunder rumble", "filter": "duration:[10 TO 60]"},
    "waves": {"query": "ocean waves beach shore", "filter": "duration:[20 TO 60]"},
    "seagulls": {"query": "seagulls ocean beach", "filter": "duration:[10 TO 60]"},
    
    # Urban
    "traffic": {"query": "city traffic cars street", "filter": "duration:[20 TO 60]"},
    "crowd": {"query": "crowd people talking murmur", "filter": "duration:[20 TO 60]"},
    "cafe-chatter": {"query": "cafe coffee shop ambience", "filter": "duration:[20 TO 60]"},
    "coffee-machine": {"query": "espresso coffee machine", "filter": "duration:[5 TO 30]"},
    
    # Indoor
    "hvac": {"query": "air conditioning ventilation hum", "filter": "duration:[20 TO 60]"},
    "keyboard-typing": {"query": "keyboard typing office", "filter": "duration:[10 TO 60]"},
    
    # Sci-fi
    "engine-hum": {"query": "spaceship engine hum drone sci-fi", "filter": "duration:[20 TO 60]"},
    "computer-beeps": {"query": "computer beeps sci-fi interface", "filter": "duration:[10 TO 60]"},
    
    # Fantasy/Cave
    "dripping-water": {"query": "water dripping cave", "filter": "duration:[20 TO 60]"},
    "distant-echoes": {"query": "cave echo ambient dark", "filter": "duration:[20 TO 60]"},
    
    # Fire
    "fire-crackle": {"query": "campfire crackling fire", "filter": "duration:[20 TO 60]"},
}

SFX_SOUNDS = {
    "click": {"query": "ui click button", "filter": "duration:[0 TO 1]"},
    "hover": {"query": "ui hover soft", "filter": "duration:[0 TO 1]"},
    "success": {"query": "success confirm positive", "filter": "duration:[0 TO 2]"},
    "error": {"query": "error alert negative", "filter": "duration:[0 TO 2]"},
    "notification": {"query": "notification alert chime", "filter": "duration:[0 TO 2]"},
    "whoosh": {"query": "whoosh swoosh transition", "filter": "duration:[0 TO 2]"},
    "pop": {"query": "pop bubble ui", "filter": "duration:[0 TO 1]"},
}

def get_api_key():
    """Get API key from environment or prompt"""
    api_key = os.environ.get('FREESOUND_API_KEY')
    if not api_key:
        print("\n" + "="*60)
        print("FREESOUND API KEY REQUIRED")
        print("="*60)
        print("\n1. Go to: https://freesound.org/apiv2/apply")
        print("2. Create an account and request an API key")
        print("3. Set the environment variable:")
        print("   export FREESOUND_API_KEY='your_key_here'")
        print("\nOr enter your API key now:")
        api_key = input("API Key: ").strip()
    return api_key

def search_sound(api_key, query, filter_str="", page_size=5):
    """Search Freesound for a sound"""
    url = "https://freesound.org/apiv2/search/text/"
    params = {
        "query": query,
        "filter": filter_str,
        "fields": "id,name,duration,previews,license,avg_rating,num_ratings",
        "page_size": page_size,
        "sort": "rating_desc",
        "token": api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"  Search error: {e}")
        return None

def download_sound(api_key, sound_id, output_path):
    """Download a sound preview (HQ MP3)"""
    # First get the sound details
    url = f"https://freesound.org/apiv2/sounds/{sound_id}/"
    params = {"token": api_key}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        sound_data = response.json()
        
        # Get the HQ preview URL (or fallback to LQ)
        preview_url = sound_data.get('previews', {}).get('preview-hq-mp3')
        if not preview_url:
            preview_url = sound_data.get('previews', {}).get('preview-lq-mp3')
        
        if not preview_url:
            print(f"  No preview URL found")
            return False
        
        # Download the preview
        audio_response = requests.get(preview_url, timeout=30)
        audio_response.raise_for_status()
        
        # Save as .mp3 (we'll convert if needed)
        mp3_path = output_path.replace('.wav', '.mp3')
        with open(mp3_path, 'wb') as f:
            f.write(audio_response.content)
        
        # Convert to WAV using ffmpeg if available
        wav_path = output_path
        convert_result = os.system(f'ffmpeg -y -i "{mp3_path}" -ar 44100 -ac 2 "{wav_path}" 2>/dev/null')
        
        if convert_result == 0:
            os.remove(mp3_path)  # Clean up MP3
            return True
        else:
            # Keep MP3 if conversion fails
            print(f"  Kept as MP3 (ffmpeg not available)")
            return True
            
    except Exception as e:
        print(f"  Download error: {e}")
        return False

def download_sounds(api_key, sounds_dict, output_dir):
    """Download all sounds in a dictionary"""
    os.makedirs(output_dir, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    for filename, config in sounds_dict.items():
        output_path = os.path.join(output_dir, f"{filename}.wav")
        
        # Skip if already exists and is good size
        if os.path.exists(output_path) and os.path.getsize(output_path) > 100000:
            print(f"[SKIP] {filename} (exists)")
            success_count += 1
            continue
        
        print(f"[SEARCH] {filename}: {config['query'][:40]}...")
        
        # Search for sounds
        results = search_sound(
            api_key, 
            config['query'], 
            config.get('filter', '')
        )
        
        if not results or not results.get('results'):
            print(f"  No results found")
            fail_count += 1
            continue
        
        # Try to download the best rated result
        downloaded = False
        for sound in results['results'][:3]:  # Try top 3
            print(f"  Trying: {sound['name'][:30]}... (rating: {sound.get('avg_rating', 'N/A')})")
            if download_sound(api_key, sound['id'], output_path):
                print(f"[OK] {filename}.wav")
                downloaded = True
                success_count += 1
                break
        
        if not downloaded:
            print(f"[FAIL] {filename}")
            fail_count += 1
    
    return success_count, fail_count

def main():
    print("="*60)
    print("FREESOUND AUDIO DOWNLOADER")
    print("="*60)
    
    api_key = get_api_key()
    if not api_key:
        print("No API key provided. Exiting.")
        sys.exit(1)
    
    # Test API key
    print("\nTesting API key...")
    test = search_sound(api_key, "test", page_size=1)
    if not test:
        print("API key invalid or connection failed.")
        sys.exit(1)
    print("API key valid!\n")
    
    # Download ambience sounds
    print("="*60)
    print("DOWNLOADING AMBIENCE SOUNDS")
    print("="*60)
    amb_success, amb_fail = download_sounds(api_key, AMBIENCE_SOUNDS, OUTPUT_DIR)
    
    # Download SFX sounds
    print("\n" + "="*60)
    print("DOWNLOADING SFX SOUNDS")
    print("="*60)
    sfx_success, sfx_fail = download_sounds(api_key, SFX_SOUNDS, SFX_DIR)
    
    # Summary
    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    print(f"Ambience: {amb_success} success, {amb_fail} failed")
    print(f"SFX: {sfx_success} success, {sfx_fail} failed")
    print(f"\nFiles saved to:")
    print(f"  {OUTPUT_DIR}")
    print(f"  {SFX_DIR}")

if __name__ == "__main__":
    main()
