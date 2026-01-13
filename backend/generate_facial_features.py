"""
Generate facial features and accessories using Rodin API
"""
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rodin_service import RodinService

# Facial Features and Accessories to generate
FACIAL_ITEMS = [
    # === FACIAL FEATURES ===
    # Noses
    {
        "id": "nose_small",
        "category": "facial_features",
        "subcategory": "noses",
        "prompt": "small button nose, human facial feature, realistic skin texture, game asset, low poly"
    },
    {
        "id": "nose_medium",
        "category": "facial_features",
        "subcategory": "noses",
        "prompt": "medium sized nose, neutral shape, human facial feature, realistic skin texture, game asset, low poly"
    },
    {
        "id": "nose_large",
        "category": "facial_features",
        "subcategory": "noses",
        "prompt": "prominent large nose, strong features, human facial feature, realistic skin texture, game asset, low poly"
    },
    {
        "id": "nose_wide",
        "category": "facial_features",
        "subcategory": "noses",
        "prompt": "wide nose with flared nostrils, human facial feature, realistic skin texture, game asset, low poly"
    },
    
    # Ears
    {
        "id": "ears_normal",
        "category": "facial_features",
        "subcategory": "ears",
        "prompt": "pair of human ears, normal size, realistic skin texture, game asset, low poly"
    },
    {
        "id": "ears_large",
        "category": "facial_features",
        "subcategory": "ears",
        "prompt": "pair of large human ears, prominent, realistic skin texture, game asset, low poly"
    },
    {
        "id": "ears_elf",
        "category": "facial_features",
        "subcategory": "ears",
        "prompt": "pair of pointed elf ears, fantasy character, realistic skin texture, game asset, low poly"
    },
    
    # Mouths/Lips
    {
        "id": "lips_thin",
        "category": "facial_features",
        "subcategory": "mouths",
        "prompt": "thin lips, neutral expression, human facial feature, realistic skin texture, game asset, low poly"
    },
    {
        "id": "lips_full",
        "category": "facial_features",
        "subcategory": "mouths",
        "prompt": "full plump lips, neutral expression, human facial feature, realistic skin texture, game asset, low poly"
    },
    {
        "id": "mouth_smile",
        "category": "facial_features",
        "subcategory": "mouths",
        "prompt": "smiling mouth with visible teeth, friendly expression, human facial feature, game asset, low poly"
    },
    
    # Eyebrows
    {
        "id": "eyebrows_thin",
        "category": "facial_features",
        "subcategory": "eyebrows",
        "prompt": "thin arched eyebrows, pair, human facial feature, game asset, low poly"
    },
    {
        "id": "eyebrows_thick",
        "category": "facial_features",
        "subcategory": "eyebrows",
        "prompt": "thick bushy eyebrows, pair, human facial feature, game asset, low poly"
    },
    {
        "id": "eyebrows_curved",
        "category": "facial_features",
        "subcategory": "eyebrows",
        "prompt": "curved expressive eyebrows, pair, human facial feature, game asset, low poly"
    },
    
    # Beards/Mustaches
    {
        "id": "beard_full",
        "category": "facial_features",
        "subcategory": "facial_hair",
        "prompt": "full beard, well-groomed, brown hair, game asset, low poly"
    },
    {
        "id": "beard_goatee",
        "category": "facial_features",
        "subcategory": "facial_hair",
        "prompt": "goatee beard, trimmed, stylish facial hair, game asset, low poly"
    },
    {
        "id": "mustache_classic",
        "category": "facial_features",
        "subcategory": "facial_hair",
        "prompt": "classic handlebar mustache, groomed facial hair, game asset, low poly"
    },
    {
        "id": "mustache_thin",
        "category": "facial_features",
        "subcategory": "facial_hair",
        "prompt": "thin pencil mustache, refined facial hair, game asset, low poly"
    },
    {
        "id": "beard_stubble",
        "category": "facial_features",
        "subcategory": "facial_hair",
        "prompt": "5 o'clock shadow stubble, short facial hair, realistic texture, game asset, low poly"
    },
    
    # === HEAD ACCESSORIES ===
    # Hats (additional to beanie)
    {
        "id": "hat_baseball_cap",
        "category": "head_accessories",
        "subcategory": "hats",
        "prompt": "baseball cap with curved brim, casual sports hat, adjustable strap, game asset, low poly"
    },
    {
        "id": "hat_fedora",
        "category": "head_accessories",
        "subcategory": "hats",
        "prompt": "classic fedora hat, felt material, stylish formal hat, game asset, low poly"
    },
    {
        "id": "hat_cowboy",
        "category": "head_accessories",
        "subcategory": "hats",
        "prompt": "western cowboy hat, brown leather, wide brim, game asset, low poly"
    },
    {
        "id": "hat_witch",
        "category": "head_accessories",
        "subcategory": "hats",
        "prompt": "pointed witch hat, black fabric, tall cone shape, fantasy accessory, game asset, low poly"
    },
    {
        "id": "hat_top_hat",
        "category": "head_accessories",
        "subcategory": "hats",
        "prompt": "tall top hat, black silk, formal Victorian hat, game asset, low poly"
    },
    
    # Hair Styles
    {
        "id": "hair_short_male",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "short male haircut, clean modern style, brown hair, game asset, low poly"
    },
    {
        "id": "hair_long_straight",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "long straight hair, flowing down shoulders, game asset, low poly"
    },
    {
        "id": "hair_curly",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "curly voluminous hair, natural curls, game asset, low poly"
    },
    {
        "id": "hair_ponytail",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "high ponytail hairstyle, tied back, game asset, low poly"
    },
    {
        "id": "hair_bun",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "hair bun updo, elegant hairstyle, game asset, low poly"
    },
    {
        "id": "hair_braided",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "long braided hair, twin braids, game asset, low poly"
    },
    {
        "id": "hair_mohawk",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "spiky mohawk hairstyle, punk style, game asset, low poly"
    },
    {
        "id": "hair_bald",
        "category": "head_accessories",
        "subcategory": "hair",
        "prompt": "bald head, smooth scalp, realistic skin texture, game asset, low poly"
    },
    
    # Headbands
    {
        "id": "headband_sport",
        "category": "head_accessories",
        "subcategory": "headbands",
        "prompt": "athletic headband, sweatband, stretchy fabric, game asset, low poly"
    },
    {
        "id": "headband_flower",
        "category": "head_accessories",
        "subcategory": "headbands",
        "prompt": "flower crown headband, decorative floral accessory, game asset, low poly"
    },
    {
        "id": "headband_metal",
        "category": "head_accessories",
        "subcategory": "headbands",
        "prompt": "metal headband with gem, fantasy accessory, silver circlet, game asset, low poly"
    },
    
    # Crowns/Tiaras
    {
        "id": "crown_gold",
        "category": "head_accessories",
        "subcategory": "crowns",
        "prompt": "golden royal crown with jewels, king's crown, ornate metallic, game asset, low poly"
    },
    {
        "id": "tiara_princess",
        "category": "head_accessories",
        "subcategory": "crowns",
        "prompt": "elegant princess tiara, silver with diamonds, delicate royal accessory, game asset, low poly"
    },
    {
        "id": "crown_laurel",
        "category": "head_accessories",
        "subcategory": "crowns",
        "prompt": "laurel wreath crown, golden leaves, Roman style, game asset, low poly"
    },
    
    # Helmets
    {
        "id": "helmet_knight",
        "category": "head_accessories",
        "subcategory": "helmets",
        "prompt": "medieval knight helmet with visor, steel armor, game asset, low poly"
    },
    {
        "id": "helmet_viking",
        "category": "head_accessories",
        "subcategory": "helmets",
        "prompt": "Viking horned helmet, iron with horns, Norse warrior helmet, game asset, low poly"
    },
    {
        "id": "helmet_space",
        "category": "head_accessories",
        "subcategory": "helmets",
        "prompt": "futuristic space helmet, clear visor, astronaut helmet, sci-fi, game asset, low poly"
    },
    {
        "id": "helmet_bike",
        "category": "head_accessories",
        "subcategory": "helmets",
        "prompt": "bicycle helmet, modern safety helmet, vented design, game asset, low poly"
    },
    
    # === BODY ACCESSORIES ===
    # Jewelry - Earrings
    {
        "id": "earrings_studs",
        "category": "body_accessories",
        "subcategory": "earrings",
        "prompt": "pair of stud earrings, small diamonds, simple elegant jewelry, game asset, low poly"
    },
    {
        "id": "earrings_hoops",
        "category": "body_accessories",
        "subcategory": "earrings",
        "prompt": "pair of hoop earrings, gold circular rings, medium size, game asset, low poly"
    },
    {
        "id": "earrings_dangling",
        "category": "body_accessories",
        "subcategory": "earrings",
        "prompt": "pair of dangling earrings, long elegant jewelry with gems, game asset, low poly"
    },
    
    # Jewelry - Necklaces
    {
        "id": "necklace_chain",
        "category": "body_accessories",
        "subcategory": "necklaces",
        "prompt": "simple gold chain necklace, thin delicate jewelry, game asset, low poly"
    },
    {
        "id": "necklace_pendant",
        "category": "body_accessories",
        "subcategory": "necklaces",
        "prompt": "necklace with pendant, heart-shaped charm on chain, game asset, low poly"
    },
    {
        "id": "necklace_pearl",
        "category": "body_accessories",
        "subcategory": "necklaces",
        "prompt": "pearl necklace, string of white pearls, elegant jewelry, game asset, low poly"
    },
    {
        "id": "necklace_choker",
        "category": "body_accessories",
        "subcategory": "necklaces",
        "prompt": "black choker necklace, tight fitting neck jewelry, game asset, low poly"
    },
    
    # Jewelry - Bracelets
    {
        "id": "bracelet_chain",
        "category": "body_accessories",
        "subcategory": "bracelets",
        "prompt": "gold chain bracelet, wrist jewelry, delicate links, game asset, low poly"
    },
    {
        "id": "bracelet_bangle",
        "category": "body_accessories",
        "subcategory": "bracelets",
        "prompt": "thick metal bangle bracelet, solid ring, silver jewelry, game asset, low poly"
    },
    {
        "id": "bracelet_beaded",
        "category": "body_accessories",
        "subcategory": "bracelets",
        "prompt": "beaded bracelet, colorful wooden beads on elastic, casual jewelry, game asset, low poly"
    },
    
    # Watches
    {
        "id": "watch_digital",
        "category": "body_accessories",
        "subcategory": "watches",
        "prompt": "digital wristwatch, LCD screen, sporty black watch, game asset, low poly"
    },
    {
        "id": "watch_analog",
        "category": "body_accessories",
        "subcategory": "watches",
        "prompt": "classic analog watch, round face with hands, leather strap, game asset, low poly"
    },
    {
        "id": "watch_smart",
        "category": "body_accessories",
        "subcategory": "watches",
        "prompt": "smartwatch, modern touchscreen, fitness tracker, tech accessory, game asset, low poly"
    },
    
    # Bags/Backpacks
    {
        "id": "backpack_school",
        "category": "body_accessories",
        "subcategory": "bags",
        "prompt": "school backpack with straps, two compartments, casual bag, game asset, low poly"
    },
    {
        "id": "backpack_hiking",
        "category": "body_accessories",
        "subcategory": "bags",
        "prompt": "large hiking backpack, outdoor gear bag, multiple pockets, game asset, low poly"
    },
    {
        "id": "bag_messenger",
        "category": "body_accessories",
        "subcategory": "bags",
        "prompt": "messenger bag, crossbody shoulder bag, canvas material, game asset, low poly"
    },
    {
        "id": "bag_purse",
        "category": "body_accessories",
        "subcategory": "bags",
        "prompt": "small purse handbag, leather clutch, elegant accessory, game asset, low poly"
    },
    {
        "id": "bag_tote",
        "category": "body_accessories",
        "subcategory": "bags",
        "prompt": "canvas tote bag, simple shopping bag with handles, game asset, low poly"
    },
]

