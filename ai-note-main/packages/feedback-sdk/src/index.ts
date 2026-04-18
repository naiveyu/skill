/**
 * @AInote/feedback-sdk — Zero-dependency feedback client.
 *
 * Works in browsers, Node.js, Electron, and React Native.
 *
 * Usage:
 *   import { FeedbackSDK } from '@AInote/feedback-sdk'
 *   const fb = new FeedbackSDK({ endpoint: 'https://example.com', productId: 'my-app' })
 *   await fb.submit({ type: 'bug', content: 'Something broke' })
 */

export interface FeedbackOptions {
  /** Feedback server URL (no trailing slash) */
  endpoint: string
  /** Product identifier (e.g. 'ai-note') */
  productId: string
  /** Optional: additional headers sent with every request */
  headers?: Record<string, string>
}

export interface FeedbackSubmission {
  type: 'bug' | 'suggestion' | 'feature' | 'other'
  content: string
  /** Optional title / summary */
  title?: string
  /** Contact info (email, wechat, etc.) */
  contact?: string
  /** Image data URLs or URLs */
  images?: string[]
  /** Arbitrary key-value metadata */
  metadata?: Record<string, unknown>
}

export interface FeedbackResult {
  success: boolean
  id: string | number
  created_at?: string
}

function collectDeviceInfo(): Record<string, string> {
  const info: Record<string, string> = {}

  // Browser / Electron renderer
  if (typeof navigator !== 'undefined') {
    info.userAgent = navigator.userAgent
    info.language = navigator.language
    if (typeof screen !== 'undefined') {
      info.screen = `${screen.width}x${screen.height}`
    }
    info.platform = navigator.platform || ''
  }

  // Node.js / Electron main
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
  private headers: Record<string, string>

  constructor(options: FeedbackOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, '')
    this.productId = options.productId
    this.headers = options.headers ?? {}
  }

  /**
   * Submit feedback to the server.
   * Automatically collects device info.
   */
  async submit(feedback: FeedbackSubmission): Promise<FeedbackResult> {
    const response = await fetch(`${this.endpoint}/api/feedback/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        product_id: this.productId,
        type: feedback.type,
        title: feedback.title,
        content: feedback.content,
        description: feedback.content,
        contact: feedback.contact,
        images: feedback.images,
        device_info: JSON.stringify(collectDeviceInfo()),
        metadata: feedback.metadata,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, string>
      throw new Error(error.message || error.error || `HTTP ${response.status}`)
    }

    return response.json() as Promise<FeedbackResult>
  }
}

export default FeedbackSDK
