export default function AppProfile() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Workspace / Profile</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your profile</h1>
      <div className="mt-8 max-w-xl rounded-xl border border-slate-800 bg-[#121b27] p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-cyan-900 text-lg font-semibold text-cyan-200">
            JM
          </div>
          <div>
            <p className="font-semibold">Jordan Miller</p>
            <p className="text-sm text-slate-400">Member · Northstar workspace</p>
          </div>
        </div>
        <p className="mt-8 rounded-lg bg-slate-900 p-4 text-sm text-slate-400">
          Your identity keys are stored locally in the secure enclave. Profile changes are synced after verification.
        </p>
      </div>
    </div>
  )
}
