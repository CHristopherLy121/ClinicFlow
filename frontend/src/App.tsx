import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { login, logout, register, requestPasswordReset, resendSignupVerification } from './lib/auth'
import { getLocalEmailPreviewUrl, supabase } from './lib/supabase'
import { LanguageProvider } from './lib/LanguageProvider'
import { translate } from './lib/i18n'
import { PatientProfilePanel } from './components/PatientProfilePanel'
import { AccountSecurityPanel } from './components/AccountSecurityPanel'
import { AccessibilitySettingsPanel } from './components/AccessibilitySettingsPanel'
import { ClinicExtrasPanel } from './components/ClinicExtrasPanel'
import { NotificationCenter } from './components/NotificationCenter'
import { StaffOperationsPanel } from './components/StaffOperationsPanel'
import { HelpCenter } from './components/HelpCenter'
import { PlatformAdminPanel } from './components/PlatformAdminPanel'
import { AppointmentBookingPanel } from './features/appointments/AppointmentBookingPanel'
import { ClinicFinder } from './features/clinics/ClinicFinder'
import type { Clinic } from './services/clinicService'
import { defaultAccessibilityPreferences, getAccessibilityPreferences, type AccessibilityPreferences } from './services/operationsService'
import './App.css'

const localEmailPreviewUrl = getLocalEmailPreviewUrl()

type AppSection = 'home' | 'calendar' | 'profile' | 'settings' | 'notifications' | 'help' | 'staff_access'

function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-icon"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-icon"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
}

