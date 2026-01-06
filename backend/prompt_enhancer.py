"""
Hyper3D Rodin Prompt Enhancer
Enhances text prompts to improve 3D model generation quality based on best practices.
"""

import re
from typing import List, Set


class PromptEnhancer:
    """
    Enhances prompts for Hyper3D Rodin API to improve generation quality.
    
    Applies best practices:
    - Structured format: Object type → Materials → Size → Colors → Functions → Context
    - Specific materials and dimensions
    - Professional context indicators
    - Quality descriptors
    """
    
    # Common material keywords
    MATERIALS = {
        'metal': ['aluminum', 'steel', 'chrome', 'brass', 'iron', 'metal'],
        'fabric': ['fabric', 'cloth', 'canvas', 'nylon', 'polyester'],
        'wood': ['wood', 'wooden', 'oak', 'pine', 'birch'],
        'plastic': ['plastic', 'acrylic', 'polycarbonate'],
        'glass': ['glass', 'transparent', 'translucent'],
    }
    
    # Quality indicators
    QUALITY_INDICATORS = ['professional', 'high quality', 'detailed', 'premium']
    
    # Context indicators
    CONTEXT_INDICATORS = [
        'studio equipment',
        'photography equipment',
        'studio lighting equipment',
        'professional equipment',
    ]
    
    # Isolation indicators
    ISOLATION_INDICATORS = [
        'isolated on white background',
        'isolated product',
        'product shot',
        'white background',
    ]
    
    def enhance(self, prompt: str) -> str:
        """
        Enhance a prompt for better 3D model generation.
        
        Args:
            prompt: Original user prompt
            
        Returns:
            Enhanced prompt with best practices applied
        """
        if not prompt or not prompt.strip():
            return prompt
        
        prompt = prompt.strip()
        print(f"[PromptEnhancer] Enhancing prompt: '{prompt}'")
        
        # Skip enhancement if prompt is already very detailed (likely pre-enhanced)
        if self._is_already_enhanced(prompt):
            print(f"[PromptEnhancer] Prompt already enhanced, skipping: '{prompt}'")
            return prompt
        
        # Build enhanced prompt parts
        parts = []
        
        # 1. Object identification (start with professional/quality indicator if missing)
        object_part = self._enhance_object_identification(prompt)
        parts.append(object_part)
        
        # 2. Extract and enhance materials
        materials = self._extract_materials(prompt)
        if materials:
            parts.append(', '.join(materials))
        
        # 3. Extract and enhance size/dimensions
        size_info = self._extract_size_info(prompt)
        if size_info:
            parts.append(size_info)
        
        # 4. Extract and enhance colors/finish
        color_info = self._extract_color_finish(prompt)
        if color_info:
            parts.append(color_info)
        
        # 5. Extract functional details
        functional_details = self._extract_functional_details(prompt)
        if functional_details:
            parts.append(functional_details)
        
        # 6. Add context if missing
        if not self._has_context(prompt):
            parts.append('studio equipment')
        
        # 7. Add isolation for product photography
        if not self._has_isolation(prompt):
            parts.append('isolated on white background')
        
        # Combine parts
        enhanced = ', '.join(parts)
        
        # Clean up: remove duplicate words/phrases
        enhanced = self._remove_duplicates(enhanced)
        
        print(f"[PromptEnhancer] Enhanced prompt: '{enhanced}'")
        return enhanced
    
    def _is_already_enhanced(self, prompt: str) -> bool:
        """Check if prompt is already well-enhanced."""
        # Check for multiple quality indicators
        quality_count = sum(1 for indicator in self.QUALITY_INDICATORS if indicator in prompt.lower())
        context_count = sum(1 for indicator in self.CONTEXT_INDICATORS if indicator in prompt.lower())
        
        # If prompt has quality indicator + context + is reasonably long, consider it enhanced
        if quality_count > 0 and context_count > 0 and len(prompt.split()) > 15:
            return True
        
        return False
    
    def _enhance_object_identification(self, prompt: str) -> str:
        """Enhance object identification with quality indicators."""
        prompt_lower = prompt.lower()
        
        # Check if already has quality indicator
        has_quality = any(indicator in prompt_lower for indicator in self.QUALITY_INDICATORS)
        
        if has_quality:
            return prompt
        
        # Add "professional" at the start if it's a photography/studio item
        photography_keywords = ['softbox', 'beauty dish', 'reflector', 'light', 'camera', 'tripod', 
                               'stand', 'stool', 'backdrop', 'flag', 'snoot', 'grid', 'barn door',
                               'fresnel', 'umbrella', 'paraply', 'monitor', 'microphone']
        
        if any(keyword in prompt_lower for keyword in photography_keywords):
            return f"Professional {prompt}"
        
        return prompt
    
    def _extract_materials(self, prompt: str) -> List[str]:
        """Extract and enhance material descriptions."""
        prompt_lower = prompt.lower()
        materials_found = []
        
        # Check for explicit materials
        for material_type, keywords in self.MATERIALS.items():
            for keyword in keywords:
                if keyword in prompt_lower:
                    if material_type == 'metal':
                        # Prefer specific metal types
                        if 'aluminum' in prompt_lower:
                            materials_found.append('aluminum')
                        elif 'steel' in prompt_lower:
                            materials_found.append('steel')
                        elif 'chrome' in prompt_lower:
                            materials_found.append('chrome')
                        else:
                            materials_found.append('metal')
                    elif material_type == 'fabric':
                        if 'fabric' in prompt_lower or 'cloth' in prompt_lower:
                            materials_found.append('fabric')
                    elif material_type == 'wood':
                        materials_found.append('wood')
                    elif material_type == 'plastic':
                        if 'acrylic' in prompt_lower:
                            materials_found.append('acrylic')
                        else:
                            materials_found.append('plastic')
                    break
        
        # If no materials found, try to infer from context
        if not materials_found:
            prompt_lower = prompt.lower()
            if any(word in prompt_lower for word in ['frame', 'stand', 'base', 'housing']):
                materials_found.append('metal')
            if any(word in prompt_lower for word in ['fabric', 'diffusion', 'softbox', 'umbrella']):
                materials_found.append('fabric')
        
        return list(set(materials_found))  # Remove duplicates
    
    def _extract_size_info(self, prompt: str) -> str:
        """Extract and enhance size/dimension information."""
        # Look for dimension patterns (e.g., "120cm", "60x90cm", "30x30x30cm")
        dimension_pattern = r'(\d+(?:\.\d+)?)\s*(?:x\s*)?(\d+(?:\.\d+)?)?\s*(?:x\s*)?(\d+(?:\.\d+)?)?\s*(cm|mm|m|inch|inches)?'
        matches = re.findall(dimension_pattern, prompt, re.IGNORECASE)
        
        if matches:
            # Dimensions already present, return as is
            return ''
        
        # Look for size descriptors
        size_keywords = {
            'large': 'large size',
            'small': 'small size',
            'medium': 'medium size',
            'compact': 'compact size',
            'portable': 'portable size',
        }
        
        for keyword, descriptor in size_keywords.items():
            if keyword in prompt.lower():
                return descriptor
        
        return ''
    
    def _extract_color_finish(self, prompt: str) -> str:
        """Extract and enhance color/finish information."""
        prompt_lower = prompt.lower()
        colors = []
        finishes = []
        
        # Common colors
        color_keywords = ['black', 'white', 'gray', 'grey', 'silver', 'chrome', 'gold', 'bronze']
        for color in color_keywords:
            if color in prompt_lower:
                colors.append(color)
        
        # Common finishes
        finish_keywords = {
            'matte': 'matte finish',
            'glossy': 'glossy finish',
            'brushed': 'brushed finish',
            'polished': 'polished finish',
        }
        
        for keyword, finish in finish_keywords.items():
            if keyword in prompt_lower:
                finishes.append(finish)
        
        result = []
        if colors:
            result.append(', '.join(colors))
        if finishes:
            result.append(', '.join(finishes))
        
        return ', '.join(result) if result else ''
    
    def _extract_functional_details(self, prompt: str) -> str:
        """Extract and enhance functional details."""
        prompt_lower = prompt.lower()
        functions = []
        
        functional_keywords = {
            'adjustable': 'adjustable',
            'foldable': 'foldable',
            'collapsible': 'collapsible',
            'portable': 'portable',
            'extendable': 'extendable',
            'removable': 'removable',
        }
        
        for keyword, function_name in functional_keywords.items():
            if keyword in prompt_lower:
                functions.append(function_name)
        
        return ', '.join(functions) if functions else ''
    
    def _has_context(self, prompt: str) -> bool:
        """Check if prompt has context indicators."""
        prompt_lower = prompt.lower()
        return any(indicator in prompt_lower for indicator in self.CONTEXT_INDICATORS)
    
    def _has_isolation(self, prompt: str) -> bool:
        """Check if prompt has isolation indicators."""
        prompt_lower = prompt.lower()
        return any(indicator in prompt_lower for indicator in self.ISOLATION_INDICATORS)
    
    def _remove_duplicates(self, text: str) -> str:
        """Remove duplicate words and phrases while preserving order."""
        # Split by comma and clean
        parts = [part.strip() for part in text.split(',')]
        
        # Remove exact duplicates
        seen = set()
        unique_parts = []
        for part in parts:
            part_lower = part.lower()
            if part_lower not in seen and part:
                seen.add(part_lower)
                unique_parts.append(part)
        
        return ', '.join(unique_parts)


# Singleton instance
prompt_enhancer = PromptEnhancer()

