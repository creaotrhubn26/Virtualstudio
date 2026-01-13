#!/bin/bash

# Organize generated GLB models into proper directory structure
# This script moves files from backend/rodin_models/ to public/models/

SOURCE_DIR="/workspaces/Virtualstudio/backend/rodin_models"
BASE_DIR="/workspaces/Virtualstudio/public/models"

echo "Organizing GLB models..."
echo "Source: $SOURCE_DIR"
echo "Destination: $BASE_DIR"
echo ""

# === FACIAL FEATURES ===

# Noses
mv -v "$SOURCE_DIR/nose_small.glb.glb" "$BASE_DIR/facial_features/noses/nose_small.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/nose_medium.glb.glb" "$BASE_DIR/facial_features/noses/nose_medium.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/nose_large.glb.glb" "$BASE_DIR/facial_features/noses/nose_large.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/nose_wide.glb.glb" "$BASE_DIR/facial_features/noses/nose_wide.glb" 2>/dev/null || true

# Ears
mv -v "$SOURCE_DIR/ears_normal.glb.glb" "$BASE_DIR/facial_features/ears/ears_normal.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/ears_large.glb.glb" "$BASE_DIR/facial_features/ears/ears_large.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/ears_elf.glb.glb" "$BASE_DIR/facial_features/ears/ears_elf.glb" 2>/dev/null || true

# Mouths/Lips
mv -v "$SOURCE_DIR/lips_thin.glb.glb" "$BASE_DIR/facial_features/mouths/lips_thin.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/lips_full.glb.glb" "$BASE_DIR/facial_features/mouths/lips_full.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/mouth_smile.glb.glb" "$BASE_DIR/facial_features/mouths/mouth_smile.glb" 2>/dev/null || true

# Eyebrows
mv -v "$SOURCE_DIR/eyebrows_thin.glb.glb" "$BASE_DIR/facial_features/eyebrows/eyebrows_thin.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/eyebrows_thick.glb.glb" "$BASE_DIR/facial_features/eyebrows/eyebrows_thick.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/eyebrows_curved.glb.glb" "$BASE_DIR/facial_features/eyebrows/eyebrows_curved.glb" 2>/dev/null || true

# Facial Hair
mv -v "$SOURCE_DIR/beard_full.glb.glb" "$BASE_DIR/facial_features/facial_hair/beard_full.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/beard_goatee.glb.glb" "$BASE_DIR/facial_features/facial_hair/beard_goatee.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/mustache_classic.glb.glb" "$BASE_DIR/facial_features/facial_hair/mustache_classic.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/mustache_thin.glb.glb" "$BASE_DIR/facial_features/facial_hair/mustache_thin.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/beard_stubble.glb.glb" "$BASE_DIR/facial_features/facial_hair/beard_stubble.glb" 2>/dev/null || true

# === HEAD ACCESSORIES ===

# Hats
mv -v "$SOURCE_DIR/hat_baseball_cap.glb.glb" "$BASE_DIR/head_accessories/hats/hat_baseball_cap.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hat_fedora.glb.glb" "$BASE_DIR/head_accessories/hats/hat_fedora.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hat_cowboy.glb.glb" "$BASE_DIR/head_accessories/hats/hat_cowboy.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hat_witch.glb.glb" "$BASE_DIR/head_accessories/hats/hat_witch.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hat_top_hat.glb.glb" "$BASE_DIR/head_accessories/hats/hat_top_hat.glb" 2>/dev/null || true

# Hair
mv -v "$SOURCE_DIR/hair_short_male.glb.glb" "$BASE_DIR/head_accessories/hair/hair_short_male.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_long_straight.glb.glb" "$BASE_DIR/head_accessories/hair/hair_long_straight.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_curly.glb.glb" "$BASE_DIR/head_accessories/hair/hair_curly.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_ponytail.glb.glb" "$BASE_DIR/head_accessories/hair/hair_ponytail.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_bun.glb.glb" "$BASE_DIR/head_accessories/hair/hair_bun.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_braided.glb.glb" "$BASE_DIR/head_accessories/hair/hair_braided.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_mohawk.glb.glb" "$BASE_DIR/head_accessories/hair/hair_mohawk.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/hair_bald.glb.glb" "$BASE_DIR/head_accessories/hair/hair_bald.glb" 2>/dev/null || true

# Headbands
mv -v "$SOURCE_DIR/headband_sport.glb.glb" "$BASE_DIR/head_accessories/headbands/headband_sport.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/headband_flower.glb.glb" "$BASE_DIR/head_accessories/headbands/headband_flower.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/headband_metal.glb.glb" "$BASE_DIR/head_accessories/headbands/headband_metal.glb" 2>/dev/null || true

