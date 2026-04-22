export interface FieldConfig {
    key: string
    label: string
    type: 'text' | 'email' | 'url' | 'textarea' | 'date' | 'time' | 'select' | 'toggle' | 'image' | 'imagelist' | 'stringlist' | 'icon-picker'
    required?: boolean
    options?: string[]
    imageDir?: string
    captionsKey?: string
    iconKey?: 'facebook' | 'instagram' | 'calendar' | 'link' | 'mail' | 'phone'
    placeholder?: string
}

export interface SectionConfig {
    key: string
    label: string
    fields: FieldConfig[]
    isSingleObject?: boolean
}

export interface TabConfig {
    key: string
    label: string
    file: string | null
    ghPath: string | null
    type: 'array' | 'object' | 'haushaltsreden'
    fields?: FieldConfig[]
    topFields?: FieldConfig[]
    sections?: SectionConfig[]
    previewPath?: string
}

export interface PendingUpload {
    ghPath: string
    base64: string
    message: string
    tabKey?: string
}

export interface GHUser {
    login: string
    avatar_url: string

    [key: string]: unknown
}

