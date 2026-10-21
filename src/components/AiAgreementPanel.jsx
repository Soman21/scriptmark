import { useState, useEffect } from 'react'
import { Download, Info, PenLine } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { downloadEvaluationCsv } from '../lib/download.js'
import TranscriptionCheckDialog from './TranscriptionCheckDialog.jsx'

const pct = (x) => (x == null ? 'N/A' : `${Math.round(x * 1000) / 10}%`)
const num = (x) => (x == null ? 'N/A' : x.toFixed(2))

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

// How closely the AI's suggested scores agree with the lecturer's confirmed
// ones. These are the Chapter 4 numbers; the CSV holds the raw pairs.
export default function AiAgreementPanel({ sessionId, sessionTitle }) {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [checking, setChecking] = useState(false)

  function load() {
    api.getEvaluation(sessionId, token).then(setData).catch((err) => setError(err.message))
  }
  useEffect(load, [sessionId])

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadEvaluationCsv(sessionId, sessionTitle, token)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  const o = data?.overall
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">AI Agreement</p>
          <p className="text-sm text-slate-500">How closely the AI's suggested scores match the scores lecturers confirmed</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !data?.answersScored}
          className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
        >
          <Download size={14} /> {downloading ? 'Preparing...' : 'Download data (CSV)'}
        </button>
      </div>

      <div className="space-y-5 p-5">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-400">Loading agreement...</p>}
        {data && !o?.n && (
          <p className="text-sm text-slate-500">
            No lecturer confirmed scores yet. Confirm some scores in Results and the agreement figures will appear here.
          </p>
        )}

        {o?.n > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Exact agreement" value={pct(o.exactAgreement)} />
              <Metric label="Within 1 mark" value={pct(o.withinOneMark)} />
              <Metric label="Mean absolute error" value={num(o.mae)} hint="marks" />
              <Metric label="RMSE" value={num(o.rmse)} hint="marks" />
              <Metric label="Pearson r" value={num(o.pearson)} />
              <Metric label="Quadratic kappa" value={num(o.quadraticKappa)} hint={`Cohen's kappa ${num(o.kappa)}`} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Pass or fail decision</p>
                <p className="mb-3 text-xs text-slate-500">Pass is half the question's marks or more, with the lecturer's score as the truth.</p>
                <div className="grid grid-cols-4 gap-3">
                  <Metric label="Accuracy" value={pct(data.passFail.accuracy)} />
                  <Metric label="Precision" value={num(data.passFail.precision)} />
                  <Metric label="Recall" value={num(data.passFail.recall)} />
                  <Metric label="F1" value={num(data.passFail.f1)} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">By AI confidence</p>
                <p className="mb-3 text-xs text-slate-500">If confidence is meaningful, errors should grow from high to low.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-1.5">Confidence</th>
                      <th className="py-1.5">Answers</th>
                      <th className="py-1.5">Exact</th>
                      <th className="py-1.5">MAE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['high', 'medium', 'low'].map((level) => {
                      const g = data.byConfidence[level]
                      return (
                        <tr key={level} className="border-t border-slate-100">
                          <td className="py-1.5 capitalize text-slate-700">{level}</td>
                          <td className="py-1.5 text-slate-500">{g.n}</td>
                          <td className="py-1.5 text-slate-700">{g.n ? pct(g.exactAgreement) : 'N/A'}</td>
                          <td className="py-1.5 text-slate-700">{g.n ? num(g.mae) : 'N/A'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {data.scripts.n > 0 && (
              <p className="text-sm text-slate-600">
                Across {data.scripts.n} fully lecturer confirmed script{data.scripts.n !== 1 ? 's' : ''}, totals differ by{' '}
                {data.scripts.maePercent} percentage points on average (r = {num(data.scripts.pearson)}), and{' '}
                {pct(data.scripts.sameGrade)} get the same letter grade.
              </p>
            )}
          </>
        )}

        {data && (
          <div className="border-t border-slate-100 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Transcription accuracy</p>
                <p className="text-xs text-slate-500">Word and character error rate of the text the AI marked.</p>
              </div>
              <button
                onClick={() => setChecking(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <PenLine size={14} /> Check transcriptions
              </button>
            </div>
            {data.transcription?.n > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="WER" value={pct(data.transcription.wer)} hint={`${data.transcription.words} words`} />
                <Metric label="CER" value={pct(data.transcription.cer)} />
                <Metric label="Answers checked" value={data.transcription.n} />
                <Metric
                  label="WER by method"
                  value={`${pct(data.transcription.standardOcr.wer)} / ${pct(data.transcription.visionReread.wer)}`}
                  hint="OCR / vision reread"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No answers checked yet.</p>
            )}
          </div>
        )}

        {data?.answersScored > 0 && (
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            Based on {data.humanConfirmed} lecturer confirmed answer{data.humanConfirmed !== 1 ? 's' : ''}.{' '}
            {data.autoAcceptedExcluded} auto accepted answer{data.autoAcceptedExcluded !== 1 ? 's are' : ' is'} left out,
            since their confirmed score is the AI's own. {data.overriddenAfterConfirm} score
            {data.overriddenAfterConfirm !== 1 ? 's were' : ' was'} changed again after confirmation.
          </p>
        )}
      </div>
      {checking && (
        <TranscriptionCheckDialog
          sessionId={sessionId}
          token={token}
          onClose={(saved) => {
            setChecking(false)
            if (saved) load()
          }}
        />
      )}
    </div>
  )
}
