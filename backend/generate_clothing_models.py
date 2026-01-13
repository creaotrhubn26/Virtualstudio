"""
Generate Clothing Models using Rodin API
Creates all clothing GLB files defined in clothingStyles.ts
"""

import asyncio
import sys
from pathlib import Path
from rodin_service import rodin_service

# Clothing items to generate
CLOTHING_ITEMS = [
    # TOPS
    {"id": "tshirt_basic", "prompt": "basic crew neck t-shirt, clean simple design, casual clothing, white cotton fabric, game asset, low poly", "category": "tops"},
    {"id": "polo_shirt", "prompt": "polo shirt with collar and buttons, casual clothing, cotton fabric, game asset, low poly", "category": "tops"},
    {"id": "dress_shirt", "prompt": "formal dress shirt with buttons and collar, white business shirt, game asset, low poly", "category": "tops"},
    {"id": "blouse_silk", "prompt": "elegant silk blouse, formal women's top, flowing fabric, game asset, low poly", "category": "tops"},
    {"id": "tank_top", "prompt": "athletic tank top, gym wear, sporty sleeveless shirt, game asset, low poly", "category": "tops"},
    {"id": "sweater_knit", "prompt": "cozy knit sweater, warm pullover, casual knitwear, game asset, low poly", "category": "tops"},
    
    # BOTTOMS
    {"id": "jeans_straight", "prompt": "straight leg blue jeans, denim pants, casual wear, game asset, low poly", "category": "bottoms"},
    {"id": "jeans_skinny", "prompt": "skinny fit jeans, slim denim pants, modern style, game asset, low poly", "category": "bottoms"},
    {"id": "pants_chino", "prompt": "chino pants, smart casual trousers, khaki business casual, game asset, low poly", "category": "bottoms"},
    {"id": "pants_dress", "prompt": "formal dress pants, business trousers, professional wear, game asset, low poly", "category": "bottoms"},
    {"id": "shorts_athletic", "prompt": "athletic shorts, gym shorts, sport wear, game asset, low poly", "category": "bottoms"},
    {"id": "skirt_pencil", "prompt": "professional pencil skirt, formal business skirt, game asset, low poly", "category": "bottoms"},
    
    # DRESSES
    {"id": "dress_cocktail", "prompt": "elegant cocktail dress, formal evening dress, little black dress, game asset, low poly", "category": "dresses"},
    {"id": "dress_summer", "prompt": "light summer dress, casual flowy dress, colorful sundress, game asset, low poly", "category": "dresses"},
    {"id": "dress_business", "prompt": "professional business dress, formal work dress, game asset, low poly", "category": "dresses"},
    
    # OUTERWEAR
    {"id": "jacket_blazer", "prompt": "classic blazer jacket, formal suit jacket, professional outerwear, game asset, low poly", "category": "outerwear"},
    {"id": "jacket_leather", "prompt": "leather jacket, biker jacket, casual outerwear, game asset, low poly", "category": "outerwear"},
    {"id": "cardigan", "prompt": "knit cardigan sweater, cozy button-up cardigan, casual wear, game asset, low poly", "category": "outerwear"},
    {"id": "hoodie", "prompt": "casual hoodie sweatshirt, pullover with hood, streetwear, game asset, low poly", "category": "outerwear"},
    
    # FOOTWEAR
    {"id": "shoes_sneakers", "prompt": "white sneakers, casual athletic shoes, tennis shoes, game asset, low poly", "category": "footwear"},
    {"id": "shoes_dress", "prompt": "black leather dress shoes, formal oxfords, men's business shoes, game asset, low poly", "category": "footwear"},
    {"id": "shoes_heels", "prompt": "classic high heels, women's formal shoes, elegant pumps, game asset, low poly", "category": "footwear"},
    {"id": "boots_ankle", "prompt": "ankle boots, casual women's boots, low heel boots, game asset, low poly", "category": "footwear"},
    
    # ACCESSORIES
    {"id": "belt_leather", "prompt": "leather belt with buckle, classic belt, accessory, game asset, low poly", "category": "accessories"},
    {"id": "scarf", "prompt": "knit scarf, warm winter scarf, fabric accessory, game asset, low poly", "category": "accessories"},
    {"id": "hat_beanie", "prompt": "knit beanie hat, casual winter hat, game asset, low poly", "category": "accessories"},
    {"id": "tie_necktie", "prompt": "silk necktie, formal tie, business accessory, game asset, low poly", "category": "accessories"},
]

async def generate_all_clothing():
    """Generate all clothing models using Rodin API"""
    print("=" * 80)
    print("CLOTHING MODEL GENERATION - Rodin API")
    print("=" * 80)
    print(f"Total items to generate: {len(CLOTHING_ITEMS)}")
    print()
    
    results = {
        "success": [],
        "failed": [],
        "pending": []
    }
    
    for idx, item in enumerate(CLOTHING_ITEMS, 1):
        print(f"\n[{idx}/{len(CLOTHING_ITEMS)}] Generating: {item['id']}")
        print(f"  Category: {item['category']}")
        print(f"  Prompt: {item['prompt']}")
        
        try:
            # Generate model
            result = await rodin_service.generate_and_wait(
                prompt=item['prompt'],
                filename=f"{item['id']}.glb",
                quality='medium'  # medium quality for faster generation
            )
            
            if result.get('status') == 'completed':
                results['success'].append(item['id'])
                print(f"  ✅ SUCCESS - Model saved to: {result.get('file_path')}")
            elif result.get('status') == 'pending':
                results['pending'].append(item['id'])
                print(f"  ⏳ PENDING - UUID: {result.get('uuid')}")
            else:
                results['failed'].append(item['id'])
                print(f"  ❌ FAILED - {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            results['failed'].append(item['id'])
            print(f"  ❌ ERROR - {str(e)}")
        
        # Small delay between requests
        if idx < len(CLOTHING_ITEMS):
            await asyncio.sleep(2)
    
    # Summary
    print("\n" + "=" * 80)
    print("GENERATION SUMMARY")
    print("=" * 80)
    print(f"✅ Completed: {len(results['success'])}")
    print(f"⏳ Pending: {len(results['pending'])}")
    print(f"❌ Failed: {len(results['failed'])}")
    
    if results['success']:
        print("\nSuccessfully generated models:")
        for model_id in results['success']:
            print(f"  - {model_id}")
    
    if results['pending']:
        print("\nPending models (check status later):")
        for model_id in results['pending']:
            print(f"  - {model_id}")
    
    if results['failed']:
        print("\nFailed models:")
        for model_id in results['failed']:
            print(f"  - {model_id}")
    
    print("\n" + "=" * 80)
    print(f"Output directory: {rodin_service.output_dir}")
    print("=" * 80)

if __name__ == "__main__":
    print("Starting clothing model generation...")
    print("This will generate 28 clothing items using Rodin API")
    print()
    
    asyncio.run(generate_all_clothing())
