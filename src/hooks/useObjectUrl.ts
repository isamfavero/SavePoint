import { useEffect, useState } from 'react'

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }

    const endereco = URL.createObjectURL(blob)
    setUrl(endereco)

    return () => URL.revokeObjectURL(endereco)
  }, [blob])

  return url
}
