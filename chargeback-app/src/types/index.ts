/**
 * Shared TypeScript types for the Chargeback App.
 *
 * FundingModel is stored as a plain String in SQLite (SQLite has no native enum).
 * This union type enforces the allowed values at the TypeScript layer.
 */

export type FundingModel = 'CORPORATE' | 'CHARGEBACK'

export const FUNDING_MODELS: FundingModel[] = ['CORPORATE', 'CHARGEBACK']

export const FUNDING_MODEL_LABELS: Record<FundingModel, string> = {
  CORPORATE:  'Corporate (DSI absorbs)',
  CHARGEBACK: 'Chargeback (charged to area)',
}
