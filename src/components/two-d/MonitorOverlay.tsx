import { formatOblique, formatTilt } from '@/utils/format-view'

interface MonitorOverlayProps {
  raoLao: number
  cranialCaudal: number
}


export function MonitorOverlay({ raoLao, cranialCaudal }: MonitorOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-3 flex flex-col justify-end font-display tabular-nums">
      <div className="text-center text-white font-bold text-sm">
        {formatOblique(raoLao)} / {formatTilt(cranialCaudal)}
      </div>
    </div>
  )
}
