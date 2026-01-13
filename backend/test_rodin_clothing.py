"""
Test: Generate a single clothing item using Rodin API
"""

import asyncio
from rodin_service import rodin_service

async def test_single_item():
    print("Testing Rodin API with single clothing item...")
    print("=" * 60)
    
    test_item = {
        "id": "tshirt_basic",
        "prompt": "basic crew neck t-shirt, clean simple design, casual clothing, white cotton fabric, game asset, low poly",
        "category": "tops"
    }
    
    print(f"Generating: {test_item['id']}")
    print(f"Prompt: {test_item['prompt']}")
    print()
    
    try:
        result = await rodin_service.generate_and_wait(
            prompt=test_item['prompt'],
            filename=f"{test_item['id']}.glb",
            quality='medium'
        )
        
        print("\nResult:")
        print(result)
        
        if result.get('success'):
            print(f"\n✅ SUCCESS!")
            print(f"File saved to: {result.get('file_path')}")
        else:
            print(f"\n❌ FAILED!")
            print(f"Error: {result.get('error')}")
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_single_item())
