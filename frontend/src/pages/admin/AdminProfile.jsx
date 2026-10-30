export default function AdminProfile() {
  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-700">Admin / Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your profile</h1>
      <div className="mt-8 max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-[#10233f] text-lg font-semibold text-cyan-300">
            AC
          </div>
          <div>
            <p className="font-semibold">Alex Carter</p>
            <p className="text-sm text-slate-500">Workspace administrator</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4">
          <label className="text-sm font-medium">
            Full name
            <input
              defaultValue="Alex Carter"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <label className="text-sm font-medium">
            Email
            <input
              defaultValue="alex@vaultcore.io"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
            />
          </label>
        </div>
        <button className="mt-6 rounded-lg bg-[#10233f] px-4 py-2.5 text-sm font-medium text-white">
          Save changes
        </button>
      </div>
    </div>
  )
}
