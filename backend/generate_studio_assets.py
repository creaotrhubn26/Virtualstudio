"""
Studio Asset Generation Script
Generates 3D models for Virtual Studio using Hyper3D Rodin API
Budget: 213 credits @ 0.5 credits each = max 426 models
Target: ~70 models = 35 credits (with buffer for retries)
"""

import asyncio
import json
from pathlib import Path
from rodin_service import rodin_service

STUDIO_ASSETS = [
    # LYSUTSTYR (12 models) = 6 credits
    {"prompt": "Professional photography softbox light modifier, large rectangular shape, white diffusion fabric, black outer shell, aluminum frame, studio lighting equipment, isolated on white background", "filename": "softbox_large", "name": "Stor Softbox", "category": "lysutstyr"},
    {"prompt": "Small square photography softbox, compact studio light modifier, white diffusion panel, portable lighting equipment, isolated product shot", "filename": "softbox_small", "name": "Liten Softbox", "category": "lysutstyr"},
    {"prompt": "Photography beauty dish reflector, silver interior, white outer shell, circular parabolic shape, professional studio lighting modifier, isolated on white", "filename": "beauty_dish_silver", "name": "Beauty Dish Sølv", "category": "lysutstyr"},
    {"prompt": "White beauty dish photography light modifier, matte white interior, round parabolic reflector, studio portrait lighting, isolated product", "filename": "beauty_dish_white", "name": "Beauty Dish Hvit", "category": "lysutstyr"},
    {"prompt": "Photography strip softbox, long narrow rectangular shape, studio lighting modifier for rim light, black fabric exterior, white diffusion", "filename": "stripbox", "name": "Stripbox", "category": "lysutstyr"},
    {"prompt": "Narrow strip light softbox, tall thin rectangular studio light modifier, professional photography equipment", "filename": "stripbox_narrow", "name": "Smal Stripbox", "category": "lysutstyr"},
    {"prompt": "Fresnel spotlight for photography, metal housing, adjustable focus lens, barn doors attached, professional film lighting", "filename": "fresnel_spot", "name": "Fresnel Spot", "category": "lysutstyr"},
    {"prompt": "Compact LED fresnel light, cinema lighting equipment, adjustable beam angle, metal construction", "filename": "fresnel_led", "name": "LED Fresnel", "category": "lysusstyr"},
    {"prompt": "Professional ring light for photography, large circular LED light, adjustable brightness, camera mount center, beauty lighting", "filename": "ring_light", "name": "Ring Light", "category": "lysutstyr"},
    {"prompt": "Photography umbrella reflector, silver interior, black exterior, studio lighting modifier, collapsible design", "filename": "umbrella_silver", "name": "Paraply Sølv", "category": "lysutstyr"},
    {"prompt": "White translucent photography umbrella, shoot-through diffuser, studio lighting equipment", "filename": "umbrella_white", "name": "Paraply Hvit", "category": "lysutstyr"},
    {"prompt": "Photography octabox, octagonal softbox, large studio light modifier, white diffusion fabric", "filename": "octabox", "name": "Octabox", "category": "lysutstyr"},
    
    # STATIV/OPPHENG (5 models) = 2.5 credits
    {"prompt": "Professional C-stand for photography, chrome steel construction, turtle base legs, grip arm and knuckle, studio equipment stand", "filename": "c_stand", "name": "C-Stand", "category": "stativ"},
    {"prompt": "Heavy duty C-stand with boom arm, black steel, adjustable height, studio grip equipment", "filename": "c_stand_boom", "name": "C-Stand m/Arm", "category": "stativ"},
    {"prompt": "Photography light stand, black aluminum tripod, adjustable height, air cushioned, studio equipment", "filename": "light_stand", "name": "Lysstativ", "category": "stativ"},
    {"prompt": "Compact light stand for photography, portable tripod base, lightweight aluminum, foldable legs", "filename": "light_stand_small", "name": "Lite Lysstativ", "category": "stativ"},
    {"prompt": "Photography boom arm, extendable cantilever arm, counterweight, studio overhead lighting mount", "filename": "boom_arm", "name": "Boom Arm", "category": "stativ"},
    
    # MODIFIKATORER (7 models) = 3.5 credits
    {"prompt": "Photography reflector disc, 5-in-1, silver gold white black translucent, circular collapsible, studio lighting tool", "filename": "reflector_5in1", "name": "Reflektor 5-i-1", "category": "modifikator"},
    {"prompt": "Large rectangular photography reflector, silver surface, aluminum frame, studio fill light equipment", "filename": "reflector_large", "name": "Stor Reflektor", "category": "modifikator"},
    {"prompt": "Photography diffusion panel, white translucent fabric, rectangular frame, studio soft light modifier", "filename": "diffusion_panel", "name": "Diffusjonspanel", "category": "modifikator"},
    {"prompt": "Photography flag blocker, black fabric on metal frame, light control tool, studio grip equipment", "filename": "flag_black", "name": "Flag Svart", "category": "modifikator"},
    {"prompt": "White bounce flag for photography, foam board on stand, studio fill light tool", "filename": "flag_white", "name": "Flag Hvit", "category": "modifikator"},
    {"prompt": "Photography snoot light modifier, conical metal tube, focused spotlight beam, studio lighting accessory", "filename": "snoot", "name": "Snoot", "category": "modifikator"},
    {"prompt": "Barn doors light modifier, four metal flaps, adjustable light control, studio lighting accessory, black metal", "filename": "barn_doors", "name": "Barn Doors", "category": "modifikator"},
    
    # MØBLER (5 models) = 2.5 credits
    {"prompt": "Photography posing stool, round seat, adjustable height, chrome base, studio furniture, modern design", "filename": "posing_stool", "name": "Poseringskrakk", "category": "mobler"},
    {"prompt": "Director chair for photography studio, black canvas seat, wooden frame, foldable, professional set furniture", "filename": "director_chair", "name": "Registorstol", "category": "mobler"},
    {"prompt": "Apple box set for photography, wooden boxes, various sizes, studio grip equipment, posing props", "filename": "apple_box", "name": "Apple Box", "category": "mobler"},
    {"prompt": "Small side table for photography studio, white surface, minimalist design, product photography prop", "filename": "side_table", "name": "Sidebord", "category": "mobler"},
    {"prompt": "Photography posing cube, white acrylic box, studio prop, product display stand", "filename": "posing_cube", "name": "Poseringskube", "category": "mobler"},
    
    # PROPS (3 models) = 1.5 credits
    {"prompt": "Professional DSLR camera on tripod, black camera body, telephoto lens, carbon fiber tripod, photography equipment", "filename": "camera_tripod", "name": "Kamera på Stativ", "category": "props"},
    {"prompt": "Studio monitor on stand, video reference display, adjustable mount, professional film equipment", "filename": "monitor_stand", "name": "Monitor", "category": "props"},
    {"prompt": "Photography cable drum, orange power cable, professional studio electrical equipment", "filename": "cable_drum", "name": "Kabeltrommel", "category": "props"},
    
    # BAKGRUNNER (4 models) = 2 credits
    {"prompt": "Paper backdrop roll on stand, white seamless paper, aluminum crossbar, photography studio background system", "filename": "paper_backdrop_white", "name": "Papirrulle Hvit", "category": "bakgrunn"},
    {"prompt": "Gray paper backdrop roll on stand, seamless background, studio photography equipment", "filename": "paper_backdrop_gray", "name": "Papirrulle Grå", "category": "bakgrunn"},
    {"prompt": "Photography V-flat, two hinged white foam boards, studio bounce reflector, freestanding", "filename": "v_flat_white", "name": "V-Flat Hvit", "category": "bakgrunn"},
    {"prompt": "Black V-flat for photography, two hinged black panels, negative fill, studio light control", "filename": "v_flat_black", "name": "V-Flat Svart", "category": "bakgrunn"},
]

# Total: 36 models = 18 credits

async def generate_all_assets():
    """Generate all studio assets."""
    print(f"Starting generation of {len(STUDIO_ASSETS)} studio assets...")
    print(f"Estimated credits: {len(STUDIO_ASSETS) * 0.5}")
    print("-" * 50)
    
    results = await rodin_service.batch_generate(
        items=STUDIO_ASSETS,
        quality="low"  # Use low quality to save credits (8k faces still good)
    )
    
    # Save results
    output_file = Path(__file__).parent / "generated_assets.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    
    print("-" * 50)
    print(f"Generation complete!")
    print(f"Successful: {len(successful)}/{len(results)}")
    print(f"Failed: {len(failed)}/{len(results)}")
    print(f"Results saved to: {output_file}")
    
    return results

if __name__ == "__main__":
    asyncio.run(generate_all_assets())
