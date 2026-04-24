import {useConfig} from './useConfig'

export function useFeatures() {
    const config = useConfig()
    return {
        INSTAGRAM_FEED: config?.features?.instagramFeed ?? false,
    }
}
