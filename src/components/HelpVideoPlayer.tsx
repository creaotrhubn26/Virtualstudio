import {
  createElement,
  type FC } from 'react';
import { createRoot } from 'react-dom/client';
import { Box,
  Typography,
  IconButton,
} from '@mui/material';
import { PlayArrow, Close, Edit } from '@mui/icons-material';
import ElegantVideoPlayer from './ElegantVideoPlayer';

interface HelpVideoPlayerProps {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

const HelpVideoPlayer: FC<HelpVideoPlayerProps> = ({
  videoId,
  title,
  description,
  duration,
  videoUrl,
  thumbnailUrl
}) => {
  // Check if URL is YouTube or Vimeo
  const isYouTube = videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const isVimeo = videoUrl?.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  const isDirectVideo = videoUrl && !isYouTube && !isVimeo && (
    videoUrl.match(/\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i) ||
    videoUrl.match(/^https?:\/\//)
  );

  const openVideoModal = () => {
    if (!videoUrl) return;

    const modal = document.getElementById('helpVideoViewerModal');
    const modalBody = document.getElementById('helpVideoViewerBody');
    const modalTitle = document.getElementById('helpVideoViewerTitle');
    const closeBtn = document.getElementById('helpVideoViewerClose');
    const editBtn = document.getElementById('helpVideoViewerEdit');

    if (!modal || !modalBody) return;

    // Set title
    if (modalTitle) {
      modalTitle.textContent = title;
    }

    // Show modal first
    modal.style.display = 'flex';

    // Show loading screen
    const loadingScreen = document.getElementById('helpVideoViewerLoading');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
    }

    // Clear previous content but keep loading screen
    const existingVideo = modalBody.querySelector('iframe, video, .help-video-viewer-body > div:not(.help-video-viewer-loading)');
    if (existingVideo) {
      existingVideo.remove();
    }

    // Wait a bit for cinematic effect, then load video
    setTimeout(() => {
      // Handle YouTube
      if (isYouTube) {
        const embedId = isYouTube[1];
        const embedUrl = `https://www.youtube.com/embed/${embedId}?autoplay=1`;
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullScreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.onload = () => {
          // Hide loading screen when video loads
          setTimeout(() => {
            if (loadingScreen) {
              loadingScreen.style.display = 'none';
            }
          }, 500);
        };
        modalBody.appendChild(iframe);
      }
      // Handle Vimeo
      else if (isVimeo) {
        const embedId = isVimeo[1];
        const embedUrl = `https://player.vimeo.com/video/${embedId}?autoplay=1`;
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullScreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.onload = () => {
          setTimeout(() => {
            if (loadingScreen) {
              loadingScreen.style.display = 'none';
            }
          }, 500);
        };
        modalBody.appendChild(iframe);
      }
      // Handle direct video URLs
      else if (isDirectVideo) {
        const videoContainer = document.createElement('div');
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        modalBody.appendChild(videoContainer);
        
        // Mount ElegantVideoPlayer in the container
        const root = createRoot(videoContainer);
        root.render(
          createElement(ElegantVideoPlayer, {
            videoUrl: videoUrl,
            title: title,
            description: description,
            thumbnailUrl: thumbnailUrl,
            autoPlay: true,
            showComments: false
          })
        );

        // Hide loading screen after a delay for direct videos
        setTimeout(() => {
          if (loadingScreen) {
            loadingScreen.style.display = 'none';
          }
        }, 1500);
      }
    }, 800); // Wait 800ms for cinematic loading effect

    // Close handler
    const closeModal = () => {
      // Fade out animation
      modal.style.animation = 'fadeOutCinema 0.4s ease-out forwards';
      setTimeout(() => {
        modal.style.display = 'none';
        modal.style.animation = '';
        // Clear video content
        const existingVideo = modalBody.querySelector('iframe, video, .help-video-viewer-body > div:not(.help-video-viewer-loading)');
        if (existingVideo) {
          existingVideo.remove();
        }
        // Reset loading screen
        const loadingScreen = document.getElementById('helpVideoViewerLoading');
        if (loadingScreen) {
          loadingScreen.style.display = 'flex';
        }
      }, 400);
    };

    // Setup edit button - remove old listeners first to prevent duplicates
    if (editBtn) {
      // Remove old event listeners by cloning and replacing
      const newEditBtn = editBtn.cloneNode(true) as HTMLElement;
      editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
      const editBtnRef = document.getElementById('helpVideoViewerEdit');
      
      if (editBtnRef) {
        editBtnRef.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          console.log('HelpVideoPlayer (modal): Edit button clicked', { videoId, videoUrl, thumbnailUrl, title, description, duration });
          
          // Ensure help panel is open first
          const helpPanel = document.getElementById('helpPanel');
          if (helpPanel && !helpPanel.classList.contains('open')) {
            // Open help panel first
            console.log('HelpVideoPlayer (modal): Opening help panel first');
            window.dispatchEvent(new CustomEvent('toggle-help-panel'));
          }
          
          // Close video modal
          closeModal();
          
          // Wait a bit for modal to close and help panel to open, then dispatch edit event
          setTimeout(() => {
            const eventData = { videoId, videoUrl, thumbnailUrl, title, description, duration };
            console.log('HelpVideoPlayer (modal): Dispatching edit-video event', eventData);
            const event = new CustomEvent('edit-video', { 
              detail: eventData,
              bubbles: true,
              cancelable: true
            });
            window.dispatchEvent(event);
            console.log('HelpVideoPlayer (modal): Event dispatched');
          }, 500);
        });
        console.log('HelpVideoPlayer (modal): Edit button event listener attached');
      }
    } else {
      console.warn('HelpVideoPlayer (modal): Edit button not found!');
    }