async def generate_all_facial_items():
    """Generate all facial features and accessories"""
    rodin_service = RodinService()
    
    total = len(FACIAL_ITEMS)
    success_count = 0
    failed_count = 0
    pending = total
    
    print("Prompt enhancer imported successfully")
    print(f"Starting facial features and accessories generation...")
    print(f"This will generate {total} items using Rodin API")
    print()
    print("=" * 80)
    print("FACIAL FEATURES & ACCESSORIES GENERATION - Rodin API")
    print("=" * 80)
    print(f"Total items to generate: {total}\n\n")
    
    for idx, item in enumerate(FACIAL_ITEMS, 1):
        item_id = item['id']
        category = item['category']
        subcategory = item['subcategory']
        prompt = item['prompt']
        
        print(f"[{idx}/{total}] Generating: {item_id}")
        print(f"  Category: {category}/{subcategory}")
        print(f"  Prompt: {prompt}")
        
        try:
            # Generate and wait for completion
            result = await rodin_service.generate_and_wait(
                prompt=prompt,
                filename=f"{item_id}.glb",
                quality='medium'
            )
            
            if result.get('success'):
                print(f"  ✅ SUCCESS - {result.get('path', 'File saved')}")
                success_count += 1
            else:
                print(f"  ❌ FAILED - {result.get('error', 'Unknown error')}")
                failed_count += 1
                
        except Exception as e:
            print(f"  ❌ EXCEPTION - {str(e)}")
            failed_count += 1
        
        pending = total - (success_count + failed_count)
        print(f"  Progress: {success_count} success, {failed_count} failed, {pending} pending\n")
        
        # Small delay between requests to avoid rate limiting
        if idx < total:
            await asyncio.sleep(2)
    
    # Final summary
    print("\n" + "=" * 80)
    print("GENERATION COMPLETE")
    print("=" * 80)
    print(f"Total items: {total}")
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"Success rate: {(success_count/total*100):.1f}%")
    print()
    print("Generated files are in: backend/rodin_models/")
    print("Next steps:")
    print("1. Move GLB files to appropriate directories:")
    print("   - public/models/facial_features/{subcategory}/")
    print("   - public/models/head_accessories/{subcategory}/")
    print("   - public/models/body_accessories/{subcategory}/")
    print("2. Update facial features data file")
    print("3. Test in browser")

if __name__ == "__main__":
    asyncio.run(generate_all_facial_items())