function SectionIcon({ section }: { section: AppSection }) {
  const paths: Record<AppSection, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    calendar: 'M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    profile: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.2v3.6l-.2.1a1.7 1.7 0 0 0-1 1.6Z',
    notifications: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    help: 'M9.1 9a3 3 0 1 1 5.2 2c-1.1 1.1-2.3 1.4-2.3 3M12 17.5v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    staff_access: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" className="section-icon"><path d={paths[section]} /></svg>
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [hasPatientProfile, setHasPatientProfile] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [accessibilityPreferences, setAccessibilityPreferences] = useState<AccessibilityPreferences>(defaultAccessibilityPreferences)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [appointmentsRefreshToken, setAppointmentsRefreshToken] = useState(0)
  const [activeSection, setActiveSection] = useState<AppSection>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const t = (message: string) => translate(message, accessibilityPreferences.language)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (!session) {
          setIsPlatformAdmin(false)
          setHasPatientProfile(false)
          setAccessibilityPreferences(defaultAccessibilityPreferences)
          setActiveSection('home')
        }
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
          setActiveSection('profile')
          setShowAuth(false)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    let active = true
    void (async () => {
      try {
        const [profileResult, preferences] = await Promise.all([
          supabase.from('profiles').select('global_role').eq('id', userId).maybeSingle(),
          getAccessibilityPreferences(userId).catch(() => defaultAccessibilityPreferences),
        ])
        if (active) {
          setIsPlatformAdmin(profileResult.data?.global_role === 'platform_admin')
          setAccessibilityPreferences(preferences)
        }
      } catch {
        if (active) setIsPlatformAdmin(false)
      }
    })()
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let active = true
    let listener: { remove: () => Promise<void> } | undefined
    const handledUrls = new Set<string>()

    async function handleAuthCallback(url: string) {
      if (handledUrls.has(url)) return
      handledUrls.add(url)

      try {
        const callbackUrl = new URL(url)
        if (callbackUrl.protocol !== 'ca.uottawa.clinicflow:') return
        const callbackParams = new URLSearchParams(callbackUrl.hash.slice(1))
        const callbackError = callbackUrl.searchParams.get('error_description')
          ?? callbackParams.get('error_description')
        if (callbackError) throw new Error(callbackError)

        const code = callbackUrl.searchParams.get('code')
        const isRecovery = callbackUrl.searchParams.get('type') === 'recovery'
          || callbackParams.get('type') === 'recovery'
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          const accessToken = callbackParams.get('access_token')
          const refreshToken = callbackParams.get('refresh_token')
          if (!accessToken || !refreshToken) return
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        }
        setShowAuth(false)
        setAuthError('')
        setAuthMessage(isRecovery
          ? 'Recovery link accepted. Choose a new password below.'
          : 'Your account is verified and signed in.')
      } catch (callbackFailure) {
        if (active) setAuthError(callbackFailure instanceof Error
          ? callbackFailure.message
          : 'Could not complete the account verification or recovery link.')
      }
    }

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => void handleAuthCallback(url))
      .then((registeredListener) => {
        if (active) listener = registeredListener
        else void registeredListener.remove()
      })
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) return handleAuthCallback(launch.url)
    })

    return () => {
      active = false
      void listener?.remove()
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = accessibilityPreferences.language
  }, [accessibilityPreferences.language])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    setCanResendVerification(false)
    setVerificationEmail('')
    setIsSubmitting(true)

    try {
      if (authMode === 'reset') {
        await requestPasswordReset(email.trim())
        setAuthMessage(accessibilityPreferences.language === 'fr'
          ? `Si un compte existe pour ${email.trim()}, un lien de récupération a été envoyé.`
          : `If an account exists for ${email.trim()}, a password recovery link has been sent.`)
      } else if (authMode === 'login') {
        await login(email.trim(), password)
        setAuthMessage(t('You are signed in.'))
        setShowAuth(false)
      } else {
        const signupEmail = email.trim()
        const { user: createdUser, session } = await register(signupEmail, password)

        if (session) {
          setUser(createdUser)
          setAuthMessage(t('Your account is ready.'))
          setShowAuth(false)
        } else {
          setVerificationEmail(signupEmail)
          setCanResendVerification(true)
          setAuthMessage(accessibilityPreferences.language === 'fr'
            ? `Un lien de vérification a été envoyé à ${signupEmail}. Confirmez votre courriel avant de vous connecter.`
            : `A verification link was sent to ${signupEmail}. Confirm your email before logging in.`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete authentication.'
      setAuthError(t(message))
      if (authMode === 'login' && message.toLowerCase().includes('email not confirmed')) {
        setVerificationEmail(email.trim())
        setCanResendVerification(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendVerification() {
    if (!verificationEmail) return

    setAuthError('')
    setAuthMessage('')
    setIsResendingVerification(true)
    try {
      await resendSignupVerification(verificationEmail)
      setAuthMessage(accessibilityPreferences.language === 'fr'
        ? `Si ${verificationEmail} doit encore être vérifié, un nouveau lien a été envoyé.`
        : `If ${verificationEmail} still needs verification, a new link has been sent.`)
    } catch (error) {
      setAuthError(t(error instanceof Error ? error.message : 'Could not resend the verification email.'))
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handleLogout() {
    setAuthError('')
    setAuthMessage('')

    try {
      await logout()
      setAuthMessage(t('You are signed out.'))
    } catch (error) {
      setAuthError(t(error instanceof Error ? error.message : 'Could not sign out.'))
    }
  }

  function navigateTo(section: AppSection) {
    setActiveSection(section)
    setIsMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openLogin() {
    setAuthMode('login')
    setShowAuth(true)
    setAuthError('')
    setAuthMessage('')
    setIsMobileMenuOpen(false)
  }

  const sectionTitle: Record<AppSection, string> = {
    home: 'Appointment & clinic access',
    calendar: 'Calendar',
    profile: 'Your profile',
    settings: 'Accessibility settings',
    notifications: 'Notifications',
    help: 'Help and contact',
    staff_access: 'Staff access',
  }

  const [selectedClinicName, setSelectedClinicName] = useState('Downtown Clinic')
  const [selectedTime, setSelectedTime] = useState('11:15 AM')
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState(() => new Date(2025, 5, 11))
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2025, 5, 1))
  const [dateInputValue, setDateInputValue] = useState('2025-06-11')

  const formatDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const formatFullDateLabel = (date: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
  const formatMonthLabel = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
  const formatWeekdayShort = (date: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase()

  const dateFromValue = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return null

    const nextDate = new Date(year, month - 1, day)
    return Number.isNaN(nextDate.getTime()) ? null : nextDate
  }

  const jumpToDate = (nextDate: Date) => {
    setSelectedDate(nextDate)
    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    setDateInputValue(formatDateKey(nextDate))
  }

  const moveCalendarMonth = (direction: -1 | 1) => {
    const nextMonth = new Date(calendarMonth)
    nextMonth.setMonth(nextMonth.getMonth() + direction)
    setCalendarMonth(nextMonth)

    const updatedDate = new Date(selectedDate)
    updatedDate.setMonth(updatedDate.getMonth() + direction)
    setSelectedDate(updatedDate)
    setDateInputValue(formatDateKey(updatedDate))
  }

  const timeOptionsByDate: Record<string, { label: string; slots: Array<{ time: string; status: 'your' | 'available' | 'booked' | 'selected'; section: 'morning' | 'afternoon' }> }> = {
    '2025-06-11': {
      label: 'Wednesday, June 11',
      slots: [
        { time: '8:30 AM', status: 'your', section: 'morning' },
        { time: '9:00 AM', status: 'available', section: 'morning' },
        { time: '9:30 AM', status: 'available', section: 'morning' },
        { time: '10:15 AM', status: 'booked', section: 'morning' },
        { time: '10:45 AM', status: 'available', section: 'morning' },
        { time: '11:15 AM', status: 'selected', section: 'morning' },
        { time: '1:00 PM', status: 'available', section: 'afternoon' },
        { time: '1:45 PM', status: 'booked', section: 'afternoon' },
        { time: '2:15 PM', status: 'available', section: 'afternoon' },
        { time: '3:00 PM', status: 'available', section: 'afternoon' },
      ],
    },
    '2025-06-09': {
      label: 'Monday, June 9',
      slots: [
        { time: '8:00 AM', status: 'available', section: 'morning' },
        { time: '9:15 AM', status: 'booked', section: 'morning' },
        { time: '11:00 AM', status: 'available', section: 'morning' },
        { time: '1:15 PM', status: 'available', section: 'afternoon' },
        { time: '2:45 PM', status: 'booked', section: 'afternoon' },
      ],
    },
    '2025-06-10': {
      label: 'Tuesday, June 10',
      slots: [
        { time: '9:30 AM', status: 'available', section: 'morning' },
        { time: '10:30 AM', status: 'booked', section: 'morning' },
        { time: '12:00 PM', status: 'available', section: 'morning' },
        { time: '2:00 PM', status: 'available', section: 'afternoon' },
        { time: '3:15 PM', status: 'booked', section: 'afternoon' },
      ],
    },
    '2025-06-12': {
      label: 'Thursday, June 12',
      slots: [
        { time: '8:45 AM', status: 'available', section: 'morning' },
        { time: '10:00 AM', status: 'available', section: 'morning' },
        { time: '11:30 AM', status: 'booked', section: 'morning' },
        { time: '1:30 PM', status: 'available', section: 'afternoon' },
        { time: '2:30 PM', status: 'booked', section: 'afternoon' },
      ],
    },
    '2025-06-13': {
      label: 'Friday, June 13',
      slots: [
        { time: '9:00 AM', status: 'your', section: 'morning' },
        { time: '10:15 AM', status: 'available', section: 'morning' },
        { time: '12:15 PM', status: 'booked', section: 'morning' },
        { time: '1:45 PM', status: 'available', section: 'afternoon' },
        { time: '3:00 PM', status: 'available', section: 'afternoon' },
      ],
    },
  }

  const activeDateOptions = timeOptionsByDate[formatDateKey(selectedDate)] ?? {
    label: formatFullDateLabel(selectedDate),
    slots: [
      { time: '9:00 AM', status: 'available', section: 'morning' },
      { time: '10:30 AM', status: 'booked', section: 'morning' },
      { time: '1:00 PM', status: 'available', section: 'afternoon' },
      { time: '2:30 PM', status: 'available', section: 'afternoon' },
    ],
  }
  const selectedDayLabel = activeDateOptions.label

  const monthGridStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthGridStartOffset = (monthGridStart.getDay() + 6) % 7
  const monthGridStartDate = new Date(monthGridStart)
  monthGridStartDate.setDate(monthGridStart.getDate() - monthGridStartOffset)
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthGridStartDate)
    date.setDate(monthGridStartDate.getDate() + index)
    return date
  })

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const startOfWeek = new Date(selectedDate)
    const dayIndex = (startOfWeek.getDay() + 6) % 7
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex)
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + index)
    return date
  })

  const isCellSelected = (date: Date) => formatDateKey(date) === formatDateKey(selectedDate)
  const isDateInCurrentMonth = (date: Date) => date.getMonth() === calendarMonth.getMonth()

  return (
    <LanguageProvider language={accessibilityPreferences.language}>
    <div className={"app-shell text-size-" + accessibilityPreferences.text_size + (accessibilityPreferences.high_contrast ? " high-contrast" : "")}>
      <a className="skip-link" href="#main-content">{t('Skip to content')}</a>
      {isMobileMenuOpen && <button type="button" className="navigation-scrim" aria-label={t('Close navigation menu')} onClick={() => setIsMobileMenuOpen(false)} />}

      <div className="app-layout">
        <aside id="mobile-navigation" className={"side-rail" + (isMobileMenuOpen ? " is-open" : "")} aria-label={t('Application navigation')}>
          <div className="rail-brand">
            <span className="brand-mark" aria-hidden="true">C</span>
            <div><strong>ClinicFlow</strong><span>{t('Clinic appointments')}</span></div>
          </div>
          <nav className="rail-navigation" aria-label={t('Main navigation')}>
            <button type="button" className="rail-link" aria-current={activeSection === 'home' ? 'page' : undefined} onClick={() => navigateTo('home')}><SectionIcon section="home" />{t('Home')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'calendar' ? 'page' : undefined} onClick={() => navigateTo('calendar')}><SectionIcon section="calendar" />{t('Calendar')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'settings' ? 'page' : undefined} onClick={() => navigateTo('settings')}><SectionIcon section="settings" />{t('Settings')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'profile' ? 'page' : undefined} onClick={() => navigateTo('profile')}><SectionIcon section="profile" />{t('Profile')}</button>
            {isPlatformAdmin && <button type="button" className="rail-link" aria-current={activeSection === 'staff_access' ? 'page' : undefined} onClick={() => navigateTo('staff_access')}><SectionIcon section="staff_access" />{t('Staff access')}</button>}
          </nav>
          <div className="rail-footer">
            <button type="button" className="support-link" aria-current={activeSection === 'help' ? 'page' : undefined} onClick={() => navigateTo('help')}>
              <strong>{t('Support & contact')}</strong><span>{t('Booking help and clinic contact details.')}</span>
            </button>
            <span className="rail-prototype-label">{t('ClinicFlow prototype')}</span>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-heading"><p className="eyebrow">ClinicFlow</p><h1>{t(sectionTitle[activeSection])}</h1></div>
            <div className="topbar-actions">
              <button type="button" className="icon-button mobile-menu-trigger" aria-label={t(isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu')} aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMobileMenuOpen((open) => !open)}><MenuIcon /></button>
              <button type="button" className="icon-button notification-trigger" aria-label={t('Notifications') + ', ' + unreadNotificationCount + ' ' + (accessibilityPreferences.language === 'fr' ? 'non lues' : 'unread')} onClick={() => navigateTo('notifications')}>
                <BellIcon />{unreadNotificationCount > 0 && <span className="unread-badge">{unreadNotificationCount}</span>}
              </button>
              {user ? (
                <div className="account-actions"><span className="signed-in-label">{t('Signed in: ')}{user.email}</span><button type="button" className="primary-button" onClick={handleLogout}>{t('Log out')}</button></div>
              ) : (
                <button type="button" className="primary-button" onClick={() => showAuth ? setShowAuth(false) : openLogin()} aria-expanded={showAuth} aria-controls="auth-panel">{t(showAuth ? 'Close' : 'Log in')}</button>
              )}
            </div>
          </header>

          <main id="main-content" className="main-content">
      {showAuth && !user && (
        <section className="panel auth-panel" id="auth-panel" aria-labelledby="auth-title">
          <div className="panel-header">
          <h3 id="auth-title">
            {t(authMode === 'login' ? 'Log in' : authMode === 'signup' ? 'Create an account' : 'Recover your password')}
          </h3>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              {t('Email')}
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {authMode !== 'reset' && (
              <label>
                {t('Password')}
                <input
                  type="password"
                  name="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={authMode === 'signup' ? 12 : undefined}
                  required
                />
                {authMode === 'signup' && (
                  <span className="input-hint">{t('Use at least 12 characters.')}</span>
                )}
              </label>
            )}

            {authMode === 'login' && (
              <button
                type="button"
                className="text-button auth-reset-link"
                onClick={() => {
                  setAuthMode('reset')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                {t('Forgot password?')}
              </button>
            )}

            {authError && <p className="auth-error" role="alert">{t(authError)}</p>}
            {authMessage && <p className="auth-message" role="status">{t(authMessage)}</p>}

            {canResendVerification && (
              <div className="verification-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {t(isResendingVerification ? 'Sending' : 'Resend verification email')}
                </button>
                {localEmailPreviewUrl && (
                  <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                    {t('Open local email inbox')}
                  </a>
                )}
              </div>
            )}

            {authMode === 'reset' && localEmailPreviewUrl && (
              <div className="verification-actions">
                <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                  {t('Open local email inbox')}
                </a>
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting
                ? t('Please wait')
                : authMode === 'login'
                  ? t('Log in')
                  : authMode === 'signup'
                    ? t('Create account')
                    : t('Send recovery link')}
            </button>
          </form>

          <p className="auth-mode-switch">
            {authMode === 'reset' ? (
              <>
                {t('Remember your password?')}{' '}
                <button type="button" className="text-button" onClick={() => setAuthMode('login')}>
                  {t('Return to log in')}
                </button>
              </>
            ) : (
              <>
                {t(authMode === 'login' ? 'New to ClinicFlow?' : 'Already have an account?')}{' '}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthMode((mode) => mode === 'login' ? 'signup' : 'login')
                    setAuthError('')
                    setAuthMessage('')
                    setCanResendVerification(false)
                    setVerificationEmail('')
                  }}
                >
                  {t(authMode === 'login' ? 'Create an account' : 'Log in')}
                </button>
              </>
            )}
          </p>
        </section>
      )}

            {authMessage && !showAuth && <p className="auth-message" role="status">{t(authMessage)}</p>}
            {authError && !showAuth && <p className="auth-error" role="alert">{t(authError)}</p>}

            {activeSection === 'home' && (
              <>
                <section className="hero-panel">
                  <div><p className="eyebrow">{t('Patient appointment flow')}</p><h2>{t('Find a clinic and book an appointment')}</h2><p className="hero-description">{t('Search local clinics, compare availability, and manage upcoming bookings.')}</p></div>
                  <span className="status-pill">{t('Current prototype')}</span>
                </section>
                <div className="content-grid" id="clinic-search">
                  <ClinicFinder selectedClinicId={selectedClinic?.id ?? null} onSelectClinic={setSelectedClinic} />
                  <AppointmentBookingPanel
                    key={(user?.id ?? 'guest') + ':' + (selectedClinic?.id ?? 'no-clinic')}
                    clinic={selectedClinic} userId={user?.id ?? null} hasPatientProfile={hasPatientProfile}
                    textToSpeech={accessibilityPreferences.text_to_speech} language={accessibilityPreferences.language}
                    refreshToken={appointmentsRefreshToken}
                    onLoginRequest={openLogin}
                    onOpenProfile={() => navigateTo('profile')}
                  />
                </div>
                {user && (
                  <div className="home-secondary-grid">
                    <ClinicExtrasPanel
                      key={user.id + ':' + (selectedClinic?.id ?? 'no-clinic')}
                      clinic={selectedClinic} userId={user.id} hasPatientProfile={hasPatientProfile}
                      onWaitlistAccepted={() => setAppointmentsRefreshToken((token) => token + 1)}
                    />
                    <StaffOperationsPanel key={user.id} userId={user.id} />
                  </div>
                )}
              </>
            )}

            {activeSection === 'calendar' && (
              <section className="calendar-page" aria-label="Clinic calendar page">
                <div className="calendar-main-panel">
                  <div className="calendar-month-header">
                    <div className="calendar-month-title-wrap">
                      <h2>{calendarView === 'day' ? formatFullDateLabel(selectedDate) : formatMonthLabel(calendarMonth)}</h2>
                      <div className="calendar-nav-buttons" aria-label="Navigate calendar">
                        <button type="button" className="calendar-circle-button" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}>←</button>
                        <button type="button" className="calendar-circle-button" aria-label="Next month" onClick={() => moveCalendarMonth(1)}>→</button>
                      </div>
                    </div>

                    <div className="calendar-toolbar-right">
                      <label className="calendar-date-input-wrap" htmlFor="calendar-date-input">
                        <span className="sr-only">Pick a date</span>
                        <input
                          id="calendar-date-input"
                          type="date"
                          value={dateInputValue}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setDateInputValue(nextValue)
                            const parsed = dateFromValue(nextValue)
                            if (parsed) {
                              jumpToDate(parsed)
                            }
                          }}
                        />
                      </label>
                      <button type="button" className="calendar-today-button" onClick={() => jumpToDate(new Date(2025, 5, 11))}>Today</button>
                    </div>

                    <div className="calendar-legend" aria-label="Calendar legend">
                      <span className="calendar-legend-item"><i className="calendar-swatch calendar-swatch-green"></i>Yours</span>
                      <span className="calendar-legend-item"><i className="calendar-swatch calendar-swatch-muted"></i>Booked</span>
                      <div className="calendar-segmented" role="group" aria-label="Calendar view selector">
                        {(['month', 'week', 'day'] as const).map((view) => (
                          <button
                            key={view}
                            type="button"
                            className={calendarView === view ? 'on' : ''}
                            onClick={() => setCalendarView(view)}
                          >
                            {view.charAt(0).toUpperCase() + view.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {calendarView === 'month' && (
                    <>
                      <div className="calendar-weekdays" aria-hidden="true">
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <div key={day}>{day}</div>)}
                      </div>

                      <div className="calendar-grid" role="grid" aria-label={`${formatMonthLabel(calendarMonth)} calendar`}>
                        {monthDays.map((date) => {
                          const key = formatDateKey(date)
                          const badgeForDate = timeOptionsByDate[key]
                          const isSelected = isCellSelected(date)

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => jumpToDate(date)}
                              className={['calendar-cell', isDateInCurrentMonth(date) ? '' : 'is-outside', isSelected ? 'is-selected' : ''].join(' ').trim()}
                              aria-pressed={isSelected}
                            >
                              <span className="calendar-cell-number">{date.getDate()}</span>
                              {badgeForDate?.slots.some((slot) => slot.status === 'your' || slot.status === 'selected') && (
                                <span className="calendar-badge is-primary">{badgeForDate.slots.find((slot) => slot.status === 'your' || slot.status === 'selected')?.time ?? 'Booked'}</span>
                              )}
                              {badgeForDate?.slots.some((slot) => slot.status === 'booked') && (
                                <span className="calendar-badge is-muted">{badgeForDate.slots.find((slot) => slot.status === 'booked')?.time ?? 'Booked'}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {calendarView === 'week' && (
                    <div className="calendar-week-grid" role="grid" aria-label={`Week view for ${formatFullDateLabel(selectedDate)}`}>
                      {weekDates.map((date) => {
                        const key = formatDateKey(date)
                        const slotSummary = timeOptionsByDate[key]?.slots ?? [
                          { time: '9:00 AM', status: 'available' as const },
                          { time: '1:30 PM', status: 'booked' as const },
                        ]
                        const isSelected = isCellSelected(date)

                        return (
                          <button
                            key={key}
                            type="button"
                            className={['calendar-week-day', isSelected ? 'is-selected' : ''].join(' ')}
                            onClick={() => jumpToDate(date)}
                          >
                            <span className="calendar-week-day-header">
                              <span>{formatWeekdayShort(date)}</span>
                              <strong>{date.getDate()}</strong>
                            </span>
                            <span className="calendar-week-slot-list">
                              {slotSummary.slice(0, 2).map((slot) => (
                                <span key={`${key}-${slot.time}`} className={slot.status === 'booked' ? 'calendar-mini-badge is-muted' : 'calendar-mini-badge is-primary'}>{slot.time}</span>
                              ))}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {calendarView === 'day' && (
                    <div className="calendar-day-view" aria-label={`Day view for ${selectedDayLabel}`}>
                      <div className="calendar-day-header">
                        <span>{formatWeekdayShort(selectedDate)}</span>
                        <strong>{selectedDate.getDate()}</strong>
                      </div>

                      <div className="calendar-day-slot-list">
                        {activeDateOptions.slots.map((slot) => {
                          const slotKey = `${selectedDayLabel}-${slot.time}`
                          if (slot.status === 'booked') {
                            return <div key={slotKey} className="calendar-day-slot is-booked"><span>{slot.time}</span><span>Booked</span></div>
                          }

                          if (slot.status === 'your') {
                            return <div key={slotKey} className="calendar-day-slot is-your"><span>{slot.time}</span><span>Your appointment</span></div>
                          }

                          return (
                            <button key={slotKey} type="button" className={['calendar-day-slot', 'is-available', selectedTime === slot.time ? 'is-selected' : ''].join(' ')} onClick={() => setSelectedTime(slot.time)}>
                              <span>{slot.time}</span>
                              <span>{selectedTime === slot.time ? 'Selected' : 'Available'}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="time-picker-panel" aria-label="Pick a time">
                  <button type="button" className="time-picker-back" aria-label="Back to my appointments">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                    My appointments
                  </button>

                  <div className="time-picker-header-block">
                    <h2>{selectedDayLabel}</h2>
                    <div className="time-picker-subtitle">Choose an available time</div>
                  </div>

                  <div className="time-picker-clinic-block">
                    <label htmlFor="calendar-clinic-select">Clinic</label>
                    <select id="calendar-clinic-select" value={selectedClinicName} onChange={(event) => setSelectedClinicName(event.target.value)}>
                      <option>Downtown Clinic</option>
                      <option>Northside Clinic</option>
                      <option>Community Care</option>
                    </select>
                  </div>

                  <div className="time-picker-body">
                    {(['morning', 'afternoon'] as const).map((section) => (
                      <div key={section} className="time-picker-section">
                        <h3 className="time-picker-heading">{section === 'morning' ? 'Morning' : 'Afternoon'}</h3>
                        <div className="time-picker-list">
                          {activeDateOptions.slots.filter((slot) => slot.section === section).map((slot) => {
                            const isSelected = selectedTime === slot.time && slot.status !== 'booked' && slot.status !== 'your'
                            if (slot.status === 'booked') {
                              return <div key={slot.time} className="time-picker-row is-booked"><span>{slot.time}</span><span>Booked</span></div>
                            }

                            if (slot.status === 'your') {
                              return <div key={slot.time} className="time-picker-row is-your"><span>{slot.time}</span><span>Your appointment</span></div>
                            }

                            return (
                              <button
                                key={slot.time}
                                type="button"
                                className={['time-picker-row', 'is-available', isSelected ? 'is-selected' : ''].join(' ')}
                                aria-pressed={isSelected}
                                onClick={() => setSelectedTime(slot.time)}
                              >
                                <span>{slot.time}</span>
                                <span>{isSelected ? 'Selected' : 'Available'}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="time-picker-footer">
                    <button type="button" className="time-picker-book-button">
                      Book {selectedTime} at {selectedClinicName}
                    </button>
                    <p>Booked times are unavailable. No details are shown.</p>
                  </div>
                </aside>
              </section>
            )}

            {user && (
              <div className="settings-page-grid" hidden={activeSection !== 'profile'}>
                <PatientProfilePanel key={user.id} userId={user.id} onProfileReady={setHasPatientProfile} />
                {user.email && <AccountSecurityPanel key={user.id} email={user.email} recoveryMode={isPasswordRecovery} onRecoveryComplete={() => setIsPasswordRecovery(false)} />}
              </div>
            )}
            {activeSection === 'profile' && !user && (
              <section className="panel access-prompt"><h2>{t('Sign in to manage your profile')}</h2><p className="section-description">{t('Your booking profile and password controls are available after you log in.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
            )}

            {activeSection === 'settings' && (
              user ? (
                <section className="settings-page-grid" id="accessibility-panel">
                  <AccessibilitySettingsPanel key={user.id} userId={user.id} onPreferencesChange={setAccessibilityPreferences} />
                  <div className="panel settings-guidance"><h3>{t('Using ClinicFlow')}</h3><p className="section-description">{t('Your text size, contrast, speech, and language preferences apply across the app.')}</p><button type="button" className="text-button" onClick={() => navigateTo('home')}>{t('Return to clinic search')}</button></div>
                </section>
              ) : (
                <section className="panel access-prompt"><h2>{t('Sign in to save your settings')}</h2><p className="section-description">{t('Accessibility preferences are saved to your account.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
              )
            )}

            {activeSection === 'help' && (
              <HelpCenter
                onFindClinic={() => navigateTo('home')}
                onOpenProfile={() => navigateTo('profile')}
              />
            )}

            {activeSection === 'staff_access' && isPlatformAdmin && <PlatformAdminPanel />}

            {activeSection === 'notifications' && !user && (
              <section className="panel access-prompt"><h2>{t('Sign in to view notifications')}</h2><p className="section-description">{t('Appointment and clinic updates are linked to your account.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
            )}
            {user && <div className="notification-page" hidden={activeSection !== 'notifications'}><NotificationCenter key={user.id} onUnreadCountChange={setUnreadNotificationCount} /></div>}
          </main>
        </div>
      </div>

      <nav className="mobile-bottom-navigation" aria-label="Main navigation">
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'home' ? 'page' : undefined} onClick={() => navigateTo('home')}><SectionIcon section="home" />{t('Home')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'calendar' ? 'page' : undefined} onClick={() => navigateTo('calendar')}><SectionIcon section="calendar" />{t('Calendar')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'profile' ? 'page' : undefined} onClick={() => navigateTo('profile')}><SectionIcon section="profile" />{t('Profile')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'settings' ? 'page' : undefined} onClick={() => navigateTo('settings')}><SectionIcon section="settings" />{t('Settings')}</button>
      </nav>
    </div>
    </LanguageProvider>
  )
}

export default App
