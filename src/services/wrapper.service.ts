import type { WrapperPosition, WrapParams, UnwrapResult } from '@/utils/wrapper.utils'

/** Base API URL for wrapper-related endpoints */
const WRAPPER_API_BASE = '/api/wrapper'

/** Fetch wrapper position data for a given key */
export async function fetchWrapperPosition(keyId: string): Promise<WrapperPosition> {
  const response = await fetch(`${WRAPPER_API_BASE}/position?keyId=${keyId}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch wrapper position')
  }
  
  return response.json()
}

/** Wrap keys into shares */
export async function wrapKeys(params: WrapParams): Promise<{ success: boolean; sharesMinted: number }> {
  const response = await fetch(`${WRAPPER_API_BASE}/wrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to wrap keys')
  }
  
  return response.json()
}

/** Unwrap shares back into keys */
export async function unwrapShares(keyId: string, shareCount: number): Promise<UnwrapResult> {
  const response = await fetch(`${WRAPPER_API_BASE}/unwrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keyId, shareCount }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to unwrap shares')
  }
  
  return response.json()
}