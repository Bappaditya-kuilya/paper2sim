import toast from 'react-hot-toast'

export function showError(message: string) {
  toast.error(message, {
    style: {
      background: '#18181b',
      color: '#fafafa',
      border: '1px solid #27272a',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#18181b',
    },
  })
}

export function ErrorToast() {
  return null
}
