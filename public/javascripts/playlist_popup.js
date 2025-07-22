document.addEventListener('DOMContentLoaded', function() {
    const togglePlaylistBtn = document.getElementById('togglePlaylistBtn');
    const playlistPopup = document.getElementById('playlistPopup');
    let isPlaylistVisible = false;

    // Toggle playlist visibility with animation
    function togglePlaylist(event) {
        if (event) {
            event.stopPropagation();
        }
        isPlaylistVisible = !isPlaylistVisible;
        
        if (isPlaylistVisible) {
            // Show playlist
            playlistPopup.style.display = 'block';
            // Use setTimeout to ensure display:block is applied before adding show class
            setTimeout(() => {
                playlistPopup.classList.add('show');
            }, 10);
        } else {
            // Hide playlist with animation
            playlistPopup.classList.remove('show');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                playlistPopup.style.display = 'none';
            }, 300); // Match this with your CSS transition duration
        }
        
        console.log('Playlist visibility:', isPlaylistVisible);
    }

    // Close playlist
    function closePlaylist() {
        if (isPlaylistVisible) {
            isPlaylistVisible = false;
            togglePlaylist();
        }
    }

    // Event Listeners
    if (togglePlaylistBtn && playlistPopup) {
        togglePlaylistBtn.addEventListener('click', togglePlaylist);
        
        // Close when clicking outside
        document.addEventListener('click', function(event) {
            if (!playlistPopup.contains(event.target) && 
                !togglePlaylistBtn.contains(event.target) && 
                isPlaylistVisible) {
                closePlaylist();
            }
        });

        // Prevent closing when clicking inside playlist
        playlistPopup.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        // Add keyboard support (ESC to close)
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isPlaylistVisible) {
                closePlaylist();
            }
        });
    }
});
