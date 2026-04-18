import {useConfig} from './useConfig'

export function useFeatures() {
    const config = useConfig()
    return {
        INSTAGRAM_FEED: config?.features?.instagramFeed ?? false,
        FRAKTION_NEWS: config?.features?.fraktionNews ?? false,
    }
}
