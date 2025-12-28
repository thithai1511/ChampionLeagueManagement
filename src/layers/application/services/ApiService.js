import APP_CONFIG from '../../../config/app.config'
import logger from '../../../shared/utils/logger'

class ApiService {
  constructor() {
    this.baseURL = APP_CONFIG.API.BASE_URL
    this.timeout = APP_CONFIG.API.TIMEOUT
    this.retryAttempts = APP_CONFIG.API.RETRY_ATTEMPTS
  }

  // =========================
  // Generic HTTP request
  // =========================
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    let lastError = null

    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const token = localStorage.getItem('auth_token')
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers
        }
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        // Add timeout wrapper
        const controller = new AbortController()
        const timeout = options.timeout || this.timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          let errorMessage = response.statusText
          try {
            const errJson = await response.json()
            errorMessage = errJson.error || errJson.message || errorMessage
          } catch (_) { }

          const error = {
            status: response.status,
            message: errorMessage,
            retryable: response.status >= 500
          }

          // Global error handling
          if (response.status === 401) {
            // Auto logout and redirect for unauthorized
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { error } }))
            }
            throw { ...error, message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' }
          }

          if (response.status === 403) {
            throw { ...error, message: 'Bạn không có quyền truy cập tài nguyên này.' }
          }

          // Retry on server errors (5xx)
          if (response.status >= 500 && attempt < this.retryAttempts) {
            logger.warn(`API request failed with ${response.status} (attempt ${attempt}/${this.retryAttempts}), retrying...`)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
            continue
          }

          // Dispatch global error event for monitoring
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('api:error', {
              detail: { error, endpoint, attempt }
            }))
          }

          throw error
        }

        // Success - return data
        if (response.status === 204 || response.status === 205) {
          return null
        }

        const responseText = await response.text()
        if (!responseText) return null

        try {
          const parsed = JSON.parse(responseText)
          if (Array.isArray(parsed)) {
            return { data: parsed }
          }
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed.data !== undefined ? parsed : { data: parsed }
          }
          return { data: parsed }


        }
        catch {
          return responseText
        }

      } catch (error) {
        lastError = error

        // Don't retry on abort (timeout) or client errors (4xx)
        if (error.name === 'AbortError') {
          throw {
            status: 408,
            message: 'Request timeout',
            retryable: false
          }
        }

        if (error.status && error.status >= 400 && error.status < 500) {
          throw error
        }

        // Retry on network errors or server errors
        if (attempt < this.retryAttempts) {
          logger.warn(`API request failed (attempt ${attempt}/${this.retryAttempts}), retrying...`, error)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
      }
    }

    logger.error('API Request failed after all retries:', lastError)
    throw lastError
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url, { method: 'GET' })
  }

  async post(endpoint, data = {}, options = {}) {
    const requestOptions = {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    };
    // If custom timeout is provided, use it
    if (options.timeout) {
      requestOptions.timeout = options.timeout;
    }
    return this.request(endpoint, requestOptions)
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint, params = undefined) {
    const queryString =
      params && typeof params === 'object' ? new URLSearchParams(params).toString() : ''
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url, { method: 'DELETE' })
  }

  // =========================
  // FILE UPLOAD — FIX CHÍNH
  // =========================
  // File upload method (FIXED – DO NOT SKIP)
  async upload(endpoint, file, additionalData = {}, options = {}) {
    const method = options.method || 'POST'
    const fileField = options.fileField || 'file'
    const formData = new FormData()
    if (file) {
      formData.append(fileField, file)
    }

    Object.keys(additionalData).forEach(key => {
      if (additionalData[key] !== undefined && additionalData[key] !== null) {
        formData.append(key, additionalData[key])
      }
    })

    const token = localStorage.getItem('auth_token')
    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers,
      body: formData
    })

    // 🔥 QUAN TRỌNG: đọc body TRƯỚC
    const responseText = await response.text()
    let data = null

    try {
      data = responseText ? JSON.parse(responseText) : null
    } catch {
      data = responseText
    }

    // ❌ nếu backend trả lỗi
    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`

      const error = new Error(errorMessage)
      error.status = response.status
      error.payload = data
      throw error
    }

    return data
  }


  // =========================
  // Retry
  // =========================
  async requestWithRetry(endpoint, options = {}, attempts = 0) {
    try {
      return await this.request(endpoint, options)
    } catch (error) {
      if (attempts < this.retryAttempts) {
        console.log(`Retrying request (${attempts + 1}/${this.retryAttempts})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)))
        return this.requestWithRetry(endpoint, options, attempts + 1)
      }
      throw error
    }
  }
}

export default new ApiService()

