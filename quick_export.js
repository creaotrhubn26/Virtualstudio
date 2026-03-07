// Quick export script for browser console
// Copy and paste this into your browser console (F12) where Virtual Studio is running

(function() {
  const STORAGE_KEY = 'virtualStudio_castingProjects';
  const userId = window.__currentUserId || 'default-user';
  const params = new URLSearchParams({ user_id: userId, namespace: STORAGE_KEY });

  fetch(`/api/settings?${params.toString()}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(payload => {
      const parsed = payload?.data;
      if (!parsed) {
        console.log('❌ No data found in settings with namespace:', STORAGE_KEY);
        return;
      }

      const formatted = JSON.stringify(parsed, null, 2);

      // Copy to clipboard
      navigator.clipboard.writeText(formatted).then(() => {
        console.log('✅ Data copied to clipboard!');
        console.log('📋 Steps:');
        console.log('1. Create a file: casting_projects_backup.json');
        console.log('2. Paste the clipboard content');
        console.log('3. Save the file');
        console.log('4. Run: python3 migrate_casting_to_db.py casting_projects_backup.json');
      }).catch(() => {
        console.log('⚠️ Could not copy to clipboard, showing data below:');
        console.log(formatted);
      });

      // Also log it
      console.log('📊 Data preview:');
      console.log(`   Projects: ${Array.isArray(parsed) ? parsed.length : 1}`);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`   First project: ${parsed[0].name || 'Unnamed'} (${parsed[0].id})`);
      }
    })
    .catch(error => {
      console.error('❌ Error fetching data:', error);
    });
})();












