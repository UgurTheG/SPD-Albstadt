/**
 * Thin wrapper that bundles the lightbox + all its plugins + CSS into a
 * single lazily-loaded chunk.  PhotoGallery imports this via React.lazy so
 * the lightbox code (~34 KiB) is only fetched when the user first opens
 * a photo in full-screen (not on initial page load).
 */
import Lightbox from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import 'yet-another-react-lightbox/plugins/captions.css'

type LightboxSlide = { src: string; description?: string }

interface LazyLightboxWrapperProps {
  open: boolean
  close: () => void
  slides: LightboxSlide[]
  index: number
  onView: (index: number) => void
  finite: boolean
}
export default function LazyLightboxWrapper({
  open,
  close,
  slides,
  index,
  onView,
  finite,
}: LazyLightboxWrapperProps) {
  return (
    <Lightbox
      open={open}
      close={close}
      slides={slides}
      index={index}
      on={{ view: ({ index }) => onView(index) }}
      plugins={[Counter, Captions, Zoom]}
      captions={{ descriptionTextAlign: 'center' }}
      carousel={{ finite }}
      zoom={{
        maxZoomPixelRatio: 3,
        scrollToZoom: true,
        pinchZoomDistanceFactor: 50,
      }}
      controller={{ closeOnBackdropClick: true }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
      }}
    />
  )
}
