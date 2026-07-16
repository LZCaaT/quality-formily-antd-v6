import { Spin } from 'antd'
import React from 'react'
import { createRoot } from 'react-dom/client'

export const loading = async (
  title: React.ReactNode = 'Loading...',
  processor: () => Promise<any>
) => {
  let hide = () => {}
  const loadingTimer = setTimeout(() => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    root.render(
      React.createElement(Spin, { description: title, fullscreen: true })
    )
    hide = () => {
      root.unmount()
      host.remove()
    }
  }, 100)
  try {
    return await processor()
  } finally {
    clearTimeout(loadingTimer)
    hide()
  }
}