    // Setup close button
    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }

    // Setup backdrop click
    const backdrop = modal.querySelector('.help-video-viewer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  // Placeholder state
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        gap: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05))',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Edit button - Always visible */}
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          
          console.log('HelpVideoPlayer (placeholder): Edit button clicked', { videoId, videoUrl, thumbnailUrl, title, description, duration });
          
          // Ensure help panel is open first
          const helpPanel = document.getElementById('helpPanel');
          if (helpPanel && !helpPanel.classList.contains('open')) {
            // Open help panel first
            console.log('HelpVideoPlayer (placeholder): Opening help panel first');
            window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            
            // Wait a bit for panel to open, then dispatch edit event
            setTimeout(() => {
              const eventData = { videoId, videoUrl, thumbnailUrl, title, description, duration };
              console.log('HelpVideoPlayer (placeholder): Dispatching edit-video event after opening panel', eventData);
              const event = new CustomEvent('edit-video', { 
                detail: eventData,
                bubbles: true,
                cancelable: true
              });
              window.dispatchEvent(event);
              console.log('HelpVideoPlayer (placeholder): Event dispatched after opening help panel');
            }, 500);
          } else {
            // Help panel is already open, dispatch edit event immediately
            const eventData = { videoId, videoUrl, thumbnailUrl, title, description, duration };
            console.log('HelpVideoPlayer (placeholder): Dispatching edit-video event', eventData);
            const event = new CustomEvent('edit-video', { 
              detail: eventData,
              bubbles: true,
              cancelable: true
            });
            window.dispatchEvent(event);
            console.log('HelpVideoPlayer (placeholder): Event dispatched');
          }
        }}
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 40,
          height: 40,
          bgcolor: 'rgba(139, 92, 246, 0.8)',
          color: '#fff',
          opacity: 0.9,
          transition: 'all 0.2s ease',
          zIndex: 10,
          '&:hover': {
            bgcolor: 'rgba(139, 92, 246, 1)',
            transform: 'scale(1.1)',
            opacity: 1,
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
          }
        }}
        title="Rediger video"
      >
        <Edit sx={{ fontSize: 18 }} />
      </IconButton>
      {/* Thumbnail */}
      <Box
        onClick={() => videoUrl && openVideoModal()}
        sx={{
          position: 'relative',
          width: 200,
          height: 112,
          background: thumbnailUrl 
            ? `url(${thumbnailUrl}) center/cover`
            : 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '12px',
          flexShrink: 0,
          overflow: 'hidden',
          cursor: videoUrl ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          '&:hover': videoUrl ? {
            transform: 'scale(1.02)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
          } : {}
        }}
      >
        <Box sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.2))'
        }} />
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            if (videoUrl) {
              openVideoModal();
            }
          }}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 48,
            height: 48,
            bgcolor: 'rgba(139, 92, 246, 0.9)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
            '&:hover': { bgcolor: '#8b5cf6', transform: 'translate(-50%, -50%) scale(1.1)' }
          }}
        >
          <PlayArrow />
        </IconButton>
        <Typography
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          {duration}
        </Typography>
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
          {description}
        </Typography>
        <Typography variant="caption" sx={{ color: videoUrl ? '#a78bfa' : 'rgba(255,255,255,0.5)' }}>
          {videoUrl ? 'Klikk for å spille av' : 'Video kommer snart'}
        </Typography>
      </Box>
    </Box>
  );
};

// Function to mount video players into placeholder elements
export function mountHelpVideoPlayers(): void {
  // Find all placeholders that haven't been mounted yet
  const placeholders = document.querySelectorAll('.help-video-placeholder[data-video-id]');
  
  if (placeholders.length === 0) {
    // No unmounted placeholders found
    return;
  }
  
  placeholders.forEach((placeholder) => {
    // Skip if already mounted
    if (placeholder.classList.contains('help-video-player-container')) {
      return;
    }
    
    const videoId = placeholder.getAttribute('data-video-id') || '';
    const titleEl = placeholder.querySelector('.video-info h4');
    const descEl = placeholder.querySelector('.video-info p');
    const durationEl = placeholder.querySelector('.video-duration');

    const title = titleEl?.textContent || 'Video';
    const description = descEl?.textContent || '';
    const duration = durationEl?.textContent || '0:00';
    const videoUrl = placeholder.getAttribute('data-video-url') || undefined;
    const thumbnailUrl = placeholder.getAttribute('data-thumbnail-url') || undefined;
    
    // Clear placeholder content
    placeholder.innerHTML = '';
    placeholder.classList.remove('help-video-placeholder');
    placeholder.classList.add('help-video-player-container');
    
    // Keep data attributes for edit functionality
    placeholder.setAttribute('data-video-id', videoId);
    if (videoUrl) placeholder.setAttribute('data-video-url', videoUrl);
    if (thumbnailUrl) placeholder.setAttribute('data-thumbnail-url', thumbnailUrl);
    
    // Mount React component
    try {
      const root = createRoot(placeholder as HTMLElement);
      root.render(
        <HelpVideoPlayer
          videoId={videoId}
          title={title}
          description={description}
          duration={duration}
          videoUrl={videoUrl}
          thumbnailUrl={thumbnailUrl}
        />
      );
    } catch (error) {
      console.error('[HelpVideoPlayer] Error mounting video player:', error);
    }
  });
}

export default HelpVideoPlayer;

