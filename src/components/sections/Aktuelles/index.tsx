import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSectionPage } from '@/hooks/useSectionPage'
import { useConfig } from '@/hooks/useConfig'
import { useICSEvents } from '@/hooks/useICSEvents'
import type { NewsItem } from '@/types/news'
import type { ICSEvent } from '@/utils/icsParser'
import { useSheetState } from '@/hooks/useSheetState'
import Sheet from '@/components/Sheet'
import SectionHeader from '@/components/SectionHeader'
import SectionContainer from '@/components/SectionContainer'
import NewsFeed from './NewsFeed'
import CalendarSection from './CalendarSection'
import InstagramSection from './InstagramSection'
import NewsDetailSheet from './NewsDetailSheet'
import EventDetailSheet from './EventDetailSheet'
import DayPickerSheet from './DayPickerSheet'

type SheetState =
  | { type: 'none' }
  | { type: 'news'; item: NewsItem }
  | { type: 'event'; event: ICSEvent }
  | { type: 'dayPicker'; events: ICSEvent[] }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Aktuelles() {
  const { newsId } = useParams<{ newsId?: string }>()
  const navigate = useNavigate()
  const { ref, isInView, data: newsItems } = useSectionPage<NewsItem[]>('/data/news.json')
  const {
    state: sheet,
    set: setSheet,
    close: closeSheet,
  } = useSheetState<SheetState>({ type: 'none' })

  const config = useConfig()
  const { elfsightAppId, icsUrl } = config ?? {}

  // Only fetch ICS when config has loaded and an icsUrl is configured, preventing
  // 404 console errors in environments without the serverless function.
  const {
    events: icsEvents,
    loading: icsLoading,
    error: icsError,
  } = useICSEvents(config !== null && !!icsUrl)

  // Sync URL param → sheet state once news items are loaded.
  // The URL param is now a UUID; fall back to id for legacy items without uuid.
  useEffect(() => {
    if (!newsId || !newsItems) return
    const item = newsItems.find(n => (n.uuid ?? n.id) === newsId)
    if (item) {
      setSheet({ type: 'news', item })
    } else {
      navigate('/404', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsId, newsItems])

  function handleOpenNews(item: NewsItem) {
    navigate(`/aktuelles/${item.uuid ?? item.id}`)
  }

  function handleCloseNewsSheet() {
    closeSheet()
    navigate('/aktuelles', { replace: true })
  }

  return (
    <>
      <SectionContainer id="aktuelles">
        <SectionHeader
          sectionRef={ref}
          isInView={isInView}
          label="Aktuelles"
          title={
            <>
              Neuigkeiten <span className="whitespace-nowrap">& Termine</span>
            </>
          }
          description="Bleiben Sie informiert über aktuelle Themen der SPD Albstadt und kommende Veranstaltungen."
          mb="mb-12"
          descriptionClassName="max-w-2xl"
        />

        <NewsFeed newsItems={newsItems} onSelectNews={handleOpenNews} />

        <CalendarSection
          events={icsEvents}
          loading={icsLoading}
          error={icsError}
          icsUrl={icsUrl}
          onSelectEvent={event => setSheet({ type: 'event', event })}
          onSelectDayEvents={events => setSheet({ type: 'dayPicker', events })}
        />

        <InstagramSection elfsightAppId={elfsightAppId} />
      </SectionContainer>

      <Sheet open={sheet.type === 'news'} onClose={handleCloseNewsSheet} size="lg">
        {sheet.type === 'news' && <NewsDetailSheet news={sheet.item} />}
      </Sheet>

      <Sheet open={sheet.type === 'dayPicker' && sheet.events.length > 0} onClose={closeSheet}>
        {sheet.type === 'dayPicker' && (
          <DayPickerSheet
            events={sheet.events}
            onSelect={event => setSheet({ type: 'event', event })}
          />
        )}
      </Sheet>

      <Sheet open={sheet.type === 'event'} onClose={closeSheet}>
        {sheet.type === 'event' && <EventDetailSheet event={sheet.event} />}
      </Sheet>
    </>
  )
}
