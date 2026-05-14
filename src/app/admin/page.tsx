'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createServiceClient } from '@/lib/supabase'
import { formatStudyTime, formatDate, formatDateTime } from '@/lib/types'

interface DashStats {
  totalStudents: number
  activeStudents: number
  totalCourses: number
  totalEnrollments: number
  totalCodesCreated: number
  totalCodesUsed: number
  totalStudyHoursAll: number
  topStudents: { id: string; name: string; email: string; studySec: number; completedLessons: number; enrollments: number }[]
  topCourses: { id: string; name: string; providerName: string; enrollCount: number }[]
  subjectDist: { subjectName: string; icon: string; count: number }[]
  recentCodes: { code: string; usedByName: string; usedAt: string }[]
}

async function loadDashStats(): Promise<DashStats> {
  const res = await fetch('/api/admin/dashboard')
  if (!res.ok) throw new Error('Failed')
  const d = await res.json()
  return d.data
}

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent?: string }) {
  return (
    <div className="stat-card">
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 24, opacity: 0.3 }}>{icon}</div>
      <p className="stat-value" style={{ color: accent || 'var(--text-primary)' }}>{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  )
}

// ── Bar chart (horizontal) ────────────────────────────────────────────────
function BarChart({ data, max }: { data: { label: string; value: number; color?: string }[]; max: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${max ? (item.value / max * 100) : 0}%`, background: item.color || 'var(--accent)', borderRadius: 99, transition: 'width 0.7s ease', boxShadow: `0 0 6px ${item.color || 'var(--accent)'}66` }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashStats()
      .then(setStats)
      .catch(() => setError('Không thể tải dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div className="loading-ring" style={{ width: 40, height: 40 }} />
    </div>
  )

  if (error || !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <p style={{ color: 'var(--danger)' }}>{error || 'Không tải được dữ liệu'}</p>
    </div>
  )

  const codeUsePct = stats.totalCodesCreated ? Math.round(stats.totalCodesUsed / stats.totalCodesCreated * 100) : 0
  const topStudentStudy = stats.topStudents[0]?.studySec || 1

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Xin chào, {user?.name}! Tổng quan hệ thống học tập.
        </p>
      </div>

      {/* KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard value={stats.totalStudents} label="Tổng học viên" icon="👥" accent="var(--accent-light)" />
        <StatCard value={stats.activeStudents} label="Đang hoạt động" icon="🟢" accent="var(--success)" />
        <StatCard value={stats.totalCourses} label="Khóa học" icon="📚" />
        <StatCard value={stats.totalEnrollments} label="Lượt kích hoạt" icon="🔑" accent="var(--warning)" />
        <StatCard value={`${codeUsePct}%`} label={`Mã đã dùng (${stats.totalCodesUsed}/${stats.totalCodesCreated})`} icon="🎫" />
        <StatCard value={formatStudyTime(stats.totalStudyHoursAll)} label="Tổng giờ học" icon="⏱" accent="var(--info)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Top students by study hours */}
        <div className="glass" style={{ padding: 20, borderRadius: 'var(--r-xl)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🏆 Top học viên (giờ học)</h3>
          {stats.topStudents.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.topStudents.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 22, fontSize: 13, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.completedLessons} bài · {s.enrollments} khóa</p>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600, flexShrink: 0 }}>{formatStudyTime(s.studySec)}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Enrollment by subject */}
        <div className="glass" style={{ padding: 20, borderRadius: 'var(--r-xl)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 Phân bổ theo môn học</h3>
          {stats.subjectDist.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</p>
            : <BarChart
                data={stats.subjectDist.map(d => ({ label: `${d.icon} ${d.subjectName}`, value: d.count }))}
                max={Math.max(...stats.subjectDist.map(d => d.count), 1)}
              />
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Top courses */}
        <div className="glass" style={{ padding: 20, borderRadius: 'var(--r-xl)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📚 Khóa học phổ biến nhất</h3>
          {stats.topCourses.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.topCourses.map((c, i) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 22, fontSize: 13, color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      {c.providerName && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.providerName}</p>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, flexShrink: 0 }}>{c.enrollCount} HV</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Recent redeemed codes */}
        <div className="glass" style={{ padding: 20, borderRadius: 'var(--r-xl)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🎫 Mã kích hoạt gần đây</h3>
          {stats.recentCodes.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có mã nào được dùng</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recentCodes.map((rc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <code style={{ fontSize: 11, background: 'var(--bg-active)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{rc.code}</code>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.usedByName}</p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{rc.usedAt ? formatDate(rc.usedAt) : ''}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
