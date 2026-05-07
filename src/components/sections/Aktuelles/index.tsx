import { useRef, useReducer, useEffect } from 'react'
import { useInView } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '@/hooks/useData'
import { useHttpErrorRedirect } from '@/hooks/useHttpErrorRedirect'
import { useConfig } from '@/hooks/useConfig'
import { useICSEvents } from '@/hooks/useICSEvents'
import type { NewsItem } from '@/types/news'
import type { ICSEvent } from '@/utils/icsParser'
import Sheet from '@/components/Sheet'
import SectionHeader from '@/components/SectionHeader'
import NewsFeed from './NewsFeed'
import CalendarSection from './CalendarSection'
import InstagramSection from './InstagramSection'
import NewsDetailSheet from './NewsDetailSheet'
import EventDetailSheet from './EventDetailSheet'
import DayPickerSheet from './DayPickerSheet'

// ---------------------------------------------------------------------------
// Sheet state machine
// ---------------------------------------------------------------------------

type SheetState =
  | { type: 'none' }
  | { type: 'news'; item: NewsItem }
  | { type: 'event'; event: ICSEvent }
  | { type: 'dayPicker'; events: ICSEvent[] }

type SheetAction =
  | { type: 'openNews'; item: NewsItem }
  | { type: 'openEvent'; event: ICSEvent }
  | { type: 'openDayPicker'; events: ICSEvent[] }
  | { type: 'close' }

function sheetReducer(_: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'openNews':
      return { type: 'news', item: action.item }
    case 'openEvent':
      return { type: 'event', event: action.event }
    case 'openDayPicker':
      return { type: 'dayPicker', events: action.events }
    case 'close':
      return { type: 'none' }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Aktuelles() {
  const { newsId } = useParams<{ newsId?: string }>()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const [sheet, dispatch] = useReducer(sheetReducer, { type: 'none' })

  const { data: newsItems, error: newsError } = useData<NewsItem[]>('/data/news.json')
  const config = useConfig()
  const { elfsightAppId, icsUrl } = config ?? {}

  // Only fetch ICS when config has loaded and an icsUrl is configured, preventing
  // 404 console errors in environments without the serverless function.
  const {
    events: icsEvents,
    loading: icsLoading,
    error: icsError,
  } = useICSEvents(config !== null && !!icsUrl)

  useHttpErrorRedirect(newsError)

  // Sync URL param → sheet state once news items are loaded.
  // The URL param is now a UUID; fall back to id for legacy items without uuid.
  useEffect(() => {
    if (!newsId || !newsItems) return
    const item = newsItems.find(n => (n.uuid ?? n.id) === newsId)
    if (item) {
      dispatch({ type: 'openNews', item })
    } else {
      navigate('/404', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsId, newsItems])

  function handleOpenNews(item: NewsItem) {
    navigate(`/aktuelles/${item.uuid ?? item.id}`)
  }

  function handleCloseNewsSheet() {
    dispatch({ type: 'close' })
    navigate('/aktuelles', { replace: true })
  }

  return (
    <section id="aktuelles" className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          onSelectEvent={event => dispatch({ type: 'openEvent', event })}
          onSelectDayEvents={events => dispatch({ type: 'openDayPicker', events })}
        />

        <InstagramSection elfsightAppId={elfsightAppId} />
      </div>

      {/* News detail sheet */}
      <Sheet open={sheet.type === 'news'} onClose={handleCloseNewsSheet} size="lg">
        {sheet.type === 'news' && <NewsDetailSheet news={sheet.item} />}
      </Sheet>

      {/* Day picker sheet (multiple events on the same day) */}
      <Sheet
        open={sheet.type === 'dayPicker' && sheet.events.length > 0}
        onClose={() => dispatch({ type: 'close' })}
      >
        {sheet.type === 'dayPicker' && (
          <DayPickerSheet
            events={sheet.events}
            onSelect={event => dispatch({ type: 'openEvent', event })}
          />
        )}
      </Sheet>

      {/* Event detail sheet */}
      <Sheet open={sheet.type === 'event'} onClose={() => dispatch({ type: 'close' })}>
        {sheet.type === 'event' && <EventDetailSheet event={sheet.event} />}
      </Sheet>
    </section>
  )
}
