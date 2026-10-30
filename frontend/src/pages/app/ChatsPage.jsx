import { useState } from 'react'
import { Search, Send, LockKeyhole, MoreVertical } from 'lucide-react'

const people = [
  ['Sofia Lee', 'Can you review the latest brief?', '2m', 'SL'],
  ['Security ops', 'Key rotation is complete.', '18m', 'SO'],
  ['Marco Ruiz', 'Thanks, that works.', '1h', 'MR'],
  ['Design review', 'You were added to this group.', '3h', 'DR'],
]

export default function ChatsPage() {
  const [active, setActive] = useState(0)
  const [text, setText] = useState('')

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <section className="hidden w-80 shrink-0 border-r border-slate-800 bg-[#121b27] p-4 md:block">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Workspace</p>
            <h1 className="mt-1 font-semibold">Messages</h1>
          </div>
          <button className="rounded-lg bg-slate-800 p-2">
            <MoreVertical className="size-4" />
          </button>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm text-slate-500">
          <Search className="size-4" />
          <input placeholder="Search messages" className="w-full bg-transparent outline-none" />
        </div>
        <div className="mt-5 flex flex-col gap-1">
          {people.map(([name, preview, time, initials], i) => (
            <button
              onClick={() => setActive(i)}
              key={name}
              className={`flex items-center gap-3 rounded-xl p-3 text-left ${
                active === i ? 'bg-cyan-300/10' : 'hover:bg-slate-800'
              }`}
            >
              <div className="grid size-10 place-items-center rounded-full bg-slate-700 font-mono text-xs text-cyan-200">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <span className="font-mono text-[10px] text-slate-500">{time}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{preview}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-8">
          <div>
            <p className="font-semibold">{people[active][0]}</p>
            <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
              <LockKeyhole className="size-3" /> End-to-end encrypted
            </p>
          </div>
          <span className="size-2 rounded-full bg-emerald-400" />
        </header>
        <div className="flex flex-1 flex-col justify-end gap-5 p-5 sm:p-8">
          <div className="self-start rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3 text-sm text-slate-200">
            Can you review the latest brief?
          </div>
          <div className="self-end rounded-2xl rounded-br-sm bg-cyan-300 px-4 py-3 text-sm text-[#07111f]">
            On it. I'll send notes shortly.
          </div>
          <div className="self-start rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3 text-sm text-slate-200">
            Perfect, thank you.
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setText('')
          }}
          className="m-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2 sm:m-8"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write an encrypted message…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button aria-label="Send message" className="grid size-9 place-items-center rounded-lg bg-cyan-300 text-[#07111f]">
            <Send className="size-4" />
          </button>
        </form>
      </section>
    </div>
  )
}
