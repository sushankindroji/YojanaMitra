import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { ArrowRight, FileText, Fingerprint, Search, UploadCloud } from 'lucide-react'
import authService from '../services/authService'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressRing from '../components/ui/ProgressRing'

const priorityActions = [
  {
    title: 'Upload documents',
    description: 'Add Aadhaar, income certificate, and supporting proof for better matching.',
    icon: UploadCloud,
    action: '/upload',
    tone: 'secondary',
  },
  {
    title: 'Complete profile',
    description: 'Fill demographics and occupation details for stronger recommendations.',
    icon: Fingerprint,
    action: '/profile',
    tone: 'primary',
  },
  {
    title: 'Check eligibility',
    description: 'Run AI-based checks against the latest scheme criteria.',
    icon: Search,
    action: '/eligibility',
    tone: 'primary',
  },
  {
    title: 'Track applications',
    description: 'View submitted applications and status changes in one timeline.',
    icon: FileText,
    action: '/applications',
    tone: 'ghost',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getCurrentUser()
        setUser(response.data)
      } catch (error) {
        console.error('Failed to fetch user:', error)
        toast.error('Failed to load user info')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">{t('common.loading')}</div>

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t('dashboard.welcomeBack', { defaultValue: 'Welcome back' })}, ${user?.name || user?.email || 'Citizen'}!`}
        description="Track your progress and complete priority tasks to unlock more schemes."
        actions={
          <Button onClick={() => navigate('/schemes')}>
            {t('dashboard.viewSchemes', { defaultValue: 'View Schemes' })}
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-gradient-to-br from-white via-orange-50 to-green-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Profile Completion</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900">45% complete</h2>
              <p className="mt-2 max-w-xl text-sm text-stone-600">
                Add family, income, and education details to improve eligibility confidence and recommendation quality.
              </p>
              <div className="mt-3 flex gap-2">
                <Badge variant="warning">Needs attention</Badge>
                <Badge variant="neutral">7 fields pending</Badge>
              </div>
            </div>

            <ProgressRing value={45} size={108} strokeWidth={10} label="Profile" />
          </div>
        </Card>

        <Card variant="elevated" className="bg-blue-950 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Scheme Insight</p>
          <h2 className="mt-1 text-3xl font-bold">24</h2>
          <p className="mt-2 text-sm text-blue-100">Schemes currently matching your profile snapshot.</p>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/eligibility')}>
            {t('dashboard.checkNow', { defaultValue: 'Run Eligibility Check' })}
          </Button>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {priorityActions.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="flex h-full flex-col">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="text-base font-semibold text-stone-900">{item.title}</h3>
              <p className="mt-1 flex-1 text-sm text-stone-600">{item.description}</p>

              <Button
                variant={item.tone}
                className="mt-4 w-full"
                onClick={() => navigate(item.action)}
              >
                Continue
              </Button>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
