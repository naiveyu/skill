/**
 * Feedback SDK - Zero-dependency client for submitting user feedback.
 *
 * Usage:
 *   import { FeedbackSDK } from './feedback-sdk'
 *   const fb = new FeedbackSDK({ endpoint: 'https://feedback.example.com', productId: 'my-app' })
 *   await fb.submit({ type: 'bug', content: 'Something broke' })
 */

export interface FeedbackOptions {
  /** Feedback server URL (no trailing slash) */
  endpoint: string
  /** Your product identifier (e.g. 'ai-note') */
  productId: string
}

export interface FeedbackSubmission {
  type: 'bug' | 'suggestion' | 'other'
  content: string
  contact?: string
  metadata?: Record<string, unknown>
}

export interface FeedbackResult {
  id: number
  created_at: string
}

function collectDeviceInfo(): Record<string, string> {
  const info: Record<string, string> = {}

  // Browser environment
  if (typeof navigator !== 'undefined') {
    info.userAgent = navigator.userAgent
    info.language = navigator.language
    if (typeof screen !== 'undefined') {
      info.screen = `${screen.width}x${screen.height}`
    }
    info.platform = navigator.platform || ''
  }

  // Node.js environment
  if (typeof process !== 'undefined' && process.versions) {
    info.runtime = 'node'
    info.nodeVersion = process.version
    info.platform = process.platform
    info.arch = process.arch
  }

  return info
}

export class FeedbackSDK {
  private endpoint: string
  private productId: string

  constructor(options: FeedbackOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, '')
    this.productId = options.productId
  }

  async submit(feedback: FeedbackSubmission): Promise<FeedbackResult> {
    const response = await fetch(`${this.endpoint}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: this.productId,
        type: feedback.type,
        content: feedback.content,
        contact: feedback.contact,
        device_info: JSON.stringify(collectDeviceInfo()),
        metadata: feedback.metadata
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Feedback submission failed: ${(error as { error: string }).error}`)
    }

    return response.json() as Promise<FeedbackResult>
  }
}

export default FeedbackSDK