# Crowns
mv -v "$SOURCE_DIR/crown_gold.glb.glb" "$BASE_DIR/head_accessories/crowns/crown_gold.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/tiara_princess.glb.glb" "$BASE_DIR/head_accessories/crowns/tiara_princess.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/crown_laurel.glb.glb" "$BASE_DIR/head_accessories/crowns/crown_laurel.glb" 2>/dev/null || true

# Helmets
mv -v "$SOURCE_DIR/helmet_knight.glb.glb" "$BASE_DIR/head_accessories/helmets/helmet_knight.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/helmet_viking.glb.glb" "$BASE_DIR/head_accessories/helmets/helmet_viking.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/helmet_space.glb.glb" "$BASE_DIR/head_accessories/helmets/helmet_space.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/helmet_bike.glb.glb" "$BASE_DIR/head_accessories/helmets/helmet_bike.glb" 2>/dev/null || true

# === BODY ACCESSORIES ===

# Earrings
mv -v "$SOURCE_DIR/earrings_studs.glb.glb" "$BASE_DIR/body_accessories/earrings/earrings_studs.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/earrings_hoops.glb.glb" "$BASE_DIR/body_accessories/earrings/earrings_hoops.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/earrings_dangling.glb.glb" "$BASE_DIR/body_accessories/earrings/earrings_dangling.glb" 2>/dev/null || true

# Necklaces
mv -v "$SOURCE_DIR/necklace_chain.glb.glb" "$BASE_DIR/body_accessories/necklaces/necklace_chain.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/necklace_pendant.glb.glb" "$BASE_DIR/body_accessories/necklaces/necklace_pendant.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/necklace_pearl.glb.glb" "$BASE_DIR/body_accessories/necklaces/necklace_pearl.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/necklace_choker.glb.glb" "$BASE_DIR/body_accessories/necklaces/necklace_choker.glb" 2>/dev/null || true

# Bracelets
mv -v "$SOURCE_DIR/bracelet_chain.glb.glb" "$BASE_DIR/body_accessories/bracelets/bracelet_chain.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/bracelet_bangle.glb.glb" "$BASE_DIR/body_accessories/bracelets/bracelet_bangle.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/bracelet_beaded.glb.glb" "$BASE_DIR/body_accessories/bracelets/bracelet_beaded.glb" 2>/dev/null || true

# Watches
mv -v "$SOURCE_DIR/watch_digital.glb.glb" "$BASE_DIR/body_accessories/watches/watch_digital.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/watch_analog.glb.glb" "$BASE_DIR/body_accessories/watches/watch_analog.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/watch_smart.glb.glb" "$BASE_DIR/body_accessories/watches/watch_smart.glb" 2>/dev/null || true

# Bags
mv -v "$SOURCE_DIR/backpack_school.glb.glb" "$BASE_DIR/body_accessories/bags/backpack_school.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/backpack_hiking.glb.glb" "$BASE_DIR/body_accessories/bags/backpack_hiking.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/bag_messenger.glb.glb" "$BASE_DIR/body_accessories/bags/bag_messenger.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/bag_purse.glb.glb" "$BASE_DIR/body_accessories/bags/bag_purse.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/bag_tote.glb.glb" "$BASE_DIR/body_accessories/bags/bag_tote.glb" 2>/dev/null || true

# === CLOTHING ===

# Tops
mv -v "$SOURCE_DIR/tshirt_basic.glb.glb" "$BASE_DIR/clothing/tops/tshirt_basic.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/polo_shirt.glb.glb" "$BASE_DIR/clothing/tops/polo_shirt.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/dress_shirt.glb.glb" "$BASE_DIR/clothing/tops/dress_shirt.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/blouse_silk.glb.glb" "$BASE_DIR/clothing/tops/blouse_silk.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/tank_top.glb.glb" "$BASE_DIR/clothing/tops/tank_top.glb" 2>/dev/null || true
mv -v "$SOURCE_DIR/sweater_knit.glb.glb" "$BASE_DIR/clothing/tops/sweater_knit.glb" 2>/dev/null || true

echo ""
echo "Organization complete!"
echo ""
echo "Summary:"
find "$BASE_DIR" -name "*.glb" -type f | wc -l | xargs echo "Total GLB files organized:"
echo ""
echo "Files by category:"
echo "Facial Features:"
find "$BASE_DIR/facial_features" -name "*.glb" -type f 2>/dev/null | wc -l | xargs echo "  -"
echo "Head Accessories:"
find "$BASE_DIR/head_accessories" -name "*.glb" -type f 2>/dev/null | wc -l | xargs echo "  -"
echo "Body Accessories:"
find "$BASE_DIR/body_accessories" -name "*.glb" -type f 2>/dev/null | wc -l | xargs echo "  -"
echo "Clothing:"
find "$BASE_DIR/clothing" -name "*.glb" -type f 2>/dev/null | wc -l | xargs echo "  -"
