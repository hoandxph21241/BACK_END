document.addEventListener('DOMContentLoaded', function() {
    const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
    const playlistPopup = document.getElementById('playlistPopup');
    let isPlaylistVisible = false;

    // Toggle playlist visibility
    function togglePlaylist(event) {
        if (event) {
            event.stopPropagation();
        }
        isPlaylistVisible = !isPlaylistVisible;
        playlistPopup.classList.toggle('show', isPlaylistVisible);
    }

    // Close playlist when clicking outside
    function handleClickOutside(event) {
        if (isPlaylistVisible && !playlistPopup.contains(event.target) && !togglePlaylistBtn.contains(event.target)) {
            isPlaylistVisible = false;
            playlistPopup.classList.remove('show');
        }
    }

    // Event Listeners
    togglePlaylistBtn.addEventListener('click', togglePlaylist);
    document.addEventListener('click', handleClickOutside);
    
    // Prevent closing when clicking inside playlist
    playlistPopup.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});
