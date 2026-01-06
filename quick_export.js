// Quick export script for browser console
// Copy and paste this into your browser console (F12) where Casting Planner is running

(function() {
  const STORAGE_KEY = 'virtualStudio_castingProjects';
  const data = localStorage.getItem(STORAGE_KEY);
  
  if (!data) {
    console.log('❌ No data found in localStorage with key:', STORAGE_KEY);
    console.log('Available localStorage keys:', Object.keys(localStorage));
    return;
  }
  
  try {
    const parsed = JSON.parse(data);
    const formatted = JSON.stringify(parsed, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(formatted).then(() => {
      console.log('✅ Data copied to clipboard!');
      console.log('📋 Steps:');
      console.log('1. Create a file: casting_projects_backup.json');
      console.log('2. Paste the clipboard content');
      console.log('3. Save the file');
      console.log('4. Run: python3 migrate_casting_to_db.py casting_projects_backup.json');
    }).catch(err => {
      console.log('⚠️ Could not copy to clipboard, showing data below:');
      console.log(formatted);
    });
    
    // Also log it
    console.log('📊 Data preview:');
    console.log(`   Projects: ${Array.isArray(parsed) ? parsed.length : 1}`);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`   First project: ${parsed[0].name || 'Unnamed'} (${parsed[0].id})`);
    }
    
  } catch (error) {
    console.error('❌ Error parsing data:', error);
  }
})();












