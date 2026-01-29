'use client';

interface ItemInformationGridProps {
  item: {
    id: string;
    name: string;
    summary: string;
    category_name: string;
    max_guests: number;
    inventory_quantity: number;
    unlimited_inventory: boolean;
  };
  parameters?: any[];
  tags?: any[];
  media: any[];
  locale?: 'vi' | 'en';
}

// Convert YouTube URL or Video ID to embed format
function getYouTubeEmbedUrl(url: string, startTime?: number): string {
  try {
    let videoId = url;

    // If already an embed URL, extract the video ID
    if (url.includes('youtube.com/embed/')) {
      const match = url.match(/youtube\.com\/embed\/([^?&]+)/);
      if (match && match[1]) videoId = match[1];
    }
    // Handle youtube.com/watch?v=VIDEO_ID format
    else if (url.includes('youtube.com/watch')) {
      const watchRegex = /(?:youtube\.com\/watch\?v=)([^&]+)/;
      const watchMatch = url.match(watchRegex);
      if (watchMatch && watchMatch[1]) videoId = watchMatch[1];
    }
    // Handle youtu.be/VIDEO_ID format
    else if (url.includes('youtu.be/')) {
      const shortRegex = /(?:youtu\.be\/)([^?]+)/;
      const shortMatch = url.match(shortRegex);
      if (shortMatch && shortMatch[1]) videoId = shortMatch[1];
    }
    // Otherwise assume it's a plain video ID already

    const base = `https://www.youtube.com/embed/${videoId}`;
    return startTime && startTime > 0 ? `${base}?start=${startTime}` : base;
  } catch (error) {
    console.error('Error converting YouTube URL:', error);
    return url;
  }
}

export function ItemInformationGrid({
  item,
  media,
  locale = 'vi',
}: ItemInformationGridProps) {
  // Translations
  const t = {
    guestsMaximum: locale === 'vi' ? 'người tối đa' : 'guests maximum',
    description: locale === 'vi' ? 'Thông tin chi tiết' : 'Detailed Information',
    video: locale === 'vi' ? 'Video' : 'Video',
  };

  // Filter only youtube videos
  const youtubeVideos = media?.filter(m => m.type === 'youtube') || [];

  return (
    <div className="space-y-6 border-t pt-6">
      {/* Description (HTML summary) */}
      {item.summary && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">{t.description}</h3>
          <div
            className="text-sm text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.summary }}
          />
        </div>
      )}

      {/* Video */}
      {youtubeVideos.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">{t.video}</h3>
          <div className="space-y-3">
            {youtubeVideos.map((video, index) => (
              <div key={index} className="aspect-video w-1/2">
                <iframe
                  src={getYouTubeEmbedUrl(video.url, video.video_start_time)}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
