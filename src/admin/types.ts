export interface FieldConfig {
  key: string
  label: string
  type:
    | 'text'
    | 'email'
    | 'url'
    | 'textarea'
    | 'date'
    | 'time'
    | 'select'
    | 'toggle'
    | 'image'
    | 'imagelist'
    | 'stringlist'
    | 'icon-picker'
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
  /** Identity keys auto-assigned (crypto.randomUUID) to newly added items.
   *  Declared in config so items added to an EMPTY array still get them —
   *  inference from existing items has nothing to infer from. */
  itemIds?: ('id' | 'uuid')[]
}

export interface TabConfig {
  key: string
  label: string
  file: string | null
  ghPath: string | null
  type: 'array' | 'object' | 'haushaltsreden' | 'kommunalpolitik'
  fields?: FieldConfig[]
  topFields?: FieldConfig[]
  sections?: SectionConfig[]
  previewPath?: string
  /** Identity keys auto-assigned to newly added items (array tabs) — see SectionConfig.itemIds. */
  itemIds?: ('id' | 'uuid')[]
}

export interface PendingUpload {
  ghPath: string
  base64: string
  message: string
  tabKey?: string
  /** When the upload was queued — restores older than the draft TTL are discarded. */
  savedAt?: number
}

export interface GHUser {
  login: string
  avatar_url: string

  [key: string]: unknown
}
