import toast from 'react-hot-toast'

const darkTheme = {
  background: '#18181b',
  color: '#fafafa',
  border: '1px solid #27272a',
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const fn = type === 'error' ? toast.error : toast.success
  fn(message, {
    style: darkTheme,
    iconTheme: {
      primary: type === 'error' ? '#ef4444' : '#22c55e',
      secondary: '#18181b',
    },
  })
}
