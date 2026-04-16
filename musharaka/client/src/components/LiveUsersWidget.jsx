import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function LiveUsersWidget({ totalUsers = 0 }) {
  const [onlineCount, setOnlineCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const channel = supabase.channel('urwah:admin-live', {
      config: { presence: { key: 'admin' } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setOnlineCount(count)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineCount(prev => prev + newPresences.length)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineCount(prev => Math.max(0, prev - leftPresences.length))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const offlineCount = Math.max(0, totalUsers - onlineCount)

  return (
    <div className="card-surface p-4 flex items-center gap-6 flex-wrap">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 font-arabic text-sm ml-auto">
        المستخدمون الآن
      </h3>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="text-green-600 dark:text-green-400 font-arabic text-sm font-bold">{onlineCount}</span>
        <span className="text-gray-500 dark:text-gray-400 font-arabic text-xs">متصل الآن</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="text-gray-600 dark:text-gray-400 font-arabic text-sm font-bold">{offlineCount}</span>
        <span className="text-gray-500 dark:text-gray-400 font-arabic text-xs">غير متصل</span>
      </div>
    </div>
  )
}
