import { NextRequest, NextResponse } from 'next/server';

interface Chapter {
  title: string;
  startTime: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  try {
    // Fetch the YouTube video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error('YouTube fetch failed:', response.status);
      return NextResponse.json({ chapters: [] });
    }

    const html = await response.text();
    const chapters: Chapter[] = [];

    // Try multiple extraction methods

    // Method 1: Extract from ytInitialPlayerResponse
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({[\s\S]+?});/);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);

        // Try to find chapters in player overlays
        const markersMap = playerResponse?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap;

        if (markersMap && Array.isArray(markersMap)) {
          for (const marker of markersMap) {
            if (marker.key === 'DESCRIPTION_CHAPTERS' && marker.value?.chapters) {
              for (const chapter of marker.value.chapters) {
                const chapterRenderer = chapter.chapterRenderer;
                if (chapterRenderer) {
                  chapters.push({
                    title: chapterRenderer.title.simpleText,
                    startTime: Math.floor(chapterRenderer.timeRangeStartMillis / 1000)
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing player response:', e);
      }
    }

    // Method 2: Extract from ytInitialData (fallback)
    if (chapters.length === 0) {
      const initialDataMatch = html.match(/var ytInitialData\s*=\s*({[\s\S]+?});/);
      if (initialDataMatch) {
        try {
          const initialData = JSON.parse(initialDataMatch[1]);

          // Look for chapters in engagement panels
          const panels = initialData?.engagementPanels;
          if (panels && Array.isArray(panels)) {
            for (const panel of panels) {
              const macroMarkersListRenderer = panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer;
              if (macroMarkersListRenderer?.contents) {
                for (const content of macroMarkersListRenderer.contents) {
                  const markerRenderer = content?.macroMarkersListItemRenderer;
                  if (markerRenderer) {
                    chapters.push({
                      title: markerRenderer.title.simpleText,
                      startTime: Math.floor(markerRenderer.timeDescription.simpleText.split(':').reduce((acc: number, time: string) => (60 * acc) + parseInt(time), 0))
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing initial data:', e);
        }
      }
    }

    console.log(`Found ${chapters.length} chapters for video ${videoId}`);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching YouTube chapters:', error);
    return NextResponse.json({
      error: 'Failed to fetch chapters',
      chapters: []
    });
  }
}
