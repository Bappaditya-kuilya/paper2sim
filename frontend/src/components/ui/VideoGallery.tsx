

export interface Video {
  id: string;
  equationId: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  createdAt?: string;
}

export interface VideoGalleryProps {
  videos: Video[];
  onSelect?: (videoId: string) => void;
  onDelete?: (videoId: string) => void;
  selectedId?: string;
}

export function VideoGallery({
  videos,
  onSelect,
  onDelete,
  selectedId,
}: VideoGalleryProps) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No videos yet</p>
        <p className="text-xs mt-1">Render equations to see videos here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => onSelect?.(video.id)}
          className={`relative group cursor-pointer rounded-lg overflow-hidden border transition-colors ${
            selectedId === video.id
              ? 'border-blue-500'
              : 'border-zinc-800 hover:border-zinc-600'
          }`}
        >
          <div className="aspect-video bg-zinc-800 flex items-center justify-center">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : video.status === 'complete' ? (
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : video.status === 'processing' ? (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : video.status === 'error' ? (
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <div className="w-6 h-6 border-2 border-zinc-600 rounded-full" />
            )}
          </div>
          <div className="p-2">
            <p className="text-xs text-zinc-400 truncate">{video.equationId}</p>
            {video.duration && (
              <p className="text-xs text-zinc-500">{video.duration}s</p>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video.id);
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-zinc-900/80 rounded text-zinc-400 hover:text-red-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export interface RenderAllButtonProps {
  equationCount: number;
  renderedCount: number;
  isRendering?: boolean;
  onRenderAll?: () => void;
  onCancel?: () => void;
}

export function RenderAllButton({
  equationCount,
  renderedCount,
  isRendering = false,
  onRenderAll,
  onCancel,
}: RenderAllButtonProps) {
  const progress = equationCount > 0 ? renderedCount / equationCount : 0;
  const allRendered = renderedCount >= equationCount && equationCount > 0;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isRendering ? onCancel : onRenderAll}
        disabled={equationCount === 0}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isRendering
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
            : allRendered
            ? 'bg-zinc-700 text-zinc-400'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isRendering ? 'Cancel' : allRendered ? 'All Rendered' : `Render All (${equationCount})`}
      </button>

      {isRendering && (
        <div className="flex-1">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {renderedCount} / {equationCount} rendered
          </p>
        </div>
      )}
    </div>
  );
}
